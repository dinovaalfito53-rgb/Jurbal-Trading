export default async function handler(req, res) {
  const { secret } = req.query;
  if (secret !== 'ASSOxVan') return res.status(403).json({ error: 'Forbidden' });

  const kvUrl = process.env.KV_REST_API_URL;
  const kvToken = process.env.KV_REST_API_TOKEN;
  if (!kvUrl || !kvToken) return res.status(500).json({ error: 'KV not configured' });

  try {
    const getResp = await fetch(`${kvUrl}/get/licenses`, {
      headers: { Authorization: `Bearer ${kvToken}` }
    });
    const data = await getResp.json();
    return res.status(200).json({ raw: data });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
