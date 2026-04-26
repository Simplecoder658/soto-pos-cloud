import React, { useState, useEffect } from 'react';
import { getInitialData, saveOrder, updateShiftStatus } from './db';

export default function App() {
  // Login Master (Pintu Belakang)
  const MASTER_USERS = [{ username: "admin", pin: "2277", role: "admin" }];
  
  const [user, setUser] = useState(null);
  const [db, setDb] = useState({ menu: [], users: [], orders: [], shiftStatus: "CLOSED" });
  const [login, setLogin] = useState({ username: "", pin: "" });
  const [cart, setCart] = useState([]);
  const [noNota, setNoNota] = useState("KR-001");
  const [payMethod, setPayMethod] = useState("Tunai");
  const [loading, setLoading] = useState(true); // Mulai dengan loading
  const [activeTab, setActiveTab] = useState("Makanan");
  const [showCartMobile, setShowCartMobile] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);

  // Load data pertama kali
  useEffect(() => { 
    refreshData(); 
  }, []);

  // Update nomor nota setiap kali data orders berubah
  useEffect(() => {
    if (db.orders) {
      const nextNum = db.orders.length + 1;
      setNoNota("KR-" + String(nextNum).padStart(3, '0'));
    }
  }, [db.orders]);

  const refreshData = async () => {
    setLoading(true);
    const data = await getInitialData();
    if (data && data.status === "SUCCESS") {
      setDb(data);
    } else {
      console.error("Gagal mengambil data dari GS");
    }
    setLoading(false);
  };

  const handleLogin = (e) => {
    e.preventDefault();
    // Cari user di master atau di database GS
    const found = MASTER_USERS.find(u => u.username === login.username && u.pin === login.pin) 
                || (db.users && db.users.find(u => u.username === login.username && u.pin === login.pin));
    
    if (found) {
      setUser(found);
    } else {
      alert("Login Gagal! Cek Username/PIN.");
    }
  };

  const handleToggleShift = async () => {
    if (user?.role !== 'admin') return;
    const next = db.shiftStatus === "OPEN" ? "CLOSED" : "OPEN";
    if (window.confirm(`Ganti status ke ${next}?`)) {
      setLoading(true);
      await updateShiftStatus(next);
      await refreshData();
    }
  };

  const addToCart = (item, opt) => {
    let p = item.price;
    if (opt === "Singkong") p -= 1000; else if (opt === "Nasi") p += 1000;
    const label = item.options.length > 0 ? (opt || item.options[0]) : null;
    const ex = cart.find(x => x.id === item.id && x.option === label);
    if (ex) {
      setCart(cart.map(x => (x.id === item.id && x.option === label) ? {...ex, qty: ex.qty + 1} : x));
    } else {
      setCart([...cart, { ...item, price: p, qty: 1, option: label }]);
    }
  };

  // Tampilan Loading jika data belum siap
  if (loading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-orange-600 text-white font-bold">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-2">🥣</div>
          <p>LAGI LOADING DATA...</p>
        </div>
      </div>
    );
  }

  // Tampilan Login
  if (!user) return (
    <div className="min-h-screen flex items-center justify-center bg-orange-600 p-4">
      <form onSubmit={handleLogin} className="bg-white p-8 rounded-[2.5rem] w-full max-w-sm shadow-2xl space-y-4">
        <h1 className="text-3xl font-black text-orange-600 text-center mb-6">KEDAI RAME 23</h1>
        <input type="text" placeholder="Username" onChange={e => setLogin({...login, username: e.target.value})} className="w-full p-4 border rounded-2xl outline-none" required />
        <input type="password" placeholder="PIN" onChange={e => setLogin({...login, pin: e.target.value})} className="w-full p-4 border rounded-2xl outline-none" required />
        <button className="w-full py-4 bg-orange-600 text-white font-bold rounded-2xl shadow-lg">MASUK</button>
      </form>
    </div>
  );

  // Tampilan Utama Kasir
  return (
    <div className="flex h-screen bg-orange-50 overflow-hidden font-sans">
      {/* Sidebar Desktop */}
      <div className="hidden md:flex flex-col w-24 bg-orange-600 text-white py-8 px-2 gap-6 no-print shadow-xl">
        <div className="font-black text-center text-2xl border-b border-orange-400 pb-4">KR</div>
        {["Makanan", "Minuman", "Jajanan", "Extra"].map(cat => (
          <button key={cat} onClick={() => setActiveTab(cat)} className={`text-[10px] font-bold py-3 rounded-xl ${activeTab === cat ? 'bg-orange-800' : 'opacity-60'}`}>{cat}</button>
        ))}
        {user.role === 'admin' && (
          <button onClick={handleToggleShift} className="mt-auto text-[9px] bg-yellow-500 text-orange-900 p-2 rounded-xl font-bold uppercase">Shift</button>
        )}
        <button onClick={() => setUser(null)} className="text-[10px] opacity-50 font-bold uppercase mt-2">Exit</button>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header Mobile */}
        <div className="md:hidden flex justify-between p-4 bg-orange-600 text-white no-print">
          <div className="text-[10px]"><b>{user.username}</b><br/>Nota: {noNota}</div>
          <button onClick={() => setShowCartMobile(true)} className="bg-white text-orange-600 px-4 py-2 rounded-xl font-bold">🛒 {cart.length}</button>
        </div>
        
        {/* Menu Grid */}
        <div className="flex-1 p-4 overflow-y-auto no-print">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {db.menu && db.menu.filter(m => m.category === activeTab).map(m => (
              <div key={m.id} className="bg-white p-3 rounded-[2rem] shadow-sm flex flex-col border border-orange-100">
                <span className="text-3xl text-center mb-1">{m.img || '🥣'}</span>
                <p className="font-bold text-[11px] text-center h-8 flex items-center justify-center leading-tight mb-1">{m.name}</p>
                <p className="text-orange-600 font-black text-center text-xs mb-2">Rp {m.price.toLocaleString()}</p>
                <div className="mt-auto space-y-2">
                  {m.options && m.options.length > 0 && (
                    <select id={`opt-${m.id}`} className="w-full p-2 text-[10px] bg-orange-50 border rounded-xl font-bold">
                      {m.options.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  )}
                  <button 
                    onClick={() => {
                      const optVal = m.options.length > 0 ? document.getElementById(`opt-${m.id}`).value : null;
                      addToCart(m, optVal);
                    }} 
                    disabled={db.shiftStatus === 'CLOSED'} 
                    className="w-full py-2 bg-orange-600 text-white rounded-xl text-[10px] font-bold disabled:opacity-30"
                  >
                    TAMBAH
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Cart Drawer */}
      <div className={`fixed md:relative top-0 right-0 h-full w-full md:w-80 bg-white shadow-2xl z-50 flex flex-col transition-transform ${showCartMobile ? 'translate-x-0' : 'translate-x-full md:translate-x-0'} no-print`}>
        <div className="p-4 border-b flex justify-between items-center bg-orange-50">
          <b className="text-orange-800 text-sm tracking-widest">PESANAN</b>
          <button onClick={() => setShowCartMobile(false)} className="md:hidden font-bold">✕</button>
        </div>
        <div className="p-4 bg-yellow-100 mx-4 my-4 rounded-2xl border-2 border-yellow-400 text-center shadow-sm">
          <span className="text-2xl font-black text-yellow-800">{noNota}</span>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.map((item, i) => (
            <div key={i} className="flex justify-between text-xs border-b pb-2">
              <div className="flex-1"><b>{item.name}</b><br/><small className="text-orange-500 font-bold">{item.option} x{item.qty}</small></div>
              <div className="flex items-center gap-2"><b>{(item.price * item.qty).toLocaleString()}</b><button onClick={() => setCart(cart.filter((_, idx) => idx !== i))} className="text-red-500 font-bold">✕</button></div>
            </div>
          ))}
        </div>
        <div className="p-4 bg-orange-50 border-t space-y-4">
          <div className="flex gap-2">
            <button onClick={() => setPayMethod("Tunai")} className={`flex-1 py-2 text-[10px] font-bold rounded-lg ${payMethod === "Tunai" ? "bg-orange-500 text-white" : "bg-white border"}`}>TUNAI</button>
            <button onClick={() => setPayMethod("QRIS")} className={`flex-1 py-2 text-[10px] font-bold rounded-lg ${payMethod === "QRIS" ? "bg-blue-500 text-white" : "bg-white border"}`}>QRIS</button>
          </div>
          <div className="flex justify-between font-black text-lg"><span>TOTAL</span><span>Rp {cart.reduce((a,c)=>a+(c.price*c.qty),0).toLocaleString()}</span></div>
          <button 
            onClick={async () => {
              setLoading(true);
              const res = await saveOrder({ noNota, cart, method: payMethod, kasir: user.username });
              if (res.status === "OK") {
                setLastOrder({ noNota, items: [...cart], total: cart.reduce((a,c)=>a+(c.price*c.qty),0), method: payMethod, time: new Date().toLocaleString(), kasir: user.username });
                setShowReceipt(true);
              }
              setLoading(false);
            }} 
            disabled={cart.length === 0 || db.shiftStatus === 'CLOSED' || loading} 
            className="w-full py-4 bg-green-600 text-white rounded-2xl font-black disabled:opacity-50"
          >
             {db.shiftStatus === 'OPEN' ? `BAYAR (${payMethod})` : 'SHIFT TUTUP'}
          </button>
        </div>
      </div>

      {/* Modal Receipt */}
      {showReceipt && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 overlay-print">
          <div className="bg-white p-6 rounded-3xl w-full max-w-xs print-container shadow-2xl">
            <div className="font-mono text-[11px] text-black">
              <center className="mb-2"><b>KEDAI RAME 23</b><br/><small>{lastOrder?.time}</small></center>
              <div className="border-t border-black border-dashed my-2"></div>
              {lastOrder?.items.map((it, i) => (
                <div key={i} className="flex justify-between mb-1">
                  <span>{it.name} {it.option ? `(${it.option})` : ''} x{it.qty}</span>
                  <span>{(it.price*it.qty).toLocaleString()}</span>
                </div>
              ))}
              <div className="border-t border-black border-dashed my-2"></div>
              <div className="flex justify-between font-bold text-sm"><span>TOTAL</span><span>Rp {lastOrder?.total.toLocaleString()}</span></div>
              <center className="mt-4">Terima Kasih!</center>
            </div>
            <div className="flex gap-2 mt-6 no-print">
              <button onClick={() => window.print()} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold">PRINT</button>
              <button onClick={() => {setShowReceipt(false); setCart([]); refreshData();}} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold">TUTUP</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media print { body * { visibility: hidden; } .print-container, .print-container * { visibility: visible; }
        .print-container { position: absolute; left: 0; top: 0; width: 100%; } .no-print { display: none !important; } }
      `}</style>
    </div>
  );
}
