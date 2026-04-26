const URL_API = "https://script.google.com/macros/s/AKfycbxsqCieTKiZKEvYi0KfK35hWhosBJrGwFppFTXVDpu9Z-GCalqULKqKqVEWxiv45ALqPw/exec";

export const getInitialData = async () => {
  try {
    const res = await fetch(URL_API);
    return await res.json();
  } catch (err) { return null; }
};

export const saveOrder = async (orderData) => {
  try {
    const res = await fetch(URL_API, { method: "POST", body: JSON.stringify({ action: "saveOrder", ...orderData }) });
    return await res.json();
  } catch (err) { return { status: "ERROR" }; }
};

export const updateShiftStatus = async (status) => {
  try {
    const res = await fetch(URL_API, { method: "POST", body: JSON.stringify({ action: "updateShift", status }) });
    return await res.json();
  } catch (err) { return { status: "ERROR" }; }
};
