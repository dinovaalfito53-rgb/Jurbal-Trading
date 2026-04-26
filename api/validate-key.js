export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { key } = req.body;
  if (!key) return res.status(400).json({ valid: false });

  const edgeConfigId = process.env.EDGE_CONFIG_ID;
  const edgeConfigToken = process.env.EDGE_CONFIG_TOKEN;

  if (!edgeConfigId || !edgeConfigToken) {
    return res.status(500).json({ valid: false, reason: 'Edge Config not configured' });
  }

  try {
    const response = await fetch(`https://api.vercel.com/v1/edge-config/${edgeConfigId}/items`, {
      headers: { Authorization: `Bearer ${edgeConfigToken}` }
    });
    if (!response.ok) return res.status(500).json({ valid: false, reason: 'Gagal baca lisensi' });

    const data = await response.json();
    const licensesItem = Array.isArray(data.items) ? data.items.find(item => item.key === 'licenses') : null;
    const licenses = licensesItem ? JSON.parse(licensesItem.value) : [];

    const license = licenses.find(lic => lic.key === key);
    if (!license) return res.status(200).json({ valid: false });

    if (license.type !== 'permanent' && license.expiry) {
      if (new Date() > new Date(license.expiry)) {
        return res.status(200).json({ valid: false, expired: true });
      }
    }
    return res.status(200).json({ valid: true });
  } catch (e) {
    return res.status(500).json({ valid: false, reason: e.message });
  }
}
