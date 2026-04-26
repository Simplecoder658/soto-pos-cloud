const URL_API = "https://script.google.com/macros/s/AKfycbxfoQ3NI-vApY14LYlY7D1VqCi0-1JHaROSRP_Ph9EcUPFPnyyy7SebhIHLjvzWmPtb9Q/exec";

export const getInitialData = async () => {
  try {
    const res = await fetch(URL_API);
    return await res.json();
  } catch (err) {
    console.error("Gagal load data:", err);
    return null;
  }
};

export const saveOrder = async (orderData) => {
  try {
    const res = await fetch(URL_API, {
      method: "POST",
      body: JSON.stringify({ action: "saveOrder", ...orderData }),
    });
    return await res.json();
  } catch (err) {
    return { status: "ERROR" };
  }
};

export const updateShiftStatus = async (status) => {
  try {
    const res = await fetch(URL_API, {
      method: "POST",
      body: JSON.stringify({ action: "updateShift", status }),
    });
    return await res.json();
  } catch (err) {
    return { status: "ERROR" };
  }
};
