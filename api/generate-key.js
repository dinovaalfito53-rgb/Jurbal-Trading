export default async function handler(req, res) {
  const { secret, type = 'monthly', duration = 1 } = req.query;

  // Ganti 'ASSOxVan' dengan string rahasia yang kamu tentukan sendiri
  if (secret !== 'ASSOxVan') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const edgeConfigId = process.env.EDGE_CONFIG_ID;
  const edgeConfigToken = process.env.EDGE_CONFIG_TOKEN;
  if (!edgeConfigId || !edgeConfigToken) {
    return res.status(500).json({ error: 'Edge Config not configured' });
  }

  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let key = 'ASSO-';
  for (let i = 0; i < 4; i++) {
    let chunk = '';
    for (let j = 0; j < 4; j++) chunk += chars[Math.floor(Math.random() * chars.length)];
    key += chunk;
    if (i < 3) key += '-';
  }

  let expiry = null;
  const now = Date.now();
  switch (type) {
    case 'daily': expiry = new Date(now + duration * 24*60*60*1000).toISOString(); break;
    case 'weekly': expiry = new Date(now + duration * 7*24*60*60*1000).toISOString(); break;
    case 'monthly': expiry = new Date(now + duration * 30*24*60*60*1000).toISOString(); break;
    case 'permanent': expiry = null; break;
    default: return res.status(400).json({ error: 'Invalid type' });
  }

  const newLicense = { key, type, created: new Date().toISOString(), expiry };

  try {
    const getResp = await fetch(`https://api.vercel.com/v1/edge-config/${edgeConfigId}/items`, {
      headers: { Authorization: `Bearer ${edgeConfigToken}` }
    });
    const data = await getResp.json();
    const item = Array.isArray(data.items) ? data.items.find(i => i.key === 'licenses') : null;
    const licenses = item ? JSON.parse(item.value) : [];
    licenses.push(newLicense);
    const operation = item ? 'update' : 'create';
    await fetch(`https://api.vercel.com/v1/edge-config/${edgeConfigId}/items`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${edgeConfigToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [{ operation, key: 'licenses', value: JSON.stringify(licenses) }] })
    });
    return res.status(200).json({ key, type, expiry });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
