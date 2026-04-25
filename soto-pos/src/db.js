const URL_API = "https://script.google.com/macros/s/AKfycbz1N05imo_byeZovhxEq2Gb_EsN__GIAq9bzVeJ28hitRCnd2YDOvOKhYFGDLGPN3I_lA/exec";

export const getInitialData = async () => {
  try {
    const res = await fetch(URL_API);
    return await res.json();
  } catch (err) {
    console.error("Gagal ambil data:", err);
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
    console.error("Gagal simpan order:", err);
    return { status: "ERROR" };
  }
};

export const updateShiftStatus = async (status) => {
  try {
    const res = await fetch(URL_API, {
      method: "POST",
      body: JSON.stringify({ action: "updateShift", status: status }),
    });
    return await res.json();
  } catch (err) {
    console.error("Gagal update shift:", err);
    return { status: "ERROR" };
  }
};
