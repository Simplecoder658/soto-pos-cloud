import React, { useState, useEffect } from 'react';
import { saveOrder } from './db'; // Pastikan db.js sudah pakai URL baru

const App = () => {
  // 1. State Management
  const [cart, setCart] = useState([]);
  const [noNota, setNoNota] = useState("");
  const [meja, setMeja] = useState("");
  const [metodeBayar, setMetodeBayar] = useState("Tunai");
  const [diskon, setDiskon] = useState(0);
  const [loading, setLoading] = useState(false);

  // 2. Daftar Menu (Sesuai Tab DATA MENU Bos)
  // Pastikan property 'category' sama persis dengan yang ada di Excel
  const daftarMenu = [
    { id: 1, name: "Soto Ayam - Singkong", category: "Soto Ayam", price: 13000 },
    { id: 2, name: "Soto Ayam - Nasi", category: "Soto Ayam", price: 15000 },
    { id: 4, name: "Soto Daging - Singkong", category: "Soto Daging", price: 15000 },
    { id: 6, name: "Soto Daging - Nasi", category: "Soto Daging", price: 17000 },
    { id: 18, name: "Es Teh", category: "Minuman", price: 4000 },
    { id: 19, name: "Es Kopi Susu", category: "Minuman", price: 10000 },
    // Tambahkan menu lainnya di sini...
  ];

  // 3. Perhitungan Total
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const totalAkhir = subtotal - diskon;

  // 4. Fungsi Tambah ke Keranjang
  const addToCart = (menu) => {
    const existing = cart.find(item => item.id === menu.id);
    if (existing) {
      setCart(cart.map(item => 
        item.id === menu.id ? { ...item, qty: item.qty + 1 } : item
      ));
    } else {
      setCart([...cart, { ...menu, qty: 1 }]);
    }
  };

  // 5. Fungsi Simpan Transaksi (KONFIRMASI)
  const handleCheckout = async () => {
    if (!noNota) return alert("Isi Nomor Nota dulu, Bos!");
    if (cart.length === 0) return alert("Keranjang masih kosong!");

    setLoading(true);
    const orderData = {
      noNota: noNota,
      kasir: "Kasir 1", // Bisa dibuat dinamis jika perlu
      meja: meja || "-",
      method: metodeBayar,
      discount: Number(diskon),
      cart: cart // Mengirim array {name, category, qty, price}
    };

    try {
      const result = await saveOrder(orderData);
      if (result.status === "OK") {
        alert(`Transaksi Nota #${noNota} Berhasil Disimpan ke LOG!`);
        // Reset Form
        setCart([]);
        setNoNota("");
        setMeja("");
        setDiskon(0);
      } else {
        alert("Gagal simpan: " + result.message);
      }
    } catch (error) {
      alert("Error Koneksi: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'sans-serif' }}>
      
      {/* BAGIAN KIRI: DAFTAR MENU */}
      <div style={{ flex: 1, padding: '20px', overflowY: 'auto', backgroundColor: '#f4f4f4' }}>
        <h2 style={{ marginBottom: '20px' }}>Menu Kedai Rame 23</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '15px' }}>
          {daftarMenu.map(menu => (
            <div 
              key={menu.id} 
              onClick={() => addToCart(menu)}
              style={{ 
                padding: '15px', backgroundColor: 'white', borderRadius: '12px', 
                cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', textAlign: 'center' 
              }}
            >
              <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{menu.name}</div>
              <div style={{ color: '#e67e22', marginTop: '5px' }}>Rp {menu.price.toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>

      {/* BAGIAN KANAN: INPUT TRANSAKSI (Aside) */}
      <div style={{ width: '350px', padding: '20px', borderLeft: '2px solid #ddd', display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ borderBottom: '2px solid #333', paddingBottom: '10px' }}>INPUT TRANSAKSI</h3>
        
        {/* Input Kuning (Sesuai Petunjuk) */}
        <div style={{ marginBottom: '15px' }}>
          <label style={{ fontSize: '12px', fontWeight: 'bold' }}>NO. NOTA (KUNING)</label>
          <input 
            type="text" placeholder="Contoh: 001"
            value={noNota} onChange={(e) => setNoNota(e.target.value)}
            style={{ width: '100%', padding: '10px', backgroundColor: '#fff9c4', border: '1px solid #fbc02d', borderRadius: '5px', fontSize: '18px', fontWeight: 'bold' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ fontSize: '12px', fontWeight: 'bold' }}>MEJA / ORDER</label>
          <input 
            type="text" value={meja} onChange={(e) => setMeja(e.target.value)}
            style={{ width: '100%', padding: '8px', borderRadius: '5px', border: '1px solid #ccc' }}
          />
        </div>

        {/* List Item di Keranjang */}
        <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #eee', padding: '10px', borderRadius: '5px', marginBottom: '15px' }}>
          {cart.map((item, index) => (
            <div key={index} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px' }}>
              <span>{item.name} x{item.qty}</span>
              <span>{(item.price * item.qty).toLocaleString()}</span>
            </div>
          ))}
        </div>

        {/* Perhitungan Total & Diskon */}
        <div style={{ borderTop: '2px solid #eee', paddingTop: '15px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
            <span>Subtotal:</span>
            <span>Rp {subtotal.toLocaleString()}</span>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span>Diskon (Rp):</span>
            <input 
              type="number" value={diskon} onChange={(e) => setDiskon(e.target.value)}
              style={{ width: '100px', textAlign: 'right', padding: '5px', backgroundColor: '#fff9c4', border: '1px solid #fbc02d' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '20px', color: '#27ae60', backgroundColor: '#e8f5e9', padding: '10px', borderRadius: '8px' }}>
            <span>TOTAL:</span>
            <span>Rp {totalAkhir.toLocaleString()}</span>
          </div>
        </div>

        <div style={{ marginTop: '15px' }}>
          <label style={{ fontSize: '12px', fontWeight: 'bold' }}>METODE BAYAR</label>
          <select value={metodeBayar} onChange={(e) => setMetodeBayar(e.target.value)} style={{ width: '100%', padding: '10px', marginTop: '5px' }}>
            <option value="Tunai">Tunai</option>
            <option value="QRIS">QRIS</option>
            <option value="Transfer">Transfer</option>
          </select>
        </div>

        <button 
          onClick={handleCheckout}
          disabled={loading}
          style={{ 
            width: '100%', padding: '15px', marginTop: '20px', backgroundColor: loading ? '#ccc' : '#2c3e50', 
            color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' 
          }}
        >
          {loading ? "MENYIMPAN..." : "KONFIRMASI (SIMPAN KE LOG)"}
        </button>
      </div>
    </div>
  );
};

export default App;
