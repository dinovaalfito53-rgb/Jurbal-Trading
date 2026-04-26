export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (req.headers['x-admin-token'] !== process.env.ADMIN_TOKEN) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { type = 'monthly', duration = 1 } = req.body;

  // Generate key acak
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
  const raw = process.env.LICENSES || '[]';
  const licenses = JSON.parse(raw);
  licenses.push(newLicense);

  try {
    // Cari ID environment variable LICENSES
    const listResp = await fetch(`https://api.vercel.com/v9/projects/${process.env.VERCEL_PROJECT_ID}/env`, {
      headers: { Authorization: `Bearer ${process.env.VERCEL_TOKEN}` }
    });
    const listData = await listResp.json();
    const envVar = listData.envs?.find(e => e.key === 'LICENSES');
    if (!envVar) throw new Error('LICENSES environment variable not found');

    // Update nilainya (PATCH, bukan POST)
    const updateResp = await fetch(`https://api.vercel.com/v9/projects/${process.env.VERCEL_PROJECT_ID}/env/${envVar.id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ value: JSON.stringify(licenses) })
    });

    if (!updateResp.ok) {
      const errText = await updateResp.text();
      throw new Error(`Gagal update: ${updateResp.status} ${errText}`);
    }

    return res.status(200).json({ key, type, expiry });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
