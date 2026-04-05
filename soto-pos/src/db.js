const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxJu34oKCpLpQVlAc4l2WCPlFJbpOavc_5Fsv2__BnIdpAqtWppJVxu_QzZtvbb_nI6AQ/exec";
const SECRET_TOKEN = "BQsi2277";

export async function fetchCloudData() {
  try { 
    const r = await fetch(SCRIPT_URL); 
    return await r.json(); 
  } catch (e) { return null; }
}

export async function saveOrderToSheet(cart, total, method, kasir) {
  const p = { 
    token: SECRET_TOKEN, 
    action: "addOrder", 
    timestamp: new Date().toLocaleString('id-ID'), 
    items: cart.map(i => `${i.name} (${i.quantity}x)`).join(", "), 
    cart, 
    total, 
    method, 
    kasir 
  };
  return await fetch(SCRIPT_URL, { method: "POST", mode: "no-cors", body: JSON.stringify(p) });
}

export async function updateQrisCloud(url) {
  const p = { token: SECRET_TOKEN, action: "updateQris", url };
  return await fetch(SCRIPT_URL, { method: "POST", mode: "no-cors", body: JSON.stringify(p) });
}

export async function updateShiftCloud(status) {
  const p = { token: SECRET_TOKEN, action: "updateShift", status };
  return await fetch(SCRIPT_URL, { method: "POST", mode: "no-cors", body: JSON.stringify(p) });
}
