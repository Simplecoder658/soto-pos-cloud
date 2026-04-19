const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwB6x1BcUF58cqhK5Xguz-lCb6bAXq9oCwcgf1JzPgvYVGy1Yfgbam-GcXu2SIjGekezQ/exec";
const SECRET_TOKEN = "BQsi2277";

export const fetchCloudData = async () => {
  try {
    const response = await fetch(`${WEB_APP_URL}?action=getData&t=${Date.now()}`);
    return await response.json();
  } catch (error) {
    console.error("Gagal ambil data:", error);
    return null;
  }
};

export const saveOrderToSheet = async (orderData) => {
  try {
    const payload = { token: SECRET_TOKEN, action: "addOrder", ...orderData };
    const response = await fetch(WEB_APP_URL, { method: "POST", body: JSON.stringify(payload) });
    return await response.json();
  } catch (error) {
    return { status: "ERROR", message: error.message };
  }
};

export const updateShiftCloud = async (status) => {
  try {
    const payload = { token: SECRET_TOKEN, action: "updateShift", status };
    const response = await fetch(WEB_APP_URL, { method: "POST", body: JSON.stringify(payload) });
    return await response.json();
  } catch (error) {
    return { status: "ERROR" };
  }
};
