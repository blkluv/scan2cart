import axios from "axios";

const KROGER_CLIENT_ID = process.env.KROGER_CLIENT_ID;
const KROGER_CLIENT_SECRET = process.env.KROGER_CLIENT_SECRET;
const KROGER_TOKEN_URL = "https://api.kroger.com/v1/connect/oauth2/token";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { code, redirect_uri } = req.body;

    if (!code || !redirect_uri) {
      return res.status(400).json({ error: "Missing code or redirect_uri" });
    }

    const auth = Buffer.from(
      `${KROGER_CLIENT_ID}:${KROGER_CLIENT_SECRET}`
    ).toString("base64");

    const tokenRes = await axios.post(
      KROGER_TOKEN_URL,
      new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri,
      }).toString(),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${auth}`,
        },
      }
    );

    return res.status(200).json(tokenRes.data);

  } catch (e) {
    const detail = e.response?.data || e.message;

    return res.status(400).json({
      error: "Token exchange failed",
      detail,
    });
  }
}