// db.js - FULL FIXED
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbQqwmeOHRMrbzUvEu3krvuwA4ccU3KrqmZMoiUkCQp3Vmn-ucizw1eDWDsY21rj-w2mA/exec";
const SECRET_TOKEN = "BQsi2277";

export const getInitialData = async () => {
  try {
    const res = await fetch(`${WEB_APP_URL}?action=getData&token=${SECRET_TOKEN}`);
    return await res.json();
  } catch (e) { return null; }
};

export const saveOrder = async (orderData) => {
  const payload = {
    token: SECRET_TOKEN,
    action: "addOrder",
    ...orderData,
    items_string: orderData.cart.map(i => `${i.name}${i.option ? ' ('+i.option+')' : ''} x${i.qty}`).join(", "),
    cart: orderData.cart.map(item => ({ id: item.id, quantity: item.qty }))
  };
  const response = await fetch(WEB_APP_URL, { method: "POST", body: JSON.stringify(payload) });
  return await response.json();
};

export const updateShiftStatus = async (status) => {
  const payload = { token: SECRET_TOKEN, action: "updateShift", status: status };
  const response = await fetch(WEB_APP_URL, { method: "POST", body: JSON.stringify(payload) });
  return await response.json();
};
