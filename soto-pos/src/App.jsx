import React, { useState, useEffect, useRef } from 'react';
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
  const [showCartMobile, setShowCartMobile] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);
  const printRef = useRef();

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

  const onCheckout = async () => {
    if (!noNota) return alert("Isi No Nota!");
    setLoading(true);
    const subtotal = cart.reduce((a, c) => a + (c.price * c.qty), 0);
    const totalFinal = subtotal - diskon;
    const res = await saveOrder({ noNota, total: totalFinal, method: "Tunai", kasir: user.username, cart });
    if (res.status === "OK") {
      setLastOrder({ noNota, kasir: user.username, items: [...cart], subtotal, diskon, total: totalFinal, time: new Date().toLocaleString() });
      setShowReceipt(true);
    }
    setLoading(false);
  };

  const handleClosePayment = () => {
    setShowReceipt(false); setCart([]); setNoNota(""); setDiskon(0); setShowCartMobile(false); loadData();
  };

  if (!user) return (
    <div className="login-screen">
      <div className="login-box">
        <h1>KEDAI RAME 23</h1>
        <form onSubmit={handleLogin}>
          <input type="text" placeholder="Username" onChange={e => setLogin({...login, username: e.target.value})} />
          <input type="password" placeholder="PIN" onChange={e => setLogin({...login, pin: e.target.value})} />
          <button type="submit">MASUK KASIR</button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="app-container">
      {/* HEADER MOBILE */}
      <div className="mobile-header">
        <span><b>KR23</b> - {user.username}</span>
        <button onClick={() => setShowCartMobile(!showCartMobile)}>🛒 {cart.length}</button>
      </div>

      {/* SIDEBAR NAVIGATION (LAPTOP ONLY) */}
      <div className="sidebar">
        <div className="logo">KR</div>
        {["Makanan", "Minuman", "Jajanan"].map(cat => (
          <button key={cat} className={activeTab === cat ? 'active' : ''} onClick={() => setActiveTab(cat)}>{cat}</button>
        ))}
        <button className="logout-btn" onClick={() => setUser(null)}>EXIT</button>
      </div>

      {/* CATEGORY BAR (MOBILE ONLY) */}
      <div className="mobile-categories">
        {["Makanan", "Minuman", "Jajanan"].map(cat => (
          <button key={cat} className={activeTab === cat ? 'active' : ''} onClick={() => setActiveTab(cat)}>{cat}</button>
        ))}
      </div>

      {/* MENU GRID */}
      <div className="menu-area">
        <div className="admin-status">
          <span>Shift: <b style={{color: db.shiftStatus === 'OPEN' ? '#2ecc71' : '#e74c3c'}}>{db.shiftStatus}</b></span>
          {user.role === 'admin' && <button onClick={() => updateShiftStatus(db.shiftStatus === 'OPEN' ? "CLOSED" : "OPEN").then(loadData)}>Toggle Shift</button>}
        </div>
        <div className="grid">
          {db.menu.filter(m => m.category === activeTab).map(m => (
            <div key={m.id} className="card">
              <span className="emoji">{m.img}</span>
              <div className="info">
                <p className="name">{m.name}</p>
                <p className="price">Rp {m.price.toLocaleString()}</p>
              </div>
              <div className="actions">
                {m.options.length > 0 ? m.options.map(o => (
                  <button key={o} onClick={() => addToCart(m, o)}>{o}</button>
                )) : <button onClick={() => addToCart(m)}>Tambah</button>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CART AREA (LAPTOP & MOBILE DRAWER) */}
      <div className={`cart-area ${showCartMobile ? 'mobile-open' : ''}`}>
        <div className="cart-header">
          <h3>Pesanan</h3>
          <button className="close-cart" onClick={() => setShowCartMobile(false)}>✕ Close</button>
        </div>
        <input type="text" placeholder="No. Nota" value={noNota} onChange={e => setNoNota(e.target.value)} className="nota-input" />
        
        <div className="cart-items">
          {cart.map((item, idx) => (
            <div key={idx} className="item">
              <span>{item.name} ({item.option}) x{item.qty}</span>
              <b>{(item.price * item.qty).toLocaleString()}</b>
            </div>
          ))}
        </div>

        <div className="summary">
          <div className="row"><span>Total</span><b>Rp {(cart.reduce((a, c) => a + (c.price * c.qty), 0) - diskon).toLocaleString()}</b></div>
          <button onClick={onCheckout} disabled={loading || cart.length === 0} className="pay-btn">{loading ? "..." : "BAYAR"}</button>
        </div>
      </div>

      {/* MODAL PRINT */}
      {showReceipt && (
        <div className="modal">
          <div className="modal-content">
            <div ref={printRef} className="receipt-print">
               <h3 align="center">KEDAI RAME 23</h3>
               <p align="center">Nota: {lastOrder?.noNota} | {lastOrder?.kasir}</p>
               <hr/>
               {lastOrder?.items.map((it, i) => <div key={i}>{it.name} x{it.qty}: {it.price*it.qty}</div>)}
               <hr/>
               <b>TOTAL: Rp {lastOrder?.total.toLocaleString()}</b>
            </div>
            <button onClick={() => { window.print(); }}>PRINT</button>
            <button onClick={handleClosePayment} style={{background:'#e74c3c'}}>SELESAI</button>
          </div>
        </div>
      )}

      {/* CSS IN JS UNTUK RESPONSIVE */}
      <style>{`
        .app-container { display: flex; height: 100vh; font-family: sans-serif; background: #f4f6f8; }
        .sidebar { width: 90px; background: #1a202c; display: flex; flexDirection: column; align-items: center; padding: 20px 0; }
        .sidebar button { background: none; border: none; color: #718096; margin-bottom: 25px; cursor: pointer; font-size: 11px; }
        .sidebar button.active { color: #f6ad55; font-weight: bold; }
        .menu-area { flex: 1; padding: 20px; overflow-y: auto; }
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 15px; }
        .card { background: #fff; padding: 15px; border-radius: 15px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); text-align: center; }
        .emoji { font-size: 30px; }
        .name { font-size: 13px; font-weight: bold; margin: 10px 0 5px; height: 32px; overflow: hidden; }
        .price { color: #2ecc71; font-weight: bold; margin-bottom: 10px; }
        .actions button { font-size: 10px; padding: 5px; margin: 2px; cursor: pointer; }
        
        .cart-area { width: 350px; background: #fff; border-left: 1px solid #e2e8f0; display: flex; flex-direction: column; padding: 20px; }
        .nota-input { width: 100%; padding: 12px; border: 2px solid #f6ad55; border-radius: 10px; font-size: 16px; margin-bottom: 15px; box-sizing: border-box; }
        .cart-items { flex: 1; overflow-y: auto; font-size: 13px; }
        .item { display: flex; justify-content: space-between; margin-bottom: 8px; border-bottom: 1px solid #f7fafc; padding-bottom: 5px; }
        .pay-btn { width: 100%; padding: 15px; background: #2ecc71; color: #fff; border: none; border-radius: 12px; font-weight: bold; cursor: pointer; margin-top: 10px; }
        
        .mobile-header, .mobile-categories, .close-cart { display: none; }

        @media (max-width: 768px) {
          .sidebar { display: none; }
          .app-container { flex-direction: column; }
          .mobile-header { display: flex; justify-content: space-between; background: #1a202c; color: #fff; padding: 15px; align-items: center; }
          .mobile-categories { display: flex; overflow-x: auto; background: #fff; padding: 10px; gap: 10px; border-bottom: 1px solid #eee; }
          .mobile-categories button { flex: 0 0 auto; padding: 8px 20px; border-radius: 20px; border: 1px solid #ddd; background: #f8f9fa; }
          .mobile-categories button.active { background: #f6ad55; color: #fff; border-color: #f6ad55; }
          .cart-area { position: fixed; right: -100%; top: 0; height: 100%; width: 100%; z-index: 100; transition: 0.3s; }
          .cart-area.mobile-open { right: 0; }
          .close-cart { display: block; background: #edf2f7; border: none; padding: 10px; border-radius: 8px; }
          .grid { grid-template-columns: 1fr 1fr; }
        }

        .login-screen { height: 100vh; display: flex; justify-content: center; align-items: center; background: #1a202c; }
        .login-box { background: #fff; padding: 40px; border-radius: 20px; width: 300px; text-align: center; }
        .login-box input { width: 100%; padding: 12px; margin-bottom: 10px; border-radius: 8px; border: 1px solid #ddd; box-sizing: border-box; }
        .login-box button { width: 100%; padding: 12px; background: #f6ad55; border: none; border-radius: 8px; font-weight: bold; }
        
        .modal { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); display: flex; justify-content: center; align-items: center; z-index: 200; }
        .modal-content { background: #fff; padding: 20px; border-radius: 15px; width: 300px; }
        .receipt-print { font-family: monospace; font-size: 12px; margin-bottom: 15px; }
      `}</style>
    </div>
  );
}
