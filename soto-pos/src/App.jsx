// App.jsx - FULL FIXED
import React, { useState } from 'react';
import { saveOrder } from './db';

// Daftar menu diambil dari Database_Soto.xlsx
const menuItems = [
  { id: "M1", name: "Soto Ayam Kampung Resep Ibu", price: 14000, category: "Makanan", options: ["Nasi", "Singkong", "Lontong"] },
  { id: "M2", name: "Soto Daging Andalan Bapak", price: 16000, category: "Makanan", options: ["Nasi", "Singkong", "Lontong"] },
  { id: "M3", name: "Soto Ayam Porsi Adik", price: 11000, category: "Makanan", options: ["Nasi", "Lontong"] },
  { id: "D1", name: "Es Bir Pletok", price: 8000, category: "Minuman", options: [] },
  { id: "D3", name: "Es Kopi Gula Aren", price: 10000, category: "Minuman", options: [] },
  { id: "J3", name: "Kacang Mix (Bk Kecil)", price: 3000, category: "Jajanan", options: [] },
  // Tambahkan menu lainnya sesuai ID di Spreadsheet Bos
];

export default function App() {
  const [cart, setCart] = useState([]);
  const [noNota, setNoNota] = useState("");
  const [diskonManual, setDiskonManual] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("Tunai");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fungsi tambah ke keranjang (Opsi default = Nasi, Harga tetap)
  const addToCart = (menu, selectedOption = "Nasi") => {
    const hasOptions = menu.options && menu.options.length > 0;
    const finalOption = hasOptions ? selectedOption : null;
    
    const exist = cart.find(x => x.id === menu.id && x.option === finalOption);
    if (exist) {
      setCart(cart.map(x => (x.id === menu.id && x.option === finalOption) ? { ...exist, qty: exist.qty + 1 } : x));
    } else {
      setCart([...cart, { ...menu, qty: 1, option: finalOption }]);
    }
  };

  const subtotal = cart.reduce((a, c) => a + (c.price * c.qty), 0);
  const totalBayar = subtotal - diskonManual;

  const handleCheckout = async () => {
    if (!noNota) return alert("Masukkan Nomor Nota!");
    if (cart.length === 0) return alert("Keranjang Kosong!");
    
    setIsSubmitting(true);
    const orderData = {
      noNota: noNota,
      kasir: "admin", // Sesuai user di Users.csv
      total: totalBayar,
      method: paymentMethod,
      cart: cart
    };

    const result = await saveOrder(orderData);
    if (result.status === "OK") {
      alert("Transaksi Berhasil! Stok Terpotong & Data Masuk ke Sheets.");
      setCart([]);
      setNoNota("");
      setDiskonManual(0);
    } else {
      alert("Gagal Simpan: " + result.msg);
    }
    setIsSubmitting(false);
  };

  return (
    <div style={{ display: 'flex', padding: '20px', fontFamily: 'Arial, sans-serif', gap: '20px', backgroundColor: '#f4f4f4', minHeight: '100vh' }}>
      
      {/* AREA MENU (KIRI) */}
      <div style={{ flex: 2 }}>
        <h2 style={{ color: '#333' }}>KEDAI RAME 23 - POS</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '15px' }}>
          {menuItems.map(item => (
            <div key={item.id} style={{ backgroundColor: '#fff', padding: '15px', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
              <div style={{ fontWeight: 'bold' }}>{item.name}</div>
              <div style={{ color: '#e67e22', marginBottom: '10px' }}>Rp {item.price.toLocaleString()}</div>
              
              {item.options.length > 0 ? (
                <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                  {item.options.map(opt => (
                    <button key={opt} onClick={() => addToCart(item, opt)} style={{ padding: '5px 8px', fontSize: '11px', cursor: 'pointer', borderRadius: '5px', border: '1px solid #ddd' }}>
                      + {opt}
                    </button>
                  ))}
                </div>
              ) : (
                <button onClick={() => addToCart(item)} style={{ width: '100%', padding: '8px', cursor: 'pointer', backgroundColor: '#ecf0f1', border: 'none', borderRadius: '5px' }}>
                  Tambah
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* AREA KASIR (KANAN) */}
      <div style={{ flex: 1, backgroundColor: '#fff', padding: '25px', borderRadius: '15px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', height: 'fit-content' }}>
        <h3 style={{ borderBottom: '2px solid #333', paddingBottom: '10px' }}>RINGKASAN ORDER</h3>
        
        <label style={{ fontSize: '12px', fontWeight: 'bold' }}>NO. NOTA</label>
        <input type="text" value={noNota} onChange={(e) => setNoNota(e.target.value)} placeholder="Contoh: 001" 
          style={{ width: '100%', padding: '12px', marginBottom: '20px', backgroundColor: '#fff9c4', border: '1px solid #fbc02d', borderRadius: '5px', fontSize: '16px', boxSizing: 'border-box' }} 
        />

        <div style={{ minHeight: '150px', borderBottom: '1px solid #eee', marginBottom: '15px' }}>
          {cart.map((i, idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
              <span>{i.name} {i.option && `(${i.option})`} x{i.qty}</span>
              <span>{(i.price * i.qty).toLocaleString()}</span>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Subtotal:</span>
            <span>Rp {subtotal.toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
            <span>Diskon Manual (Rp):</span>
            <input type="number" value={diskonManual} onChange={(e) => setDiskonManual(Number(e.target.value))} 
              style={{ width: '100px', textAlign: 'right', padding: '5px' }} />
          </div>
        </div>

        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#27ae60', textAlign: 'right', padding: '15px 0' }}>
          TOTAL: Rp {totalBayar.toLocaleString()}
        </div>

        <label style={{ fontSize: '12px' }}>METODE BAYAR</label>
        <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '20px' }}>
          <option value="Tunai">Tunai</option>
          <option value="QRIS">QRIS</option>
        </select>

        <button 
          onClick={handleCheckout} 
          disabled={isSubmitting}
          style={{ width: '100%', padding: '18px', backgroundColor: isSubmitting ? '#ccc' : '#2c3e50', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}
        >
          {isSubmitting ? "PROSES..." : "KONFIRMASI SELESAI"}
        </button>
      </div>
    </div>
  );
}
