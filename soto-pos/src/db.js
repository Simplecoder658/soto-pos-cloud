// db.js - FULL FIXED
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbQqwmeOHRMrbzUvEu3krvuwA4ccU3KrqmZMoiUkCQp3Vmn-ucizw1eDWDsY21rj-w2mA/exec";
const SECRET_TOKEN = "BQsi2277";

export const saveOrder = async (orderData) => {
  const payload = {
    token: SECRET_TOKEN,
    action: "addOrder",
    no_pesanan: orderData.noNota,
    kasir: orderData.kasir,
    total: orderData.total, // Sudah dipotong diskon manual dari App.jsx
    method: orderData.method,
    // Mencatat detail Nama Menu + Opsi di kolom Items Spreadsheet
    items_string: orderData.cart.map(i => 
      `${i.name}${i.option ? ' ('+i.option+')' : ''} x${i.qty}`
    ).join(", "),
    // Hanya mengirim ID menu utama untuk dipotong stoknya oleh Apps Script
    cart: orderData.cart.map(item => ({
      id: item.id, 
      quantity: item.qty
    }))
  };

  try {
    const response = await fetch(WEB_APP_URL, {
      method: "POST",
      body: JSON.stringify(payload)
    });
    return await response.json();
  } catch (error) {
    return { status: "ERROR", msg: error.message };
  }
};
