import React, { useState, useEffect, useRef } from 'react';
import { getInitialData, saveOrder, updateShiftStatus } from './db';

export default function App() {
  // --- LOGIN DATA (Ditaruh di sini supaya pasti bisa masuk) ---
  const MASTER_USERS = [
    { username: "admin", pin: "2277", role: "admin" },
    { username: "kasir1", pin: "1234", role: "user" }
  ];

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

  useEffect(() => {
    if (db.orders) {
      const nextNum = db.orders.length + 1;
      setNoNota("KR-" + String(nextNum).padStart(3, '0'));
    }
  }, [db.orders]);

  const loadData = async () => {
    const data = await getInitialData();
    if (data && data.status === "SUCCESS") setDb(data);
  };

  const handleLogin = (e) => {
    e.preventDefault();
    // Cek di Master Users (App.jsx) dulu, baru cek di DB (Google Sheets)
    const found = MASTER_USERS.find(u => u.username === login.username && u.pin === login.pin) 
                || db.users.find(u => u.username === login.username && u.pin === login.pin);
    
    if (found) setUser(found); else alert("Login Gagal! Username/PIN salah.");
  };

  const handleToggleShift = async () => {
    const newStatus = db.shiftStatus === "OPEN" ? "CLOSED" : "OPEN";
    if (window.confirm(`Ganti status ke ${newStatus}?`)) {
      setLoading(true);
      const res = await updateShiftStatus(newStatus);
      if (res.status === "OK") await loadData();
      setLoading(false);
    }
  };

  const addToCart = (item, opt) => {
    let priceAdj = item.price;
    if (opt === "Singkong") priceAdj -= 1000;
    if (opt === "Nasi") priceAdj += 1000;
    const optionLabel = item.options.length > 0 ? (opt || item.options[0]) : null;
    
    const exist = cart.find(x => x.id === item.id && x.option === optionLabel);
    if (exist) {
      setCart(cart.map(x => (x.id === item.id && x.option === optionLabel) ? {...exist, qty: exist.qty + 1} : x));
    } else {
      setCart([...cart, { ...item, price: priceAdj, qty: 1, option: optionLabel }]);
    }
  };

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center bg-orange-600 p-4">
      <div className="bg-white p-8 rounded-3xl w-full max-w-sm shadow-2xl text-center">
        <h1 className="text-orange-600 text-3xl font-black mb-1">KEDAI RAME 23</h1>
        <p className="text-gray-400 text-sm mb-8">Login Akses Langsung</p>
        <form onSubmit={handleLogin} className="space-y-4">
          <input type="text" placeholder="Username" onChange={e => setLogin({...login, username: e.target.value})} className="w-full p-4 border border-gray-200 rounded-2xl outline-none focus:border-orange-500" />
          <input type="password" placeholder="PIN" onChange={e => setLogin({...login, pin: e.target.value})} className="w-full p-4 border border-gray-200 rounded-2xl outline-none focus:border-orange-500" />
          <button type="submit" className="w-full py-4 bg-orange-600 text-white font-black rounded-2xl shadow-lg transition">MASUK</button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-orange-50 font-sans overflow-hidden">
      {/* Sidebar Laptop */}
      <div className="hidden md:flex flex-col items-center w-24 bg-orange-600 py-8 gap-8 shadow-2xl text-white no-print">
        <div className="font-black text-2xl">KR</div>
        {["Makanan", "Minuman", "Jajanan", "Extra"].map(cat => (
          <button key={cat} onClick={() => setActiveTab(cat)} className={`text-[10px] font-bold transition ${activeTab === cat ? 'bg-orange-700 w-full py-4 border-r-4 border-white' : 'opacity-60'}`}>{cat}</button>
        ))}
        <button onClick={handleToggleShift} className="mt-auto p-2 bg-white/20 rounded-lg text-[9px] font-bold uppercase">{db.shiftStatus === "OPEN" ? "Tutup Shift" : "Buka Shift"}</button>
        <button onClick={() => setUser(null)} className="text-yellow-300 font-bold text-[10px]">EXIT</button>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile View */}
        <div className="md:hidden flex justify-between items-center p-4 bg-orange-600 text-white no-print">
          <span className="font-black text-sm">KR23 | {user.username}</span>
          <button onClick={() => setShowCartMobile(true)} className="bg-white text-orange-600 px-4 py-2 rounded-xl font-bold">🛒 {cart.length}</button>
        </div>

        {/* Menu Area */}
        <div className="flex-1 p-4 md:p-8 overflow-y-auto no-print">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {db.menu.filter(m => m.category === activeTab).map(m => (
              <div key={m.id} className="bg-white p-4 rounded-3xl shadow-sm border border-orange-100 flex flex-col h-full">
                <span className="text-4xl text-center mb-2">{m.img || '🥣'}</span>
                {/* Judul Menu (Truncate biar gak berantakan) */}
                <p className="font-bold text-gray-800 text-xs text-center mb-1 line-clamp-2 min-h-[32px] leading-tight">
                  {m.name}
                </p>
                <p className="text-orange-600 font-black text-center text-sm mb-3">Rp {m.price.toLocaleString()}</p>
                
                <div className="mt-auto">
                  {m.options.length > 0 ? (
                    <div className="space-y-2">
                      {/* DROPDOWN UNTUK HP BIAR RINGKAS */}
                      <select 
                        id={`opt-${m.id}`}
                        className="w-full p-2 bg-orange-50 border border-orange-200 rounded-xl text-[10px] font-bold outline-none"
                      >
                        {m.options.map(o => (
                          <option key={o} value={o}>{o} {o==='Nasi'?'+1k':o==='Singkong'?'-1k':''}</option>
                        ))}
                      </select>
                      <button 
                        onClick={() => {
                          const val = document.getElementById(`opt-${m.id}`).value;
                          addToCart(m, val);
                        }}
                        disabled={db.shiftStatus === 'CLOSED'}
                        className="w-full py-2 bg-orange-600 text-white rounded-xl font-bold text-[10px] disabled:opacity-30"
                      >
                        TAMBAH
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => addToCart(m)} 
                      disabled={db.shiftStatus === 'CLOSED'}
                      className="w-full py-3 bg-orange-600 text-white rounded-2xl font-bold text-xs disabled:opacity-30"
                    >
                      TAMBAH
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Cart Drawer (Sama seperti sebelumnya dengan tombol hapus) */}
      <div className={`fixed md:relative top-0 right-0 h-full w-full md:w-96 bg-white shadow-2xl transition-transform transform ${showCartMobile ? 'translate-x-0' : 'translate-x-full md:translate-x-0'} z-50 flex flex-col no-print`}>
         {/* Bagian isi keranjang tetep pakai kode Bos yang terakhir */}
         <div className="p-6 border-b flex justify-between items-center">
            <h3 className="font-black text-gray-800 uppercase">Keranjang</h3>
            <button onClick={() => setShowCartMobile(false)} className="md:hidden text-2xl">✕</button>
         </div>
         <div className="p-4 bg-yellow-50 mx-4 my-2 rounded-2xl border-2 border-yellow-400 text-center">
            <span className="text-2xl font-black text-yellow-700">{noNota}</span>
         </div>
         <div className="flex-1 overflow-y-auto px-4 space-y-3">
            {cart.map((item, i) => (
               <div key={i} className="flex justify-between items-center border-b border-orange-50 pb-2">
                  <div className="flex-1">
                    <p className="font-bold text-xs">{item.name}</p>
                    <small className="text-orange-500 font-bold">{item.option} x{item.qty}</small>
                  </div>
                  <div className="flex items-center gap-3">
                    <b className="text-xs">{(item.price * item.qty).toLocaleString()}</b>
                    <button onClick={() => setCart(cart.filter((_, idx) => idx !== i))} className="text-red-500">✕</button>
                  </div>
               </div>
            ))}
         </div>
         <div className="p-6 bg-orange-50 border-t border-orange-100 space-y-4">
            <div className="flex gap-2 mb-2">
               <button onClick={() => setPayMethod("Tunai")} className={`flex-1 py-2 rounded-xl font-bold text-[10px] ${payMethod === "Tunai" ? "bg-orange-500 text-white" : "bg-gray-200 text-gray-500"}`}>TUNAI</button>
               <button onClick={() => setPayMethod("QRIS")} className={`flex-1 py-2 rounded-xl font-bold text-[10px] ${payMethod === "QRIS" ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-500"}`}>QRIS</button>
            </div>
            <div className="flex justify-between font-black text-lg"><span>TOTAL</span><span>Rp {cart.reduce((a,c) => a + (c.price*c.qty), 0).toLocaleString()}</span></div>
            <button 
               onClick={onCheckout}
               disabled={cart.length === 0 || db.shiftStatus === 'CLOSED'}
               className="w-full py-4 bg-green-600 text-white rounded-2xl font-black shadow-lg disabled:bg-gray-300"
            >
               {db.shiftStatus === 'CLOSED' ? 'SHIFT TUTUP' : `BAYAR (${payMethod})`}
            </button>
         </div>
      </div>

      {/* Modal Struk & CSS Print tetep sama */}
      {showReceipt && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 overlay-print">
          <div className="bg-white p-6 rounded-3xl w-full max-w-xs print-container">
            <div className="font-mono text-[12px] text-black">
              <center className="mb-4">
                <b className="uppercase">Kedai Rame 23</b><br/>
                <small>Nota: {lastOrder?.noNota}</small>
              </center>
              {lastOrder?.items.map((it, i) => (
                <div key={i} className="flex justify-between text-[10px]">
                  <span>{it.name} ({it.option}) x{it.qty}</span>
                  <span>{(it.price*it.qty).toLocaleString()}</span>
                </div>
              ))}
              <div className="border-t border-dashed border-black my-2"></div>
              <div className="flex justify-between font-bold"><span>TOTAL</span><span>Rp {lastOrder?.total.toLocaleString()}</span></div>
              <center className="mt-4 text-[10px]">Terima Kasih!</center>
            </div>
            <div className="flex gap-2 mt-6 no-print">
              <button onClick={() => window.print()} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold">PRINT</button>
              <button onClick={() => {setShowReceipt(false); setCart([]); loadData();}} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold">TUTUP</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-container, .print-container * { visibility: visible; }
          .print-container { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none; }
          .no-print { display: none !important; }
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;  
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}
