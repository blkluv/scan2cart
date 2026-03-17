const express = require('express');
const router = express.Router();
const axios = require('axios');

const KROGER_CLIENT_ID = process.env.KROGER_CLIENT_ID || 'scancart-bbccbdcc';
const KROGER_CLIENT_SECRET = process.env.KROGER_CLIENT_SECRET || 'IsqU2jevWWZ5zXsKaPtvIyJ71yX1myuOqjaO6K-C';
const KROGER_TOKEN_URL = 'https://api.kroger.com/v1/connect/oauth2/token';

// Exchange auth code for tokens
router.post('/token', async (req, res) => {
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
    res.status(400).json({ error: 'Token refresh failed' });
  }
});

// OCR — extract shopping list from image using Claude API
router.post('/ocr', async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ error: 'No image provided' });

    // Use Claude API for OCR
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicKey) {
      // Fallback: basic regex extraction if no AI key
      return res.json({ items: [], error: 'OCR not configured. Use manual input.' });
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
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      }
    });

    const text = claudeRes.data?.content?.[0]?.text || '[]';
    // Extract JSON array from response
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

    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicKey) {
      // Fallback: simple split
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
        'x-api-key': anthropicKey,
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

// Proxy Kroger API calls (avoids CORS issues)
router.all('/kroger/*', async (req, res) => {
  try {
    const krogerPath = req.params[0];
    const token = req.headers.authorization;
    if (!token) return res.status(401).json({ error: 'No token' });

    // Build full URL with query string
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
