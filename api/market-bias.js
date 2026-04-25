export default async function handler(req, res) {
  const apiKey = process.env.GOLDAPI_KEY;
  try {
    if (apiKey) {
      const response = await fetch('https://www.goldapi.io/api/XAU/USD', {
        headers: { 'x-access-token': apiKey }
      });
      if (response.ok) {
        const data = await response.json();
        return res.status(200).json({
          price: data.price,
          prev_price: data.prev_close_price || data.price * 0.999
        });
      }
    }
    throw new Error('No API key or API failed');
  } catch (e) {
    // Fallback simulasi
    const price = 2650 + Math.random() * 80;
    return res.status(200).json({
      price,
      prev_price: price * (1 + (Math.random() - 0.5) * 0.008)
    });
  }
}