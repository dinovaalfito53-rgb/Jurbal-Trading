// api/admin/generate-key.js
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (req.headers['x-admin-token'] !== process.env.ADMIN_TOKEN) return res.status(403).json({ error: 'Forbidden' });

  const { type = 'monthly', duration = 1 } = req.body;
  const edgeConfigId = process.env.EDGE_CONFIG_ID;
  const edgeConfigToken = process.env.EDGE_CONFIG_TOKEN;
  if (!edgeConfigId || !edgeConfigToken) return res.status(500).json({ error: 'Edge Config not configured' });

  // Generate key
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
    case 'daily': expiry = new Date(now + duration * 24 * 60 * 60 * 1000).toISOString(); break;
    case 'weekly': expiry = new Date(now + duration * 7 * 24 * 60 * 60 * 1000).toISOString(); break;
    case 'monthly': expiry = new Date(now + duration * 30 * 24 * 60 * 60 * 1000).toISOString(); break;
    case 'permanent': expiry = null; break;
    default: return res.status(400).json({ error: 'Invalid type' });
  }

  const newLicense = { key, type, created: new Date().toISOString(), expiry };

  try {
    // Ambil lisensi yang sudah ada
    const getResp = await fetch(`https://api.vercel.com/v1/edge-config/${edgeConfigId}/items`, {
      headers: { Authorization: `Bearer ${edgeConfigToken}` }
    });
    if (!getResp.ok) throw new Error(`Gagal baca: ${getResp.status}`);
    const data = await getResp.json();
    let licenses = [];
    const licensesItem = Array.isArray(data.items) ? data.items.find(item => item.key === 'licenses') : null;
    if (licensesItem) {
      licenses = JSON.parse(licensesItem.value);
    }

    licenses.push(newLicense);

    // Tentukan operasi: update jika item sudah ada, create jika belum
    const operation = licensesItem ? 'update' : 'create';
    const patchResp = await fetch(`https://api.vercel.com/v1/edge-config/${edgeConfigId}/items`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${edgeConfigToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        items: [
          {
            operation: operation,
            key: 'licenses',
            value: JSON.stringify(licenses)
          }
        ]
      })
    });

    if (!patchResp.ok) {
      const errText = await patchResp.text();
      throw new Error(`Gagal update: ${patchResp.status} ${errText}`);
    }

    return res.status(200).json({ key, type, expiry });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
