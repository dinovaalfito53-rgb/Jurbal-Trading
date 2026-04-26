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
      let parsed = data.result;

      // Jika hasil berbentuk string, parse dulu
      if (typeof parsed === 'string') {
        try {
          parsed = JSON.parse(parsed);
        } catch (e) {
          return res.status(500).json({ valid: false, reason: 'JSON parse error 1' });
        }
      }

      // Sekarang parsed bisa jadi string lagi karena adanya dua kali stringify
      if (typeof parsed === 'string') {
        try {
          parsed = JSON.parse(parsed);
        } catch (e) {
          return res.status(500).json({ valid: false, reason: 'JSON parse error 2' });
        }
      }

      // Akhirnya, jika parsed memiliki properti value, ambil itu
      if (parsed && parsed.value) {
        if (typeof parsed.value === 'string') {
          try {
            licenses = JSON.parse(parsed.value);
          } catch (e) {
            return res.status(500).json({ valid: false, reason: 'JSON parse error 3' });
          }
        } else {
          licenses = parsed.value;
        }
      } else if (Array.isArray(parsed)) {
        licenses = parsed;
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
