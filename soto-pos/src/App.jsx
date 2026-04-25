// App.jsx - FULL FIXED
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

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const data = await getInitialData();
    if (data && data.status === "SUCCESS") setDb(data);
  };

  const handleLogin = (e) => {
    e.preventDefault();
    const found = db.users.find(u => u.username === login.username && u.pin === login.pin);
    if (found) setUser(found); else alert("Login Gagal! Username atau PIN Salah.");
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

  const onCheckout = async () => {
    if (!noNota) return alert("Nomor Nota Kosong!");
    setLoading(true);
    const subtotal = cart.reduce((a, c) => a + (c.price * c.qty), 0);
    const res = await saveOrder({ noNota, total: subtotal - diskon, method: "Tunai", kasir: user.username, cart });
    if (res.status === "OK") {
      alert("Transaksi Berhasil!");
      setCart([]); setNoNota(""); setDiskon(0); loadData();
    }
    setLoading(false);
  };

  // Filter: Admin tidak masuk laporan omzet (Testing Mode)
  const realOrders = db.orders.filter(o => o.kasir !== "admin");
  const totalOmzet = realOrders.reduce((a, c) => a + Number(c.total), 0);

  if (!user) return (
    <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#2c3e50' }}>
      <form onSubmit={handleLogin} style={{ background: '#fff', padding: '30px', borderRadius: '15px', width: '300px' }}>
        <h2 style={{ textAlign: 'center' }}>SOTO POS LOGIN</h2>
        <input type="text" placeholder="Username" onChange={e => setLogin({...login, username: e.target.value})} style={{ width: '100%', padding: '10px', marginBottom: '10px' }} />
        <input type="password" placeholder="PIN" onChange={e => setLogin({...login, pin: e.target.value})} style={{ width: '100%', padding: '10px', marginBottom: '20px' }} />
        <button type="submit" style={{ width: '100%', padding: '10px', background: '#27ae60', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>MASUK</button>
      </form>
    </div>
  );

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', display: 'flex', gap: '20px', background: '#f4f7f6', minHeight: '100vh' }}>
      {/* KIRI: MENU */}
      <div style={{ flex: 2 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h3>MENU KEDAI RAME (Shift: {db.shiftStatus})</h3>
          <button onClick={() => setUser(null)} style={{ background: '#e74c3c', color: '#fff', border: 'none', padding: '5px 15px', borderRadius: '5px' }}>Logout</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px' }}>
          {db.menu.map(m => (
            <div key={m.id} style={{ background: '#fff', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
              <strong>{m.name}</strong> <br/> Rp {m.price.toLocaleString()} <br/>
              {m.options.length > 0 ? m.options.map(o => (
                <button key={o} onClick={() => addToCart(m, o)} style={{ fontSize: '10px', marginRight: '5px', marginTop: '10px' }}>+ {o}</button>
              )) : <button onClick={() => addToCart(m)} style={{ width: '100%', marginTop: '10px' }}>Tambah</button>}
            </div>
          ))}
        </div>
      </div>

      {/* KANAN: KASIR & ADMIN PANEL */}
      <div style={{ flex: 1.2 }}>
        {user.role === 'admin' && (
          <div style={{ background: '#fff', padding: '15px', borderRadius: '10px', marginBottom: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <h4 style={{ color: '#2980b9', margin: '0 0 10px 0' }}>ADMIN DASHBOARD</h4>
            <button onClick={async () => { await updateShiftStatus("OPEN"); loadData(); }}>Buka Shift</button>
            <button onClick={async () => { await updateShiftStatus("CLOSED"); loadData(); }} style={{ marginLeft: '10px' }}>Tutup Shift</button>
            <hr/>
            <p>Omzet Hari Ini (Kasir): <b>Rp {totalOmzet.toLocaleString()}</b></p>
            <div style={{ maxHeight: '150px', overflowY: 'auto', fontSize: '11px', background: '#f9f9f9', padding: '5px' }}>
              {realOrders.map((o, i) => <div key={i} style={{ borderBottom: '1px solid #ddd' }}>{o.noNota} | {o.kasir} | Rp {o.total.toLocaleString()}</div>)}
            </div>
          </div>
        )}

        <div style={{ background: '#fff', padding: '15px', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <h4>KASIR: {user.username.toUpperCase()}</h4>
          <input type="text" placeholder="No Nota" value={noNota} onChange={e => setNoNota(e.target.value)} style={{ width: '100%', padding: '10px', background: '#fff9c4', border: '1px solid #f1c40f', boxSizing: 'border-box' }} />
          <div style={{ minHeight: '150px', marginTop: '15px', borderBottom: '1px solid #eee' }}>
            {cart.map((c, i) => <div key={i} style={{ fontSize: '14px' }}>{c.name} {c.option && `(${c.option})`} x{c.qty}</div>)}
          </div>
          <div style={{ marginTop: '15px' }}>
            <span>Diskon Manual: </span>
            <input type="number" value={diskon} onChange={e => setDiskon(Number(e.target.value))} style={{ width: '80px', textAlign: 'right' }} />
          </div>
          <h3 style={{ color: '#27ae60' }}>TOTAL: Rp {(cart.reduce((a, c) => a + (c.price * c.qty), 0) - diskon).toLocaleString()}</h3>
          <button onClick={onCheckout} disabled={loading} style={{ width: '100%', padding: '15px', background: '#2c3e50', color: '#fff', fontWeight: 'bold', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
            {loading ? "MENYIMPAN..." : "KONFIRMASI SELESAI"}
          </button>
          {user.username === 'admin' && <p style={{ color: 'red', fontSize: '10px', marginTop: '10px' }}>* Mode Admin Aktif (Administrator/Testing)</p>}
        </div>
      </div>
    </div>
  );
}
