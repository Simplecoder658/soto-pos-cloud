const URL_API = "https://script.google.com/macros/s/AKfycbyU6Cl0sMw5hlbcX8TxRUBSF1qm0_OxkEFeIMbcieW5v4YFq3jNUwDzGH0UdDBgPZ5r/exec";

export const getInitialData = async () => {
  try {
    const res = await fetch(URL_API);
    return await res.json();
  } catch (err) {
    console.error("Gagal mengambil data:", err);
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
