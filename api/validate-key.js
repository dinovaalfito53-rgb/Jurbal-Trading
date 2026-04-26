export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { key } = req.body;
  if (!key) return res.status(400).json({ valid: false });

  try {
    const kvUrl = process.env.KV_REST_API_URL;
    const kvToken = process.env.KV_REST_API_TOKEN;
    if (!kvUrl || !kvToken) {
      return res.status(500).json({ valid: false, reason: 'KV not configured' });
    }

    const getResp = await fetch(`${kvUrl}/get/licenses`, {
      headers: { Authorization: `Bearer ${kvToken}` }
    });
    if (!getResp.ok) return res.status(500).json({ valid: false, reason: 'Failed to fetch' });

    const data = await getResp.json();

    let licenses = [];
    if (data && data.result) {
      if (typeof data.result === 'string') {
        try {
          licenses = JSON.parse(data.result);
        } catch (e) {
          return res.status(500).json({ valid: false, reason: 'Invalid JSON in KV' });
        }
      } else if (Array.isArray(data.result)) {
        licenses = data.result;
      }
    }

    if (!Array.isArray(licenses)) {
      return res.status(500).json({ valid: false, reason: 'Licenses is not an array' });
    }

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
