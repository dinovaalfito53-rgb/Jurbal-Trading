export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { key } = req.body;
  if (!key) return res.status(400).json({ valid: false });

  try {
    const kvUrl = process.env.KV_REST_API_URL + '/get/licenses';
    const kvToken = process.env.KV_REST_API_TOKEN;

    const getResp = await fetch(kvUrl, {
      headers: { Authorization: `Bearer ${kvToken}` }
    });
    const getData = await getResp.json();
    let licenses = [];
    if (getData.result) {
      licenses = JSON.parse(getData.result);
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
