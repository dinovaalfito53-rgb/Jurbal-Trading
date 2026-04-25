// api/market-bias.js
let priceHistory = [];        // menyimpan harga terbaru (max 30)
let lastFetchTime = 0;
const CACHE_DURATION = 10 * 60 * 1000; // 10 menit untuk fetch API
const MAX_HISTORY = 30;

// Fungsi menghitung EMA
function calculateEMA(prices, period) {
  if (prices.length === 0) return null;
  if (prices.length === 1) return prices[0];
  const k = 2 / (period + 1);
  let ema = prices[0];
  for (let i = 1; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k);
  }
  return ema;
}

export default async function handler(req, res) {
  const now = Date.now();

  // --- Ambil harga terbaru ---
  // (cache berlaku hanya untuk fetch API, bukan untuk perhitungan EMA)
  if ((now - lastFetchTime) > CACHE_DURATION || priceHistory.length === 0) {
    const apiKey = process.env.GOLDAPI_KEY || 'goldapi-556fcef0b4a76cd120ae1ad724104703-io';
    let newPrice = null;
    try {
      const response = await fetch('https://www.goldapi.io/api/XAU/USD', {
        headers: { 'x-access-token': apiKey }
      });
      if (response.ok) {
        const data = await response.json();
        newPrice = data.price;          // harga terbaru
        lastFetchTime = now;
      }
    } catch (e) {
      // fallback ke simulasi kalau API gagal
    }

    if (newPrice === null) {
      // simulasi random walk di sekitar harga terakhir atau 2650
      const lastPrice = priceHistory.length > 0 ? priceHistory[priceHistory.length - 1] : 2650;
      newPrice = lastPrice + (Math.random() - 0.5) * 10; // fluktuasi ±5$
    }

    // Tambahkan ke history (max 30)
    priceHistory.push(newPrice);
    if (priceHistory.length > MAX_HISTORY) {
      priceHistory.shift(); // hapus yang paling lama
    }
  }

  // --- Hitung EMA ---
  const ema10 = calculateEMA(priceHistory, 10);
  const ema20 = calculateEMA(priceHistory, 20);

  let bias = 'SIDEWAYS';
  let icon = '⚪';
  let color = '#f59e0b';   // amber

  if (ema10 !== null && ema20 !== null) {
    const diffPercent = ((ema10 - ema20) / ema20) * 100;
    if (diffPercent > 0.1) {
      bias = 'BULLISH';
      icon = '🟢';
      color = '#00ff88';
    } else if (diffPercent < -0.1) {
      bias = 'BEARISH';
      icon = '🔴';
      color = '#ff3b5c';
    }
  }

  const currentPrice = priceHistory[priceHistory.length - 1];

  return res.status(200).json({
    price: currentPrice,
    prev_price: priceHistory.length > 1 ? priceHistory[priceHistory.length - 2] : currentPrice,
    ema10: ema10 ? +ema10.toFixed(2) : null,
    ema20: ema20 ? +ema20.toFixed(2) : null,
    bias,
    icon,
    color,
    historyCount: priceHistory.length
  });
}
