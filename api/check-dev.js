export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ valid: false });
  }
  const validToken = process.env.DEV_TOKEN;
  if (!validToken) {
    return res.status(500).json({ valid: false, reason: 'DEV_TOKEN not configured' });
  }
  const isValid = token === validToken;
  return res.status(200).json({ valid: isValid });
}