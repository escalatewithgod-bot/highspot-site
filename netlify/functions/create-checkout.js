const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const { handle, platform, tagline, bid } = JSON.parse(event.body || '{}');

  if (!handle || !bid || bid < 1) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing handle or bid' }) };
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
          unit_amount: Math.round(bid * 100),
        },
        quantity: 1,
      },
    ],
    metadata: { handle, platform, tagline: tagline || '', bid: String(bid) },
    success_url: `${siteUrl}/?paid=1`,
    cancel_url: `${siteUrl}/?canceled=1`,
  });

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: session.url }),
  };
};
