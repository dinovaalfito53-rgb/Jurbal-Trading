export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { key } = req.body;
  if (!key) {
    return res.status(400).json({ valid: false });
  }
  const validKeys = (process.env.VALID_KEYS || '').split(',').map(k => k.trim());
  const isValid = validKeys.includes(key);
  return res.status(200).json({ valid: isValid });
}