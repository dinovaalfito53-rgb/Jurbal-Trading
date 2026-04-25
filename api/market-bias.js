// api/market-bias.js
let cachedData = null;
let lastFetchTime = 0;
const CACHE_DURATION = 10 * 60 * 1000; // 10 menit

export default async function handler(req, res) {
  const now = Date.now();

  // Kembalikan cache jika masih segar
  if (cachedData && (now - lastFetchTime) < CACHE_DURATION) {
    return res.status(200).json(cachedData);
  }

  // API key: pakai environment variable jika ada, jika tidak pakai hardcoded
  const apiKey = process.env.GOLDAPI_KEY || 'goldapi-556fcef0b4a76cd120ae1ad724104703-io';

  try {
    const response = await fetch('https://www.goldapi.io/api/XAU/USD', {
      headers: { 'x-access-token': apiKey }
    });
    if (response.ok) {
      const data = await response.json();
      cachedData = {
        price: data.price,
        prev_price: data.prev_close_price || data.price * 0.999
      };
      lastFetchTime = now;
      return res.status(200).json(cachedData);
    }
    throw new Error('API request failed');
  } catch (error) {
    // Fallback simulasi kalau API gagal total
    const price = 2650 + Math.random() * 80;
    const simulated = {
      price,
      prev_price: price * (1 + (Math.random() - 0.5) * 0.008)
    };
    return res.status(200).json(simulated);
  }
}
