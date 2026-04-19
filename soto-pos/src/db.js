// db.js
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxSeKdIx5PdWyiDYf81MqQpc91qaS3TUdoMoFpHJmqEKyJCTGOEEf9XzifBWmx9LLf9sQ/exec";
const SECRET_TOKEN = "BQsi2277"; 

export const fetchCloudData = async () => {
  try {
    const response = await fetch(`${SCRIPT_URL}?action=getData`);
    if (!response.ok) throw new Error("Gagal mengambil data");
    const data = await response.json();
    return {
      menu: data.menu || [],
      users: data.users || [],
      qris: data.qris || "",
      exitCode: data.exitCode || "",
      shiftStatus: data.shiftStatus || "CLOSED",
      usedOrders: data.usedOrders || []
    };
  } catch (error) {
    console.error("Cloud Error:", error);
    return null;
  }
};

export const saveOrderToSheet = async (cart, total, method, kasir, orderNumber) => {
  try {
    // Format item untuk kolom "Items" di Sheet (Contoh: Soto Ayam (Singkong) (2x))
    const itemsString = cart.map(i => `${i.name} (${i.quantity}x)`).join(", ");
    
    const payload = {
      action: "addOrder",
      token: SECRET_TOKEN,
      no_pesanan: String(orderNumber),
      items: itemsString,
      total: total,
      method: method,
      kasir: kasir,
      timestamp: new Date().toLocaleString("id-ID"),
      cart: cart // dikirim untuk potong stok di sheet Menu
    };

    await fetch(SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    return true;
  } catch (error) {
    console.error("Simpan Pesanan Gagal:", error);
    throw error;
  }
};

export const updateShiftCloud = async (newStatus) => {
  try {
    await fetch(SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "updateShift",
        token: SECRET_TOKEN,
        status: newStatus
      })
    });
    return true;
  } catch (error) {
    console.error("Update Shift Gagal:", error);
    return false;
  }
};
