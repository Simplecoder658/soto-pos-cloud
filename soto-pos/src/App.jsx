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
    if (found) setUser(found); else alert("Login Gagal! PIN/User salah.");
  };

  const addToCart = (item, opt = "Lontong") => {
    let priceAdj = item.price; 
    if (opt === "Singkong") priceAdj -= 1000;
    if (opt === "Nasi") priceAdj += 1000;

    const optionLabel = item.options.length > 0 ? opt : null;
    const exist = cart.find(x => x.id === item.id && x.option === optionLabel);
    
    if (exist) {
      setCart(cart.map(x => (x.id === item.id && x.option === optionLabel) ? {...exist, qty: exist.qty + 1} : x));
    } else {
      setCart([...cart, { ...item, price: priceAdj, qty: 1, option: optionLabel }]);
    }
  };

  const onCheckout = async () => {
    if (!noNota) return alert("Isi No Nota!");
    setLoading(true);
    const subtotal = cart.reduce((a, c) => a + (c.price * c.qty), 0);
    const totalFinal = subtotal - diskon;
    const res = await saveOrder({ noNota, total: totalFinal, method: "Tunai", kasir: user.username, cart });
    if (res.status === "OK") {
      setLastOrder({ noNota, kasir: user.username, items: [...cart], subtotal, diskon, total: totalFinal, time: new Date().toLocaleString('id-ID') });
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
        <h2 style={{color: '#2d3748', marginBottom: '20px'}}>KEDAI RAME 23</h2>
        <form onSubmit={handleLogin}>
          <input type="text" placeholder="Username" onChange={e => setLogin({...login, username: e.target.value})} className="input-field" />
          <input type="password" placeholder="PIN" onChange={e => setLogin({...login, pin: e.target.value})} className="input-field" />
          <button type="submit" className="btn-login">MASUK</button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="app-container">
      {/* HEADER MOBILE */}
      <div className="mobile-header">
        <span><b>KR23</b> | {user.username}</span>
        <button onClick={() => setShowCartMobile(true)}>🛒 {cart.length}</button>
      </div>

      {/* SIDEBAR LAPTOP */}
      <div className="sidebar">
        <div className="logo-circle">KR</div>
        {["Makanan", "Minuman", "Jajanan", "Extra"].map(cat => (
          <button key={cat} className={activeTab === cat ? 'active' : ''} onClick={() => setActiveTab(cat)}>{cat}</button>
        ))}
        <button onClick={() => setUser(null)} className="btn-exit">OUT</button>
      </div>

      {/* MAIN CONTENT */}
      <div className="main-content">
        <div className="top-bar">
          <div className="mobile-tabs">
            {["Makanan", "Minuman", "Jajanan", "Extra"].map(cat => (
              <button key={cat} className={activeTab === cat ? 'active' : ''} onClick={() => setActiveTab(cat)}>{cat}</button>
            ))}
          </div>
          <div className="shift-badge">
            Shift: <b style={{color: db.shiftStatus === 'OPEN' ? '#38a169' : '#e53e3e'}}>{db.shiftStatus}</b>
          </div>
        </div>

        <div className="menu-grid">
          {db.menu.filter(m => m.category === activeTab).map(m => (
            <div key={m.id} className="menu-card">
              <span className="menu-emoji">{m.img || '🥣'}</span>
              <div className="menu-info">
                <p className="m-name">{m.name}</p>
                <p className="m-price">Rp {m.price.toLocaleString()}</p>
              </div>
              <div className="m-actions">
                {m.options.length > 0 ? (
                  <div className="opt-group">
                    {m.options.map(o => (
                      <button key={o} onClick={() => addToCart(m, o)} className={`btn-opt ${o}`}>
                        {o} <br/> <small>{o==='Nasi'?'+1k':o==='Singkong'?'-1k':'Ori'}</small>
                      </button>
                    ))}
                  </div>
                ) : <button onClick={() => addToCart(m)} className="btn-add">Tambah</button>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CART PANEL */}
      <div className={`cart-panel ${showCartMobile ? 'open' : ''}`}>
        <div className="cart-inner">
          <div className="cart-head">
            <h3>Keranjang</h3>
            <button className="btn-close-cart" onClick={() => setShowCartMobile(false)}>✕</button>
          </div>
          <input type="text" placeholder="No. Nota / Meja" value={noNota} onChange={e => setNoNota(e.target.value)} className="nota-input" />
          
          <div className="cart-list">
            {cart.map((item, i) => (
              <div key={i} className="cart-item">
                <div style={{flex: 1}}>
                  <p style={{margin:0, fontWeight:'bold', fontSize:'13px'}}>{item.name}</p>
                  <small>{item.option} x{item.qty}</small>
                </div>
                <b>{(item.price * item.qty).toLocaleString()}</b>
              </div>
            ))}
          </div>

          <div className="cart-footer">
            <div className="foot-row"><span>Total</span><b>Rp {(cart.reduce((a, c) => a + (c.price * c.qty), 0) - diskon).toLocaleString()}</b></div>
            <button onClick={onCheckout} disabled={loading || cart.length === 0} className="btn-pay">
              {loading ? "MEMPROSES..." : "KONFIRMASI BAYAR"}
            </button>
          </div>
        </div>
      </div>

      {/* STRUK MODAL */}
      {showReceipt && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div ref={printRef} className="thermal-print">
              <center>
                <h3>KEDAI RAME 23</h3>
                <small>Jl. Pesanggrahan No. 23</small>
                <p>-------------------------</p>
                <div style={{textAlign:'left'}}>
                  Nota: {lastOrder?.noNota}<br/>
                  Kasir: {lastOrder?.kasir}<br/>
                  {lastOrder?.time}
                </div>
                <p>-------------------------</p>
              </center>
              {lastOrder?.items.map((it, i) => (
                <div key={i} style={{display:'flex', justifyContent:'space-between', marginBottom:'4px'}}>
                  <span>{it.name} ({it.option}) x{it.qty}</span>
                  <span>{(it.price * it.qty).toLocaleString()}</span>
                </div>
              ))}
              <p>-------------------------</p>
              <div style={{display:'flex', justifyContent:'space-between'}}><span>TOTAL</span><b>Rp {lastOrder?.total.toLocaleString()}</b></div>
              <center><p>Terima Kasih!</p></center>
            </div>
            <div className="modal-actions">
              <button onClick={() => window.print()} className="btn-print">PRINT STRUK</button>
              <button onClick={handleClosePayment} className="btn-close-pay">SELESAI</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .app-container { display: flex; height: 100vh; background: #f7fafc; overflow: hidden; font-family: 'Inter', sans-serif; }
        .sidebar { width: 90px; background: #2d3748; display: flex; flex-direction: column; align-items: center; padding: 20px 0; gap: 20px; }
        .logo-circle { width: 50px; height: 50px; background: #ecc94b; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 900; }
        .sidebar button { background: none; border: none; color: #a0aec0; font-size: 11px; cursor: pointer; }
        .sidebar button.active { color: #ecc94b; font-weight: bold; }
        .btn-exit { margin-top: auto; color: #fc8181 !important; }
        
        .main-content { flex: 1; display: flex; flex-direction: column; padding: 20px; overflow-y: auto; }
        .top-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .menu-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 15px; }
        .menu-card { background: #fff; border-radius: 15px; padding: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); text-align: center; }
        .menu-emoji { font-size: 32px; }
        .m-name { font-weight: bold; font-size: 14px; margin: 10px 0 5px; height: 35px; overflow: hidden; }
        .m-price { color: #38a169; font-weight: bold; margin-bottom: 12px; }
        .opt-group { display: flex; gap: 4px; }
        .btn-opt { flex: 1; font-size: 9px; padding: 5px 0; border: 1px solid #e2e8f0; border-radius: 6px; cursor: pointer; background: #fff; }
        .btn-opt.Nasi { background: #fffaf0; }
        .btn-opt.Singkong { background: #f0fff4; }
        .btn-add { width: 100%; padding: 8px; background: #2d3748; color: #fff; border: none; border-radius: 8px; cursor: pointer; }

        .cart-panel { width: 350px; background: #fff; border-left: 1px solid #e2e8f0; transition: 0.3s; }
        .cart-inner { height: 100%; display: flex; flex-direction: column; padding: 20px; box-sizing: border-box; }
        .nota-input { width: 100%; padding: 15px; border: 2px solid #ecc94b; border-radius: 10px; font-size: 18px; font-weight: bold; margin-bottom: 15px; box-sizing: border-box; }
        .cart-list { flex: 1; overflow-y: auto; }
        .cart-item { display: flex; justify-content: space-between; border-bottom: 1px solid #f7fafc; padding: 10px 0; }
        .btn-pay { width: 100%; padding: 15px; background: #38a169; color: #fff; border: none; border-radius: 12px; font-weight: bold; font-size: 16px; cursor: pointer; }

        .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); display: flex; justify-content: center; align-items: center; z-index: 1000; }
        .modal-box { background: #fff; padding: 25px; border-radius: 20px; width: 300px; }
        .thermal-print { font-family: 'Courier New', monospace; font-size: 12px; margin-bottom: 20px; }
        .modal-actions { display: flex; gap: 10px; }
        .btn-print { flex: 2; padding: 12px; background: #3182ce; color: #fff; border: none; border-radius: 10px; cursor: pointer; }
        .btn-close-pay { flex: 1; padding: 12px; background: #e53e3e; color: #fff; border: none; border-radius: 10px; cursor: pointer; }

        .login-screen { height: 100vh; display: flex; justify-content: center; align-items: center; background: #1a202c; }
        .login-box { background: #fff; padding: 40px; border-radius: 24px; width: 300px; text-align: center; }
        .input-field { width: 100%; padding: 12px; margin-bottom: 12px; border: 1px solid #e2e8f0; border-radius: 10px; box-sizing: border-box; }
        .btn-login { width: 100%; padding: 12px; background: #ecc94b; border: none; border-radius: 10px; font-weight: bold; cursor: pointer; }

        .mobile-header, .btn-close-cart, .mobile-tabs { display: none; }

        @media (max-width: 768px) {
          .sidebar { display: none; }
          .mobile-header { display: flex; justify-content: space-between; padding: 15px 20px; background: #2d3748; color: #fff; align-items: center; }
          .mobile-tabs { display: flex; overflow-x: auto; gap: 10px; padding-bottom: 10px; flex: 1; }
          .mobile-tabs button { flex-shrink: 0; padding: 6px 15px; border-radius: 15px; border: 1px solid #ddd; background: #fff; font-size: 12px; }
          .mobile-tabs button.active { background: #ecc94b; border-color: #ecc94b; font-weight: bold; }
          .cart-panel { position: fixed; right: -100%; top: 0; height: 100%; width: 100%; z-index: 500; }
          .cart-panel.open { right: 0; }
          .btn-close-cart { display: block; background: #edf2f7; border: none; width: 35px; height: 35px; border-radius: 50%; }
          .cart-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
          .menu-grid { grid-template-columns: 1fr 1fr; }
        }
      `}</style>
    </div>
  );
}
