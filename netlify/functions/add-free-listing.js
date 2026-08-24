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

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Supabase not configured on the server.' }) };
    }

    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

    const { handle, platform, tagline, avatarUrl } = JSON.parse(event.body || '{}');

    if (!handle || !platform) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing handle or platform' }) };
    }

    if (isBlocked(handle) || isBlocked(tagline)) {
      return { statusCode: 400, body: JSON.stringify({ error: "That handle or link isn't allowed." }) };
    }

    // Look up any existing row so a repeat free listing doesn't wipe real click count
    const { data: existing } = await supabase
      .from('bids')
      .select('clicks')
      .eq('handle', handle)
      .eq('platform', platform)
      .maybeSingle();

    const { error } = await supabase
      .from('bids')
      .upsert(
        {
          handle,
          platform,
          tagline: tagline || '',
          bid: 0, // 0 = free listing, kept out of the ranked/paid board
          clicks: existing ? existing.clicks : 0,
          ts: Date.now(),
          avatar_url: avatarUrl || null,
        },
        { onConflict: 'handle,platform' }
      );

    if (error) {
      return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
