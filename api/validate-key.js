// api/validate-key.js
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

    // Baca lisensi dari Vercel KV
    const getResp = await fetch(`${kvUrl}/get/licenses`, {
      headers: { Authorization: `Bearer ${kvToken}` }
    });

    if (!getResp.ok) {
      return res.status(500).json({ valid: false, reason: 'Failed to fetch licenses' });
    }

    const data = await getResp.json();
    let licenses = [];

    // KV mengembalikan string JSON di dalam properti "result"
    if (data.result && typeof data.result === 'string') {
      licenses = JSON.parse(data.result);
    } else if (Array.isArray(data.result)) {
      licenses = data.result;
    }

    const license = licenses.find(lic => lic.key === key);
    if (!license) {
      return res.status(200).json({ valid: false });
    }

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
