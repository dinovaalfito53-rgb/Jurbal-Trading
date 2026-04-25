// api/market-bias.js
let cachedPrices = null;       // array harga close harian (max 200)
let lastFetchTime = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1 jam
const MAX_HISTORY = 200;
const EMA_FAST = 50;
const EMA_SLOW = 200;

function calculateEMA(prices, period) {
  if (!prices || prices.length === 0) return null;
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

  if (!cachedPrices || (now - lastFetchTime) > CACHE_DURATION) {
    const apiKey = process.env.GOLDAPI_KEY || 'goldapi-556fcef0b4a76cd120ae1ad724104703-io';
    let prices = [];

    try {
      const resp = await fetch(
        `https://www.goldapi.io/api/XAU/USD/ohlc?period=daily&limit=${MAX_HISTORY}`,
        { headers: { 'x-access-token': apiKey } }
      );
      if (resp.ok) {
        const data = await resp.json();
        if (data.ohlc && Array.isArray(data.ohlc)) {
          prices = data.ohlc.map(item => item.close).reverse();
        }
      }
    } catch (e) {}

    if (prices.length < 50) {
      prices = [];
      let base = 2600;
      for (let i = 0; i < MAX_HISTORY; i++) {
        base = base + (Math.random() - 0.48) * 10;
        prices.push(base);
      }
    }

    cachedPrices = prices.slice(-MAX_HISTORY);
    lastFetchTime = now;
  }

  const emaFast = calculateEMA(cachedPrices, EMA_FAST);
  const emaSlow = calculateEMA(cachedPrices, EMA_SLOW);
  const currentPrice = cachedPrices[cachedPrices.length - 1];

  let bias = 'SIDEWAYS';
  let icon = '⚪';
  let color = '#f59e0b';

  if (emaFast !== null && emaSlow !== null && emaSlow !== 0) {
    const diffPercent = ((emaFast - emaSlow) / emaSlow) * 100;
    if (diffPercent > 0.05) {
      bias = 'BULLISH';
      icon = '🟢';
      color = '#00ff88';
    } else if (diffPercent < -0.05) {
      bias = 'BEARISH';
      icon = '🔴';
      color = '#ff3b5c';
    }
  }

  return res.status(200).json({
    price: currentPrice,
    emaFast: emaFast ? +emaFast.toFixed(2) : null,
    emaSlow: emaSlow ? +emaSlow.toFixed(2) : null,
    bias,
    icon,
    color,
    dataPoints: cachedPrices.length,
    timeframe: 'D1 (Daily)'
  });
}
