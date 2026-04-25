export default async function handler(req, res) {
  res.status(200).json({
    edgeConfigId: process.env.EDGE_CONFIG_ID ? 'ada' : 'KOSONG',
    edgeConfigToken: process.env.EDGE_CONFIG_TOKEN ? 'ada' : 'KOSONG',
    adminToken: process.env.ADMIN_TOKEN ? 'ada' : 'KOSONG',
  });
}
