const express = require('express');
const router = express.Router();
const axios = require('axios');

// 🔐 ALL credentials MUST come from environment variables
const KROGER_CLIENT_ID = process.env.KROGER_CLIENT_ID;
const KROGER_CLIENT_SECRET = process.env.KROGER_CLIENT_SECRET;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const KROGER_TOKEN_URL = 'https://api.kroger.com/v1/connect/oauth2/token';

// Helper to check required env vars
function requireEnvVar(name, res) {
  if (!process.env[name]) {
    console.error(`Missing required environment variable: ${name}`);
    if (res) {
      res.status(500).json({ error: `Server configuration error: missing ${name}` });
    }
    return false;
  }
  return true;
}

// Exchange auth code for tokens
router.post('/token', async (req, res) => {
  // Validate env vars before proceeding
  if (!requireEnvVar('KROGER_CLIENT_ID', res) || !requireEnvVar('KROGER_CLIENT_SECRET', res)) return;

  try {
    const { code, redirect_uri } = req.body;
    const auth = Buffer.from(`${KROGER_CLIENT_ID}:${KROGER_CLIENT_SECRET}`).toString('base64');

    const tokenRes = await axios.post(KROGER_TOKEN_URL, new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri
    }).toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${auth}`
      }
    });

    res.json(tokenRes.data);
  } catch (e) {
    const detail = e.response?.data || e.message;
    console.error('Token exchange error:', detail);
    res.status(400).json({ error: 'Token exchange failed', detail });
  }
});

// Refresh token
router.post('/refresh', async (req, res) => {
  if (!requireEnvVar('KROGER_CLIENT_ID', res) || !requireEnvVar('KROGER_CLIENT_SECRET', res)) return;

  try {
    const { refresh_token } = req.body;
    const auth = Buffer.from(`${KROGER_CLIENT_ID}:${KROGER_CLIENT_SECRET}`).toString('base64');

    const tokenRes = await axios.post(KROGER_TOKEN_URL, new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token
    }).toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${auth}`
      }
    });

    res.json(tokenRes.data);
  } catch (e) {
    console.error('Token refresh error:', e.message);
    res.status(400).json({ error: 'Token refresh failed' });
  }
});

// OCR — extract shopping list from image using Claude API
router.post('/ocr', async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ error: 'No image provided' });

    if (!ANTHROPIC_API_KEY) {
      return res.status(501).json({ error: 'OCR not configured. Please set ANTHROPIC_API_KEY environment variable.' });
    }

    // Extract base64 data and media type
    const match = image.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!match) return res.status(400).json({ error: 'Invalid image format' });

    const mediaType = match[1];
    const base64Data = match[2];

    const claudeRes = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: base64Data }
          },
          {
            type: 'text',
            text: 'This is a photo of a handwritten or printed shopping/grocery list. Extract each item from the list. Return ONLY a JSON array of strings, one per item. Example: ["milk", "eggs", "bread", "chicken breast 2 lbs"]. If you cannot read the list, return an empty array [].'
          }
        ]
      }]
    }, {
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      }
    });

    const text = claudeRes.data?.content?.[0]?.text || '[]';
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    const items = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

    res.json({ items });
  } catch (e) {
    console.error('OCR error:', e.response?.data || e.message);
    res.status(500).json({ error: 'OCR processing failed', items: [] });
  }
});

// Parse spoken shopping list into items using Claude
router.post('/parse-voice', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'No text provided', items: [] });

    if (!ANTHROPIC_API_KEY) {
      // Simple fallback split without AI (no key required)
      const items = text.split(/,|and\s|then\s|\.\s/i).map(s => s.trim()).filter(Boolean);
      return res.json({ items });
    }

    const claudeRes = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `This is a voice-to-text transcription of someone reading their grocery shopping list. The speech recognition often mishears grocery items. Your job is to:
1. Fix common mishearings (e.g. "park" → "pork", "sake" → "steak", "flower" → "flour", "bred" → "bread", "ships" → "chips", "sees" → "cheese", "rise" → "rice", "been" → "bean", "source" → "sauce", "serial" → "cereal", "doe" → "dough")
2. Split into individual grocery items
3. Keep quantities if mentioned (e.g. "2 pounds of chicken" → "chicken 2 lbs")
4. Return ONLY a JSON array of corrected grocery item strings

Example: ["pork chops", "steak", "milk", "eggs", "bread", "chicken breast 2 lbs"]

Transcription: "${text}"`
      }]
    }, {
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      }
    });

    const responseText = claudeRes.data?.content?.[0]?.text || '[]';
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    const items = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    res.json({ items });
  } catch (e) {
    console.error('Voice parse error:', e.response?.data || e.message);
    const items = (req.body.text || '').split(/,|and\s|then\s|\.\s/i).map(s => s.trim()).filter(Boolean);
    res.json({ items });
  }
});

// Proxy Kroger API calls (avoids CORS issues) – no secrets involved
router.all('/kroger/*', async (req, res) => {
  try {
    const krogerPath = req.params[0];
    const token = req.headers.authorization;
    if (!token) return res.status(401).json({ error: 'No token' });

    const qs = new URLSearchParams(req.query).toString();
    const fullUrl = `https://api.kroger.com/v1/${krogerPath}${qs ? '?' + qs : ''}`;
    console.log(`[ScanCart] Proxy ${req.method} ${fullUrl}`);

    const config = {
      method: req.method,
      url: fullUrl,
      headers: {
        'Authorization': token,
        'Accept': 'application/json'
      }
    };

    if (req.method !== 'GET' && req.body) {
      config.data = req.body;
      config.headers['Content-Type'] = 'application/json';
    }

    const krogerRes = await axios(config);
    res.json(krogerRes.data);
  } catch (e) {
    const status = e.response?.status || 500;
    const data = e.response?.data || { error: e.message };
    console.log(`[ScanCart] Proxy error ${status}:`, JSON.stringify(data).substring(0, 200));
    res.status(status).json(data);
  }
});

module.exports = router;