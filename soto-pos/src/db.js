const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxssbFQOXAslLrHX39_np5-zEEl7ba6Um6cQ0NrvjnyeVuSquJqRUQUnX44t9jJsztCWg/exec";

export async function fetchCloudData() {
  try {
    const res = await fetch(SCRIPT_URL);
    if (!res.ok) throw new Error("Gagal mengambil data");
    return await res.json();
  } catch (err) {
    console.error("Gagal Load Cloud:", err);
    return null;
  }
}

export async function saveOrderToSheet(cart, total, method, kasirName) {
  const payload = {
    action: "addOrder",
    timestamp: new Date().toLocaleString('id-ID'),
    items: cart.map(i => `${i.name} (${i.quantity}x)`).join(", "),
    total: total,
    method: method,
    kasir: kasirName
  };

  return await fetch(SCRIPT_URL, {
    method: "POST",
    mode: "no-cors", 
    body: JSON.stringify(payload)
  });
}

export async function updateQrisCloud(url) {
  return await fetch(SCRIPT_URL, {
    method: "POST",
    mode: "no-cors",
    body: JSON.stringify({ action: "updateQris", url: url })
  });
}