import React, { useState, useEffect } from 'react';
import { getInitialData, saveOrder, updateShiftStatus } from './db';

export default function App() {
  // Akun Master cadangan jika data GS belum load
  const MASTER_USERS = [{ username: "admin", pin: "2277", role: "admin" }];
  
  const [user, setUser] = useState(null);
  const [db, setDb] = useState({ menu: [], users: [], orders: [], shiftStatus: "CLOSED" });
  const [login, setLogin] = useState({ username: "", pin: "" });
  const [cart, setCart] = useState([]);
  const [noNota, setNoNota] = useState("KR-001");
  const [payMethod, setPayMethod] = useState("Tunai");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Makanan");
  const [showCartMobile, setShowCartMobile] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);

  // 1. Load data dari Google Sheets saat aplikasi dibuka
  useEffect(() => { 
    refreshData(); 
  }, []);

  // 2. Update nomor nota otomatis setiap ada perubahan data pesanan
  useEffect(() => {
    if (db.orders) {
      const nextNum = db.orders.length + 1;
      setNoNota("KR-" + String(nextNum).padStart(3, '0'));
    }
  }, [db.orders]);

  const refreshData = async () => {
    setLoading(true);
    const res = await getInitialData();
    if (res && res.status === "SUCCESS") {
      setDb(res);
    }
    setLoading(false);
  };

  const handleLogin = (e) => {
    e.preventDefault();
    const found = MASTER_USERS.find(u => u.username === login.username && u.pin === login.pin) 
                || (db.users && db.users.find(u => u.username === login.username && u.pin === login.pin));
    
    if (found) {
      setUser(found);
    } else {
      alert("Login Gagal! Username atau PIN salah.");
    }
  };

  const handleToggleShift = async () => {
    if (user.role !== 'admin') return;
    const nextStatus = db.shiftStatus === "OPEN" ? "CLOSED" : "OPEN";
    if (window.confirm(`Ganti status shift menjadi ${nextStatus}?`)) {
      setLoading(true);
      await updateShiftStatus(nextStatus);
      await refreshData();
    }
  };

  const addToCart = (item, opt) => {
    let p = item.price;
    // Logika penyesuaian harga berdasarkan opsi (jika ada)
    if (opt === "Singkong") p -= 1000; 
    else if (opt === "Nasi") p += 1000;

    const label = item.options && item.options.length > 0 ? (opt || item.options[0]) : null;
    const existingItem = cart.find(x => x.id === item.id && x.option === label);

    if (existingItem) {
      setCart(cart.map(x => (x.id === item.id && x.option === label) ? {...existingItem, qty: existingItem.qty + 1} : x));
    } else {
      setCart([...cart, { ...item, price: p, qty: 1, option: label }]);
    }
  };

  const onCheckout = async () => {
    setLoading(true);
    const total = cart.reduce((a, c) => a + (c.price * c.qty), 0);
    const res = await saveOrder({ noNota, cart, method: payMethod, kasir: user.username });
    
    if (res.status === "OK") {
      setLastOrder({ 
        noNota, 
        items: [...cart], 
        total, 
        method: payMethod, 
        time: new Date().toLocaleString('id-ID'), 
        kasir: user.username 
      });
      setShowReceipt(true);
    } else {
      alert("Gagal menyimpan pesanan!");
    }
    setLoading(false);
  };

  // Layar Loading Awal
  if (loading && !user) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-orange-600 text-white font-black">
      <div className="text-5xl animate-bounce mb-4">🍲</div>
      <p className="tracking-widest">MEMUAT DATA KEDAI RAME...</p>
    </div>
  );

  // Layar Login
  if (!user) return (
    <div className="min-h-screen flex items-center justify-center bg-orange-600 p-4">
      <form onSubmit={handleLogin} className="bg-white p-8 rounded-[2.5rem] w-full max-w-sm shadow-2xl space-y-4">
        <h1 className="text-3xl font-black text-orange-600 text-center mb-6 leading-tight">KEDAI RAME 23</h1>
        <input type="text" placeholder="Username" onChange={e => setLogin({...login, username: e.target.value})} className="w-full p-4 border rounded-2xl outline-none focus:border-orange-500" required />
        <input type="password" placeholder="PIN" onChange={e => setLogin({...login, pin: e.target.value})} className="w-full p-4 border rounded-2xl outline-none focus:border-orange-500" required />
        <button className="w-full py-4 bg-orange-600 text-white font-bold rounded-2xl shadow-lg hover:bg-orange-700 transition">MASUK</button>
      </form>
    </div>
  );

  return (
    <div className="flex h-screen bg-orange-50 overflow-hidden font-sans">
      {/* Sidebar Desktop */}
      <div className="hidden md:flex flex-col w-24 bg-orange-600 text-white p-4 gap-6 no-print shadow-xl">
        <div className="font-black text-center text-xl border-b border-orange-400 pb-4 uppercase">KR23</div>
        <div className="flex flex-col gap-4 flex-1">
          {["Makanan", "Minuman", "Jajanan", "Extra"].map(cat => (
            <button key={cat} onClick={() => setActiveTab(cat)} className={`text-[10px] font-bold py-3 rounded-xl transition ${activeTab === cat ? 'bg-orange-800' : 'opacity-60'}`}>{cat}</button>
          ))}
        </div>
        {user.role === 'admin' && (
          <button onClick={handleToggleShift} className="text-[9px] bg-yellow-500 text-orange-900 p-2 rounded-xl font-black uppercase shadow-inner">Shift</button>
        )}
        <button onClick={() => setUser(null)} className="text-[10px] opacity-50 font-bold uppercase">Exit</button>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header Mobile */}
        <div className="md:hidden flex justify-between p-4 bg-orange-600 text-white shadow-md no-print items-center">
          <div className="text-[10px] leading-tight font-bold">KEDAI RAME 23<br/><span className="opacity-70">{user.username} | {noNota}</span></div>
          <button onClick={() => setShowCartMobile(true)} className="bg-white text-orange-600 px-4 py-2 rounded-xl font-black shadow-lg">🛒 {cart.length}</button>
        </div>
        
        {/* Menu Grid */}
        <div className="flex-1 p-4 md:p-8 overflow-y-auto no-print">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {db.menu && db.menu.length > 0 ? db.menu
              .filter(m => String(m.category).toLowerCase() === activeTab.toLowerCase())
              .map((m) => (
              <div key={m.id} className="bg-white p-4 rounded-[2rem] shadow-sm flex flex-col border border-orange-100 hover:shadow-md transition">
                <span className="text-4xl text-center mb-2">{m.img || '🥣'}</span>
                <p className="font-bold text-[11px] text-center h-8 flex items-center justify-center leading-tight mb-1">{m.name}</p>
                <p className="text-orange-600 font-black text-center text-sm mb-3">Rp {m.price.toLocaleString()}</p>
                <div className="mt-auto space-y-2">
                  {m.options && m.options.length > 0 && (
                    <select id={`opt-${m.id}`} className="w-full p-2 text-[10px] bg-orange-50 border rounded-xl font-bold outline-none border-orange-200">
                      {m.options.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  )}
                  <button 
                    onClick={() => {
                      const optVal = m.options && m.options.length > 0 ? document.getElementById(`opt-${m.id}`).value : null;
                      addToCart(m, optVal);
                    }} 
                    disabled={db.shiftStatus === 'CLOSED'}
                    className="w-full py-2 bg-orange-600 text-white rounded-xl text-[10px] font-bold disabled:opacity-30 active:scale-95 transition shadow-sm"
                  >
                    TAMBAH
                  </button>
                </div>
              </div>
            )) : <div className="col-span-full text-center py-20 text-gray-400 font-bold">Menu {activeTab} Belum Tersedia...</div>}
          </div>
        </div>
      </div>

      {/* Cart (Keranjang) */}
      <div className={`fixed md:relative top-0 right-0 h-full w-full md:w-80 bg-white shadow-2xl z-50 flex flex-col transition-transform duration-300 ${showCartMobile ? 'translate-x-0' : 'translate-x-full md:translate-x-0'} no-print`}>
        <div className="p-4 border-b flex justify-between items-center bg-orange-50">
          <b className="text-orange-800 text-sm tracking-tighter">DAFTAR PESANAN</b>
          <button onClick={() => setShowCartMobile(false)} className="md:hidden text-orange-600 font-bold">✕ TUTUP</button>
        </div>
        <div className="p-4 bg-yellow-100 mx-4 my-4 rounded-2xl border-2 border-yellow-300 text-center shadow-inner">
          <small className="text-[9px] font-black text-yellow-600 block uppercase">Nomor Nota</small>
          <span className="text-2xl font-black text-yellow-800 tracking-widest">{noNota}</span>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.map((item, i) => (
            <div key={i} className="flex justify-between text-xs border-b pb-2 border-orange-50">
              <div className="flex-1 pr-2">
                <b className="text-gray-800">{item.name}</b>
                <br/>
                <small className="text-orange-500 font-bold">{item.option ? `${item.option} ` : ''}x{item.qty}</small>
              </div>
              <div className="flex items-center gap-2">
                <b className="text-gray-900">{(item.price * item.qty).toLocaleString()}</b>
                <button onClick={() => setCart(cart.filter((_, idx) => idx !== i))} className="text-red-500 font-bold text-lg p-1">✕</button>
              </div>
            </div>
          ))}
        </div>
        <div className="p-6 bg-orange-50 border-t space-y-4">
          <div className="flex gap-2">
            <button onClick={() => setPayMethod("Tunai")} className={`flex-1 py-2 text-[10px] font-bold rounded-xl transition ${payMethod === "Tunai" ? "bg-orange-500 text-white shadow-md" : "bg-white border text-gray-400"}`}>TUNAI</button>
            <button onClick={() => setPayMethod("QRIS")} className={`flex-1 py-2 text-[10px] font-bold rounded-xl transition ${payMethod === "QRIS" ? "bg-blue-500 text-white shadow-md" : "bg-white border text-gray-400"}`}>QRIS</button>
          </div>
          <div className="flex justify-between font-black text-xl text-orange-900">
            <span>TOTAL</span>
            <span>Rp {cart.reduce((a,c)=>a+(c.price*c.qty),0).toLocaleString()}</span>
          </div>
          <button 
            onClick={onCheckout} 
            disabled={cart.length === 0 || db.shiftStatus === 'CLOSED' || loading} 
            className="w-full py-5 bg-green-600 text-white rounded-[2rem] font-black shadow-xl disabled:bg-gray-300 transition-all active:scale-95 uppercase"
          >
             {db.shiftStatus === 'OPEN' ? (loading ? 'PROSES...' : `BAYAR (${payMethod})`) : 'SHIFT TUTUP'}
          </button>
        </div>
      </div>

      {/* Modal Receipt (Struk) */}
      {showReceipt && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 overlay-print">
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
              <div className="flex justify-between font-bold text-sm">
                <span>TOTAL</span>
                <span>Rp {lastOrder?.total.toLocaleString()}</span>
              </div>
              <center className="mt-4"><small>Metode: {lastOrder?.method}</small><br/>Terima Kasih!</center>
            </div>
            <div className="flex gap-2 mt-8 no-print">
              <button onClick={() => window.print()} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg">PRINT</button>
              <button onClick={() => {setShowReceipt(false); setCart([]); refreshData();}} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold shadow-lg">TUTUP</button>
            </div>
          </div>
        </div>
      )}

      {/* CSS untuk Struk Print */}
      <style>{`
        @media print { 
          body * { visibility: hidden; } 
          .print-container, .print-container * { visibility: visible; }
          .print-container { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 10px; border: none; }
          .no-print { display: none !important; }
        }
      `}</style>
    </div>
  );
}
