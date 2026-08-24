const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  try {
    const { imageBase64 } = JSON.parse(event.body || '{}');
    if (!imageBase64) {
      return { statusCode: 400, body: JSON.stringify({ error: 'No image provided' }) };
    }

    // imageBase64 comes in as "data:image/jpeg;base64,....." — strip the prefix
    const match = imageBase64.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!match) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid image format' }) };
    }
    const contentType = match[1];
    const buffer = Buffer.from(match[2], 'base64');

    // Cap size server-side too (client already downscales, this is a safety net)
    if (buffer.length > 2 * 1024 * 1024) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Image too large' }) };
    }

    const ext = contentType.split('/')[1] || 'jpg';
    const filename = `avatar-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filename, buffer, { contentType, upsert: false });

    if (uploadError) {
      return { statusCode: 500, body: JSON.stringify({ error: uploadError.message }) };
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(filename);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: data.publicUrl }),
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
