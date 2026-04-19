const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzoYiYIdjogrzZJe_28kxKxPCUpsIDBzohCSEqFCCbIIjL85pHlvPv3X5B7LE_I0eBL9A/exec";
const SECRET_TOKEN = "BQsi2277";

/**
 * Mengambil data lengkap (Menu, Users, Config, UsedOrders)
 */
export const fetchCloudData = async () => {
  try {
    const response = await fetch(`${WEB_APP_URL}?action=getData`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Gagal mengambil data dari Cloud:", error);
    return null;
  }
};

/**
 * Menyimpan pesanan baru ke Google Sheets
 * @param {Object} orderData - Berisi no_pesanan, items (string), total, method, kasir, cart (array untuk potong stok)
 */
export const saveOrderToSheet = async (orderData) => {
  try {
    const payload = {
      token: SECRET_TOKEN,
      action: "addOrder",
      ...orderData,
      timestamp: new Date().toISOString()
    };

    const response = await fetch(WEB_APP_URL, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    return result; // Mengembalikan { status: "OK", message: "..." }
  } catch (error) {
    console.error("Gagal menyimpan pesanan:", error);
    return { status: "ERROR", message: error.message };
  }
};

/**
 * Mengupdate status Shift (Buka/Tutup)
 */
export const updateShiftCloud = async (status) => {
  try {
    const payload = {
      token: SECRET_TOKEN,
      action: "updateShift",
      status: status // "OPEN" atau "CLOSED"
    };

    const response = await fetch(WEB_APP_URL, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    return await response.json();
  } catch (error) {
    console.error("Gagal update shift:", error);
    return { status: "ERROR" };
  }
};

/**
 * Mengupdate Link/URL QRIS (Sel B2)
 */
export const updateQrisUrl = async (url) => {
  try {
    const payload = {
      token: SECRET_TOKEN,
      action: "updateQris",
      url: url
    };

    const response = await fetch(WEB_APP_URL, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    return await response.json();
  } catch (error) {
    console.error("Gagal update QRIS:", error);
    return { status: "ERROR" };
  }
};
