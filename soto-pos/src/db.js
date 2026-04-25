// db.js - FULL FIXED SINKRON URL BARU
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbyYPgwNORxTwKcZ6IpWMS23XtVP5B_41SzFldGBwXs3cY0saudSheYtac4EoIBo7I82lQ/exec";
const SECRET_TOKEN = "BQsi2277";

export const getInitialData = async () => {
  try {
    const res = await fetch(`${WEB_APP_URL}?action=getData&token=${SECRET_TOKEN}`);
    const data = await res.json();
    return data;
  } catch (e) {
    console.error("Koneksi Database Gagal:", e);
    return null;
  }
};

export const saveOrder = async (orderData) => {
  const payload = {
    token: SECRET_TOKEN,
    action: "addOrder",
    no_pesanan: orderData.noNota,
    kasir: orderData.kasir,
    total: orderData.total,
    method: orderData.method,
    items_string: orderData.cart.map(i => `${i.name}${i.option ? ' ('+i.option+')' : ''} x${i.qty}`).join(", "),
    cart: orderData.cart.map(item => ({ id: item.id, quantity: item.qty }))
  };

  const response = await fetch(WEB_APP_URL, {
    method: "POST",
    body: JSON.stringify(payload)
  });
  return await response.json();
};

export const updateShiftStatus = async (status) => {
  const payload = { token: SECRET_TOKEN, action: "updateShift", status: status };
  const response = await fetch(WEB_APP_URL, {
    method: "POST",
    body: JSON.stringify(payload)
  });
  return await response.json();
};
