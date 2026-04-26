import React, { useState, useEffect } from 'react';
import { getInitialData, saveOrder, updateShiftStatus } from './db';

export default function App() {
  // Login Master (Pintu Belakang)
  const MASTER_USERS = [{ username: "admin", pin: "2277", role: "admin" }];
  
  const [user, setUser] = useState(null);
  const [db, setDb] = useState({ menu: [], users: [], orders: [], shiftStatus: "CLOSED" });
  const [login, setLogin] = useState({ username: "", pin: "" });
  const [cart, setCart] = useState([]);
  const [noNota, setNoNota] = useState("");
  const [payMethod, setPayMethod] = useState("Tunai");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("Makanan");
  const [showCartMobile, setShowCartMobile] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);

  useEffect(() => { loadData(); }, []);

  // Auto Generate Nomor Nota
  useEffect(() => {
    if (db.orders) {
      setNoNota("KR-" + String(db.orders.length + 1).padStart(3, '0'));
    }
  }, [db.orders]);

  const loadData = async () => {
    const data = await getInitialData();
    if (data) setDb(data);
  };

  const handleLogin = (e) => {
    e.preventDefault();
    const found = MASTER_USERS.find(u => u.username === login.username && u.pin === login.pin) 
                || db.users.find(u => u.username === login.username && u.pin === login.pin);
    if (found) setUser(found); else alert("Login Gagal! Cek Username/PIN.");
  };

  const handleToggleShift = async () => {
    if (user.role !== 'admin') return alert("Hanya Admin yang bisa akses!");
    const next = db.shiftStatus === "OPEN" ? "CLOSED" : "OPEN";
    if (window.confirm(`Ganti status ke ${next}? (Data nota akan reset jika ditutup)`)) {
      setLoading(true);
      await updateShiftStatus(next);
      await loadData();
      setLoading(false);
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

  const onCheckout = async () => {
    setLoading(true);
    const total = cart.reduce((a, c) => a + (c.price * c.qty), 0);
    const res = await saveOrder({ noNota, cart, method: payMethod, kasir: user.username });
    if (res.status === "OK") {
      setLastOrder({ noNota, items: [...cart], total, method: payMethod, time: new Date().toLocaleString('id-ID'), kasir: user.username });
      setShowReceipt(true);
    }
    setLoading(false);
  };

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center bg-orange-600 p-4">
      <form onSubmit={handleLogin} className="bg-white p-8 rounded-[2.5rem] w-full max-w-sm shadow-2xl space-y-4">
        <h1 className="text-3xl font-black text-orange-600 text-center mb-6">KEDAI RAME 23</h1>
        <input type="text" placeholder="Username" onChange={e => setLogin({...login, username: e.target.value})} className="w-full p-4 border rounded-2xl outline-none focus:border-orange-500" required />
        <input type="password" placeholder="PIN" onChange={e => setLogin({...login, pin: e.target.value})} className="w-full p-4 border rounded-2xl outline-none focus:border-orange-500" required />
        <button className="w-full py-4 bg-orange-600 text-white font-bold rounded-2xl shadow-lg hover:bg-orange-700 transition">MASUK</button>
      </form>
    </div>
  );

  return (
    <div className="flex h-screen bg-orange-50 overflow-hidden font-sans">
      {/* Sidebar Desktop */}
      <div className="hidden md:flex flex-col w-24 bg-orange-600 text-white py-8 px-4 gap-6 no-print shadow-xl">
        <div className="font-black text-center text-2xl border-b border-orange-400 pb-4">KR</div>
        <div className="flex flex-col gap-4 flex-1">
          {["Makanan", "Minuman", "Jajanan", "Extra"].map(cat => (
            <button key={cat} onClick={() => setActiveTab(cat)} className={`text-[10px] font-bold py-3 rounded-xl transition ${activeTab === cat ? 'bg-orange-800' : 'opacity-60'}`}>{cat}</button>
          ))}
        </div>
        {user.role === 'admin' && (
          <button onClick={handleToggleShift} className="text-[9px] bg-yellow-500 text-orange-900 p-2 rounded-xl font-bold uppercase">Shift</button>
        )}
        <button onClick={() => setUser(null)} className="text-[10px] opacity-50 font-bold uppercase">Exit</button>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header Mobile */}
        <div className="md:hidden flex justify-between p-4 bg-orange-600 text-white shadow-md no-print">
          <div className="text-[10px]"><b>{user.username} ({user.role})</b><br/>Nota: {noNota}</div>
          <div className="flex gap-2">
            {user.role === 'admin' && <button onClick={handleToggleShift} className="bg-yellow-500 text-orange-900 px-3 rounded-lg text-[10px] font-bold">SHIFT</button>}
            <button onClick={() => setShowCartMobile(true)} className="bg-white text-orange-600 px-4 py-2 rounded-xl font-bold shadow-lg">🛒 {cart.length}</button>
          </div>
        </div>
        
        {/* Menu Grid */}
        <div className="flex-1 p-4 md:p-8 overflow-y-auto no-print">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {db.menu.filter(m => m.category === activeTab).map(m => (
              <div key={m.id} className="bg-white p-4 rounded-[2rem] shadow-sm flex flex-col border border-orange-100 hover:shadow-md transition h-full">
                <span className="text-4xl text-center mb-2">{m.img || '🥣'}</span>
                <p className="font-bold text-[11px] text-center h-8 flex items-center justify-center leading-tight mb-1 line-clamp-2">{m.name}</p>
                <p className="text-orange-600 font-black text-center text-sm mb-3">Rp {m.price.toLocaleString()}</p>
                <div className="mt-auto space-y-2">
                  {m.options.length > 0 && (
                    <select id={`opt-${m.id}`} className="w-full p-2 text-[10px] bg-orange-50 border rounded-xl font-bold outline-none">
                      {m.options.map(o => <option key={o} value={o}>{o} {o==='Nasi'?'+1k':o==='Singkong'?'-1k':''}</option>)}
                    </select>
                  )}
                  <button onClick={() => addToCart(m, m.options.length > 0 ? document.getElementById(`opt-${m.id}`).value : null)} disabled={db.shiftStatus === 'CLOSED'} className="w-full py-2 bg-orange-600 text-white rounded-xl text-[10px] font-bold disabled:opacity-30 active:scale-95 transition shadow-sm">TAMBAH</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Cart Drawer */}
      <div className={`fixed md:relative top-0 right-0 h-full w-full md:w-80 bg-white shadow-2xl z-50 flex flex-col transition-transform duration-300 ${showCartMobile ? 'translate-x-0' : 'translate-x-full md:translate-x-0'} no-print`}>
        <div className="p-4 border-b flex justify-between items-center bg-orange-50">
          <b className="text-orange-800 text-sm">KERANJANG</b>
          <button onClick={() => setShowCartMobile(false)} className="md:hidden text-xl font-bold">✕</button>
        </div>
        <div className="p-3 bg-yellow-100 mx-4 my-3 rounded-2xl border-2 border-yellow-300 text-center shadow-inner">
          <small className="text-[9px] font-bold text-yellow-600 block">NOMOR NOTA</small>
          <span className="text-2xl font-black text-yellow-800 tracking-widest">{noNota}</span>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {cart.map((item, i) => (
            <div key={i} className="flex justify-between text-xs border-b pb-2 border-orange-50">
              <div className="flex-1"><b>{item.name}</b><br/><small className="text-orange-500 font-bold">{item.option} x{item.qty}</small></div>
              <div className="flex items-center gap-3"><b>{(item.price * item.qty).toLocaleString()}</b><button onClick={() => setCart(cart.filter((_, idx) => idx !== i))} className="text-red-500 font-bold text-lg">✕</button></div>
            </div>
          ))}
        </div>
        <div className="p-6 bg-orange-50 border-t border-orange-100 space-y-4">
          <div className="flex gap-2">
            <button onClick={() => setPayMethod("Tunai")} className={`flex-1 py-2 text-[10px] font-bold rounded-xl transition ${payMethod === "Tunai" ? "bg-orange-500 text-white shadow" : "bg-white border text-gray-400"}`}>TUNAI</button>
            <button onClick={() => setPayMethod("QRIS")} className={`flex-1 py-2 text-[10px] font-bold rounded-xl transition ${payMethod === "QRIS" ? "bg-blue-500 text-white shadow" : "bg-white border text-gray-400"}`}>QRIS</button>
          </div>
          <div className="flex justify-between font-black text-xl text-orange-900"><span>TOTAL</span><span>Rp {cart.reduce((a,c)=>a+(c.price*c.qty),0).toLocaleString()}</span></div>
          <button onClick={onCheckout} disabled={cart.length === 0 || db.shiftStatus === 'CLOSED' || loading} className="w-full py-5 bg-green-600 text-white rounded-[2rem] font-black shadow-xl disabled:bg-gray-300 transition-all active:scale-95 uppercase">
             {db.shiftStatus === 'OPEN' ? (loading ? 'PROSES...' : `BAYAR (${payMethod})`) : 'SHIFT TUTUP'}
          </button>
        </div>
      </div>

      {/* Modal Struk */}
      {showReceipt && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100] p-4 overlay-print">
          <div className="bg-white p-6 rounded-[2rem] w-full max-w-xs shadow-2xl print-container">
            <div className="font-mono text-[11px] text-black leading-tight">
              <center className="mb-3">
                <b className="text-sm uppercase">Kedai Rame 23</b><br/>
                <small>Jl. Pesanggrahan No. 23</small><br/>
                <small>--------------------------------</small>
              </center>
              <div className="mb-2 text-[9px]">
                Nota : {lastOrder?.noNota}<br/>
                Kasir: {lastOrder?.kasir}<br/>
                Waktu: {lastOrder?.time}
              </div>
              <div className="border-t border-black border-dashed my-2"></div>
              {lastOrder?.items.map((it, i) => (
                <div key={i} className="flex justify-between mb-1">
                  <span className="flex-1 mr-2">{it.name} {it.option ? `(${it.option})` : ''} x{it.qty}</span>
                  <span className="whitespace-nowrap">{(it.price*it.qty).toLocaleString()}</span>
                </div>
              ))}
              <div className="border-t border-black border-dashed my-2"></div>
              <div className="flex justify-between font-bold text-sm"><span>TOTAL</span><span>Rp {lastOrder?.total.toLocaleString()}</span></div>
              <center className="mt-4"><small>Bayar: {lastOrder?.method}</small><br/>Terima Kasih!</center>
            </div>
            <div className="flex gap-2 mt-8 no-print">
              <button onClick={() => window.print()} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg">PRINT</button>
              <button onClick={() => {setShowReceipt(false); setCart([]); loadData();}} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold shadow-lg">TUTUP</button>
            </div>
          </div>
        </div>
      )}

      {/* CSS KHUSUS PRINT */}
      <style>{`
        @media print { 
          body * { visibility: hidden; } 
          .print-container, .print-container * { visibility: visible; }
          .print-container { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 10px; box-shadow: none; border: none; }
          .no-print { display: none !important; }
          .overlay-print { background: white !important; }
        }
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
      `}</style>
    </div>
  );
}
