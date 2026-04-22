// db.js - FULL FIXED
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwMJshHjgSPSPhR1lKnaVwxTmVgQ3CXby-29RvU6y6ZLGFof8tf-7HAR7QMj8EBDD1y/exec";
const SECRET_TOKEN = "BQsi2277";

export const saveOrder = async (orderData) => {
  const payload = {
    token: SECRET_TOKEN,
    action: "addOrder",
    no_nota: orderData.noNota,
    kasir: orderData.kasir,
    meja: orderData.meja,
    method: orderData.method,
    discount: orderData.discount, // Nominal Diskon (Rp)
    items: orderData.cart // Array berisi {name, category, qty, price}
  };

  try {
    const response = await fetch(WEB_APP_URL, {
      method: "POST",
      body: JSON.stringify(payload)
    });
    return await response.json();
  } catch (error) {
    return { status: "ERROR", message: error.message };
  }
};
