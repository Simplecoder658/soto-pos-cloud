const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwa2us_kIVVGOxp_YaFhfJRVfNKSIU-PjBAZA9BZ5nrZCYN0UgtQ3bSwzJSgYuv78PHfw/exec";
const SECRET_TOKEN = "BQsi2277";

export const fetchCloudData = async () => {
  try {
    const response = await fetch(`${WEB_APP_URL}?action=getData`);
    return await response.json();
  } catch (error) {
    console.error("Fetch Error:", error);
    return null;
  }
};

export const saveOrderToSheet = async (orderData) => {
  try {
    const payload = {
      token: SECRET_TOKEN,
      action: "addOrder",
      ...orderData
    };
    const response = await fetch(WEB_APP_URL, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return await response.json();
  } catch (error) {
    return { status: "ERROR", message: error.message };
  }
};

export const updateShiftCloud = async (status) => {
  try {
    const payload = { token: SECRET_TOKEN, action: "updateShift", status };
    const response = await fetch(WEB_APP_URL, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return await response.json();
  } catch (error) {
    return { status: "ERROR" };
  }
};
