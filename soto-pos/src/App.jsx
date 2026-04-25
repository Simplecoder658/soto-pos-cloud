import React, { useState, useEffect } from 'react';
import { getInitialData, saveOrder, updateShiftStatus } from './db';

export default function App() {
  const [user, setUser] = useState(null);
  const [db, setDb] = useState({ menu: [], users: [], orders: [], shiftStatus: "CLOSED" });
  const [login, setLogin] = useState({ username: "", pin: "" });
  const [cart, setCart] = useState([]);
  const [noNota, setNoNota] = useState("");
  const [diskon, setDiskon] = useState(0);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("Makanan");

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const data = await getInitialData();
    if (data && data.status === "SUCCESS") setDb(data);
  };

  const handleLogin = (e) => {
    e.preventDefault();
    const found = db.users.find(u => u.username === login.username && u.pin === login.pin);
    if (found) setUser(found); else alert("Login Gagal! PIN salah.");
  };

  const addToCart = (item, opt = "Nasi") => {
    const option = item.options.length > 0 ? opt : null;
    const exist = cart.find(x => x.id === item.id && x.option === option);
    if (exist) {
      setCart(cart.map(x => (x.id === item.id && x.option === option) ? {...exist, qty: exist.qty + 1} : x));
    } else {
      setCart([...cart, { ...item, qty: 1, option }]);
    }
  };

  const removeItem = (index) => {
    const newCart = [...cart];
    newCart.splice(index, 1);
    setCart(newCart);
  };

  const onCheckout = async () => {
    if (!noNota) return alert("Masukkan Nomor Nota!");
    setLoading(true);
    const subtotal = cart.reduce((a, c) => a + (c.price * c.qty), 0);
    const res = await saveOrder({ noNota, total: subtotal - diskon, method: "Tunai", kasir: user.username, cart });
    if (res.status === "OK") {
      alert("Transaksi Berhasil!");
      setCart([]); setNoNota(""); setDiskon(0); loadData();
    }
    setLoading(false);
  };

  const categories = ["Makanan", "Minuman", "Jajanan", "Extra"];
  const realOrders = db.orders.filter(o => o.kasir !== "admin");
  const totalOmzet = realOrders.reduce((a, c) => a + Number(c.total), 0);

  // LOGIN SCREEN
  if (!user) return (
    <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'linear-gradient(135deg, #2c3e50, #000)', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', padding: '40px', borderRadius: '24px', width: '350px', border: '1px solid rgba(255,255,255,0.2)', textAlign: 'center' }}>
        <h1 style={{ color: '#fff', fontSize: '28px', marginBottom: '10px', fontWeight: '800' }}>KEDAI RAME 23</h1>
        <p style={{ color: '#ccc', marginBottom: '30px' }}>Silakan masukkan PIN Kasir</p>
        <form onSubmit={handleLogin}>
          <input type="text" placeholder="Username" onChange={e => setLogin({...login, username: e.target.value})} style={{ width: '100%', padding: '15px', marginBottom: '15px', borderRadius: '12px', border: 'none', background: '#fff' }} />
          <input type="password" placeholder="PIN" onChange={e => setLogin({...login, pin: e.target.value})} style={{ width: '100%', padding: '15px', marginBottom: '25px', borderRadius: '12px', border: 'none', background: '#fff' }} />
          <button type="submit" style={{ width: '100%', padding: '15px', background: '#f1c40f', color: '#000', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}>MASUK</button>
        </form>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f0f2f5', fontFamily: 'Inter, sans-serif', overflow: 'hidden' }}>
      
      {/* SIDEBAR NAVIGATION */}
      <div style={{ width: '100px', background: '#fff', borderRight: '1px solid #e0e0e0', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 0' }}>
        <div style={{ width: '50px', height: '50px', background: '#f1c40f', borderRadius: '15px', marginBottom: '40px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold' }}>KR</div>
        {categories.map(cat => (
          <button key={cat} onClick={() => setActiveTab(cat)} style={{ background: 'none', border: 'none', marginBottom: '25px', color: activeTab === cat ? '#f1c40f' : '#95a5a6', cursor: 'pointer', transition: '0.3s' }}>
            <div style={{ fontSize: '12px', fontWeight: activeTab === cat ? 'bold' : 'normal' }}>{cat}</div>
          </button>
        ))}
        <button onClick={() => setUser(null)} style={{ marginTop: 'auto', background: '#fee2e2', border: 'none', padding: '10px', borderRadius: '10px', color: '#ef4444', cursor: 'pointer' }}>OFF</button>
      </div>

      {/* MAIN CONTENT: MENU */}
      <div style={{ flex: 2, padding: '30px', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '800' }}>Pilih Menu</h2>
            <p style={{ margin: 0, color: '#7f8c8d' }}>User: {user.username} | Shift: <span style={{ color: db.shiftStatus === 'OPEN' ? '#27ae60' : '#e74c3c' }}>{db.shiftStatus}</span></p>
          </div>
          {user.role === 'admin' && (
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => updateShiftStatus("OPEN").then(loadData)} style={{ background: '#27ae60', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '10px', cursor: 'pointer' }}>Buka Shift</button>
              <button onClick={() => updateShiftStatus("CLOSED").then(loadData)} style={{ background: '#e74c3c', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '10px', cursor: 'pointer' }}>Tutup Shift</button>
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' }}>
          {db.menu.filter(m => m.category === activeTab).map(m => (
            <div key={m.id} style={{ background: '#fff', borderRadius: '20px', padding: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', transition: '0.3s' }}>
              <div style={{ fontSize: '30px', marginBottom: '10px' }}>{m.img || '🥣'}</div>
              <div style={{ fontWeight: 'bold', fontSize: '16px', height: '40px', overflow: 'hidden' }}>{m.name}</div>
              <div style={{ color: '#27ae60', fontWeight: '800', margin: '10px 0' }}>Rp {m.price.toLocaleString()}</div>
              <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                {m.options.length > 0 ? m.options.map(o => (
                  <button key={o} onClick={() => addToCart(m, o)} style={{ flex: 1, padding: '8px', fontSize: '11px', background: '#f8f9fa', border: '1px solid #eee', borderRadius: '8px', cursor: 'pointer' }}>{o}</button>
                )) : (
                  <button onClick={() => addToCart(m)} style={{ width: '100%', padding: '8px', background: '#34495e', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Tambah</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT SIDE: CART / STRUK */}
      <div style={{ width: '400px', background: '#fff', borderLeft: '1px solid #e0e0e0', display: 'flex', flexDirection: 'column', padding: '30px' }}>
        <h3 style={{ marginTop: 0 }}>Keranjang Belanja</h3>
        <input 
          type="text" 
          placeholder="No. Nota / Antrian" 
          value={noNota} 
          onChange={e => setNoNota(e.target.value)} 
          style={{ width: '100%', padding: '15px', background: '#fff9c4', border: '2px solid #f1c40f', borderRadius: '12px', fontSize: '18px', fontWeight: 'bold', marginBottom: '20px', boxSizing: 'border-box' }} 
        />

        <div style={{ flex: 1, overflowY: 'auto', marginBottom: '20px' }}>
          {cart.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#bdc3c7', marginTop: '50px' }}>Belum ada item dipilih</p>
          ) : cart.map((item, idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{item.name}</div>
                <div style={{ fontSize: '12px', color: '#7f8c8d' }}>{item.option && `Pilihan: ${item.option}`} x{item.qty}</div>
              </div>
              <div style={{ fontWeight: 'bold', marginRight: '10px' }}>{(item.price * item.qty).toLocaleString()}</div>
              <button onClick={() => removeItem(idx)} style={{ color: '#e74c3c', border: 'none', background: 'none', cursor: 'pointer' }}>✕</button>
            </div>
          ))}
        </div>

        <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '15px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span>Subtotal</span>
            <span>Rp {cart.reduce((a, c) => a + (c.price * c.qty), 0).toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <span>Diskon Manual</span>
            <input type="number" value={diskon} onChange={e => setDiskon(Number(e.target.value))} style={{ width: '100px', textAlign: 'right', padding: '5px', border: '1px solid #ddd', borderRadius: '5px' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '22px', fontWeight: '800', color: '#27ae60' }}>
            <span>TOTAL</span>
            <span>Rp {(cart.reduce((a, c) => a + (c.price * c.qty), 0) - diskon).toLocaleString()}</span>
          </div>
        </div>

        <button 
          onClick={onCheckout} 
          disabled={loading || cart.length === 0}
          style={{ width: '100%', marginTop: '20px', padding: '20px', background: loading ? '#bdc3c7' : '#27ae60', color: '#fff', border: 'none', borderRadius: '15px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 10px 20px rgba(39, 174, 96, 0.2)' }}
        >
          {loading ? "MENYIMPAN..." : "BAYAR SEKARANG"}
        </button>

        {user.role === 'admin' && (
          <div style={{ marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '10px', fontSize: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: '#2980b9' }}>
              <span>Omzet Hari Ini:</span>
              <span>Rp {totalOmzet.toLocaleString()}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
