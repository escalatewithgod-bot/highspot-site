const BLOCKED_TERMS = ['pornhub','xvideos','xnxx','xhamster','youporn','redtube','brazzers','onlyfans','chaturbate','stripchat','spankbang','tube8','camsoda','myfreecams','livejasmin','xxx','porn','nsfw'];
function isBlocked(text) {
  const lower = (text || '').toLowerCase();
  return BLOCKED_TERMS.some(term => lower.includes(term));
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method not allowed' };
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'STRIPE_SECRET_KEY is not set on the server.' }),
      };
    }

    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

    const { handle, platform, tagline, bid, avatarUrl } = JSON.parse(event.body || '{}');

    if (!handle || !bid || bid < 1) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing handle or bid' }) };
    }

    if (isBlocked(handle) || isBlocked(tagline)) {
      return { statusCode: 400, body: JSON.stringify({ error: "That handle or link isn't allowed." }) };
    }

    const siteUrl = process.env.URL || 'http://localhost:8888';

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: `Board spot — ${handle}` },
            unit_amount: Math.round(bid * 100), // cents
          },
          quantity: 1,
        },
      ],
      // Stash the bid details on the session so the webhook can write them
      // to the database only *after* payment actually succeeds.
      metadata: { handle, platform, tagline: tagline || '', bid: String(bid), avatarUrl: avatarUrl || '' },
      success_url: `${siteUrl}/?paid=1`,
      cancel_url: `${siteUrl}/?canceled=1`,
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: session.url }),
    };
  } catch (err) {
    console.error('create-checkout failed:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message || 'Something went wrong starting checkout.' }),
    };
  }
};
