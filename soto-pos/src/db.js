// db.js - KONEKSI DATABASE KEDAI RAME 23
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbw0YKDG1Jur62Biunz7LHvk3s7SAgFDHmeChL2BGZGEZPVl8xkn23U5hG0cvoLxM0cvnw/exec";
const SECRET_TOKEN = "BQsi2277";

/**
 * Mengambil data awal (Menu, Users, Config, Orders)
 */
export const getInitialData = async () => {
  try {
    const res = await fetch(`${WEB_APP_URL}?action=getData&token=${SECRET_TOKEN}`);
    const data = await res.json();
    return data;
  } catch (e) {
    console.error("Gagal memuat data dari Google Sheets:", e);
    return null;
  }
};

/**
 * Menyimpan pesanan baru ke Google Sheets
 */
export const saveOrder = async (orderData) => {
  try {
    const payload = {
      token: SECRET_TOKEN,
      action: "addOrder",
      no_pesanan: orderData.noNota,
      kasir: orderData.kasir,
      total: orderData.total,
      method: "Tunai",
      // Menggabungkan nama item dan pilihan karbo menjadi string untuk kolom 'Items'
      items_string: orderData.cart.map(i => `${i.name} (${i.option}) x${i.qty}`).join(", "),
      cart: orderData.cart // Mengirim array objek untuk keperluan potong stok
    };

    const response = await fetch(WEB_APP_URL, {
      method: "POST",
      body: JSON.stringify(payload)
    });
    return await response.json();
  } catch (e) {
    console.error("Gagal menyimpan pesanan:", e);
    return { status: "ERROR", msg: e.message };
  }
};

/**
 * Mengupdate status shift (OPEN/CLOSED)
 */
export const updateShiftStatus = async (status) => {
  try {
    const payload = {
      token: SECRET_TOKEN,
      action: "updateShift",
      status: status
    };

    const response = await fetch(WEB_APP_URL, {
      method: "POST",
      body: JSON.stringify(payload)
    });
    return await response.json();
  } catch (e) {
    console.error("Gagal update shift:", e);
    return { status: "ERROR", msg: e.message };
  }
};
