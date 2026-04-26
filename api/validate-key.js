export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { key } = req.body;
  if (!key) return res.status(400).json({ valid: false });

  const raw = process.env.LICENSES || '[]';
  const licenses = JSON.parse(raw);
  const license = licenses.find(lic => lic.key === key);
  if (!license) return res.status(200).json({ valid: false });
  if (license.type !== 'permanent' && license.expiry) {
    if (new Date() > new Date(license.expiry)) {
      return res.status(200).json({ valid: false, expired: true });
    }
  }
  return res.status(200).json({ valid: true });
}
