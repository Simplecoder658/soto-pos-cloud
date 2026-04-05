const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx3s42YoQW8MyRwqeHEfQYQmvx2SNz_I_maZ8XBrP5FASwAIpHyxYw5xRuwMkznTJXi/exec";
const SECRET_TOKEN = "BQsi2277";

export async function fetchCloudData() {
  try {
    const response = await fetch(SCRIPT_URL);
    return await response.json();
  } catch (error) { return null; }
}

export async function saveOrderToSheet(cart, total, method, kasirName) {
  const payload = {
    token: SECRET_TOKEN,
    action: "addOrder",
    timestamp: new Date().toLocaleString('id-ID'),
    items: cart.map(i => `${i.name} (${i.quantity}x)`).join(", "),
    cart: cart, // Dibutuhkan untuk logika potong stok
    total: total,
    method: method,
    kasir: kasirName
  };

  return await fetch(SCRIPT_URL, {
    method: "POST",
    mode: "no-cors", 
    body: JSON.stringify(payload)
  });
}

export async function updateQrisCloud(newUrl) {
  const payload = { token: SECRET_TOKEN, action: "updateQris", url: newUrl };
  return await fetch(SCRIPT_URL, { method: "POST", mode: "no-cors", body: JSON.stringify(payload) });
}
