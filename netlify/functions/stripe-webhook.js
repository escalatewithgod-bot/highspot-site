const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

exports.handler = async (event) => {
  const sig = event.headers['stripe-signature'];
  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return { statusCode: 400, body: `Webhook signature verification failed: ${err.message}` };
  }

  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object;
    const { handle, platform, tagline, bid, avatarUrl } = session.metadata;

    // Upsert: same handle+platform updates their existing spot instead of duplicating it
    const { error } = await supabase
      .from('bids')
      .upsert(
        {
          handle,
          platform,
          tagline,
          bid: Number(bid),
          clicks: 0,
          ts: Date.now(),
          avatar_url: avatarUrl || null,
        },
        { onConflict: 'handle,platform' }
      );

    if (error) {
      console.error('Supabase write failed:', error.message);
      return { statusCode: 500, body: 'DB write failed' };
    }
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
