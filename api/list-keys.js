1export default async function handler(req, res) {
  const { secret } = req.query;
  if (secret !== 'ASSOxVan') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const edgeConfigId = process.env.EDGE_CONFIG_ID;
  const edgeConfigToken = process.env.EDGE_CONFIG_TOKEN;
  if (!edgeConfigId || !edgeConfigToken) {
    return res.status(500).json({ error: 'Edge Config not configured' });
  }

  try {
    const response = await fetch(`https://api.vercel.com/v1/edge-config/${edgeConfigId}/items`, {
      headers: { Authorization: `Bearer ${edgeConfigToken}` }
    });
    const data = await response.json();
    const item = Array.isArray(data.items) ? data.items.find(i => i.key === 'licenses') : null;
    const licenses = item ? JSON.parse(item.value) : [];
    return res.status(200).json({ count: licenses.length, licenses });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
