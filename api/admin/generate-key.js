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

  try {
    const kvUrl = process.env.KV_REST_API_URL;
    const kvToken = process.env.KV_REST_API_TOKEN;
    if (!kvUrl || !kvToken) {
      return res.status(500).json({ error: 'KV not configured' });
    }

    // Ambil lisensi yang sudah ada
    let licenses = [];
    try {
      const getResp = await fetch(`${kvUrl}/get/licenses`, {
        headers: { Authorization: `Bearer ${kvToken}` }
      });
      if (getResp.ok) {
        const data = await getResp.json();
        if (data && data.result) {
          // Tangani string JSON yang mungkin double‑stringified
          let parsed = data.result;
          if (typeof parsed === 'string') parsed = JSON.parse(parsed);
          if (typeof parsed === 'string') parsed = JSON.parse(parsed);
          if (parsed && parsed.value) {
            if (typeof parsed.value === 'string') parsed = JSON.parse(parsed.value);
            else parsed = parsed.value;
          }
          licenses = Array.isArray(parsed) ? parsed : [];
        }
      }
    } catch (e) {
      // jika belum ada key 'licenses', mulai dari array kosong
      licenses = [];
    }

    licenses.push(newLicense);

    // Simpan kembali – kali ini hanya satu kali JSON.stringify
    const setResp = await fetch(`${kvUrl}/set/licenses`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${kvToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ value: JSON.stringify(licenses) })
    });

    if (!setResp.ok) throw new Error('Gagal menyimpan ke KV');
    return res.status(200).json({ key, type, expiry });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
