import React, { useState, useEffect } from 'react';
import { getInitialData, saveOrder, updateShiftStatus } from './db';

export default function App() {
  const MASTER_USERS = [{ username: "admin", pin: "2277", role: "admin" }];
  
  const [user, setUser] = useState(null);
  const [db, setDb] = useState({ menu: [], users: [], orders: [], shiftStatus: "CLOSED" });
  const [login, setLogin] = useState({ username: "", pin: "" });
  const [cart, setCart] = useState([]);
  const [noNota, setNoNota] = useState("KR-001");
  const [payMethod, setPayMethod] = useState("Tunai");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Makanan");
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);

  useEffect(() => { refreshData(); }, []);
  useEffect(() => {
    if (db.orders) setNoNota("KR-" + String(db.orders.length + 1).padStart(3, '0'));
  }, [db.orders]);

  const refreshData = async () => {
    setLoading(true);
    const res = await getInitialData();
    if (res && res.status === "SUCCESS") setDb(res);
    setLoading(false);
  };

  const addToCart = (item, opt) => {
    let p = item.price;
    if (opt === "Singkong") p -= 1000; 
    else if (opt === "Nasi") p += 1000;
    const label = (item.options && item.options.length > 0) ? (opt || item.options[0]) : null;
    const existing = cart.find(x => x.id === item.id && x.option === label);
    if (existing) {
      setCart(cart.map(x => (x.id === item.id && x.option === label) ? {...existing, qty: existing.qty + 1} : x));
    } else {
      setCart([...cart, { ...item, price: p, qty: 1, option: label }]);
    }
  };

  if (loading && !user) return (
    <div className="min-h-screen flex items-center justify-center bg-white text-orange-500 font-black animate-pulse text-2xl">
      MEMBUKA KEDAI RAME...
    </div>
  );

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center bg-orange-500 p-4">
      <form onSubmit={(e) => {
        e.preventDefault();
        const found = MASTER_USERS.find(u => u.username === login.username && u.pin === login.pin) 
                    || (db.users && db.users.find(u => u.username === login.username && u.pin === login.pin));
        if (found) setUser(found); else alert("PIN SALAH!");
      }} className="bg-white p-10 rounded-[3rem] w-full max-w-sm shadow-2xl">
        <h1 className="text-4xl font-black text-orange-500 text-center mb-8 italic uppercase">KR23</h1>
        <input type="text" placeholder="Username" onChange={e => setLogin({...login, username: e.target.value})} className="w-full p-4 mb-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none" required />
        <input type="password" placeholder="PIN" onChange={e => setLogin({...login, pin: e.target.value})} className="w-full p-4 mb-6 bg-gray-50 border border-gray-100 rounded-2xl outline-none" required />
        <button className="w-full py-4 bg-orange-500 text-white font-black rounded-2xl shadow-lg active:scale-95 transition">MASUK</button>
      </form>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      
      {/* SIDEBAR - KATEGORI DI ATAS */}
      <div className="w-28 bg-white flex flex-col items-center py-6 border-r border-gray-100 shadow-sm z-20 no-print">
        <div className="text-3xl font-black text-orange-500 italic mb-8 uppercase select-none">KR23</div>

        {/* NAVIGASI KATEGORI */}
        <div className="flex flex-col w-full gap-2 px-2 overflow-y-auto flex-1">
          {["Makanan", "Minuman", "Jajanan", "Extra"].map(cat => (
            <button 
              key={cat} 
              onClick={() => setActiveTab(cat)}
              className={`w-full flex flex-col items-center justify-center py-4 rounded-2xl transition-all ${activeTab === cat ? 'bg-orange-500 text-white shadow-md' : 'text-gray-400 hover:bg-orange-50'}`}
            >
              <span className="text-xl mb-1">{cat === 'Makanan' ? '🍲' : cat === 'Minuman' ? '🍹' : '🥨'}</span>
              <span className="font-black text-[9px] tracking-widest">{cat.toUpperCase()}</span>
            </button>
          ))}
        </div>

        {/* NAVIGASI SISTEM */}
        <div className="w-full px-2 mt-4 space-y-2 border-t pt-4">
          <button onClick={() => setUser(null)} className="w-full py-3 text-[9px] font-black text-gray-400 uppercase hover:text-red-500 transition-colors">KELUAR</button>
        </div>
      </div>

      {/* AREA MENU UTAMA */}
      <div className="flex-1 flex flex-col relative overflow-hidden bg-white">
        {/* HEADER */}
        <div className="p-6 flex justify-between items-center border-b border-gray-50 no-print">
            <h2 className="text-xl font-black text-gray-800 tracking-tighter">{activeTab.toUpperCase()}</h2>
            <div className="bg-orange-50 px-4 py-1 rounded-full border border-orange-100">
                <span className="text-[10px] font-black text-orange-600">NOTA: {noNota}</span>
            </div>
        </div>

        {/* GRID MENU (PUTIH ORANYE) */}
        <div className="flex-1 p-6 overflow-y-auto no-print">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {db.menu.filter(m => m.category.toLowerCase() === activeTab.toLowerCase()).map(m => (
              <div key={m.id} className="bg-white rounded-[2rem] p-4 border border-gray-100 shadow-sm flex flex-col hover:border-orange-200 transition-all">
                <div className="text-5xl text-center mb-3">{m.img}</div>
                <h3 className="font-black text-gray-700 text-[11px] text-center h-8 flex items-center justify-center leading-tight mb-1 uppercase">{m.name}</h3>
                <p className="text-orange-500 font-black text-center text-sm mb-4">Rp {m.price.toLocaleString()}</p>
                
                <div className="mt-auto space-y-2">
                  {m.options && m.options.length > 0 && (
                    <select id={`opt-${m.id}`} className="w-full p-2 text-[10px] bg-orange-50 border border-orange-100 rounded-xl font-black text-orange-700 outline-none">
                      {m.options.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  )}
                  <button onClick={() => {
                      const optVal = (m.options && m.options.length > 0) ? document.getElementById(`opt-${m.id}`).value : null;
                      addToCart(m, optVal);
                    }} 
                    disabled={db.shiftStatus === 'CLOSED'}
                    className="w-full py-2 bg-orange-500 text-white rounded-xl text-[10px] font-black shadow-sm active:scale-95 transition disabled:bg-gray-200"
                  >
                    TAMBAH
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* KERANJANG SAMPING (PUTIH) */}
      <div className="w-80 bg-white border-l border-gray-100 flex flex-col no-print shadow-xl">
        <div className="p-4 border-b text-center">
            <span className="text-[10px] font-black text-gray-400 tracking-[0.3em] uppercase">Pesanan Pelanggan</span>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.map((item, i) => (
            <div key={i} className="flex justify-between items-center text-xs border-b border-gray-50 pb-2">
              <div className="flex-1 pr-2">
                <b className="text-gray-700 uppercase leading-none block mb-1">{item.name}</b>
                <span className="text-[10px] text-orange-500 font-black">{item.option ? `${item.option} ` : ''}x{item.qty}</span>
              </div>
              <div className="flex items-center gap-3">
                <b className="text-gray-800">{(item.price * item.qty).toLocaleString()}</b>
                <button onClick={() => setCart(cart.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600 font-bold">✕</button>
              </div>
            </div>
          ))}
        </div>

        {/* PEMBAYARAN */}
        <div className="p-6 bg-gray-50 border-t border-gray-100 space-y-4">
          <div className="flex gap-2 p-1 bg-white rounded-2xl border border-gray-200">
            <button onClick={() => setPayMethod("Tunai")} className={`flex-1 py-2 text-[10px] font-black rounded-xl transition ${payMethod === "Tunai" ? "bg-orange-500 text-white shadow-md" : "text-gray-400"}`}>TUNAI</button>
            <button onClick={() => setPayMethod("QRIS")} className={`flex-1 py-2 text-[10px] font-black rounded-xl transition ${payMethod === "QRIS" ? "bg-orange-500 text-white shadow-md" : "text-gray-400"}`}>QRIS</button>
          </div>
          <div className="flex justify-between items-end px-1">
            <span className="text-[10px] font-black text-gray-400 uppercase">Total Tagihan</span>
            <span className="text-2xl font-black text-orange-600 italic leading-none">Rp {cart.reduce((a,c)=>a+(c.price*c.qty),0).toLocaleString()}</span>
          </div>
          <button 
            onClick={async () => {
                setLoading(true);
                const res = await saveOrder({ noNota, cart, method: payMethod, kasir: user.username });
                if(res.status === "OK") {
                    setLastOrder({ noNota, items: [...cart], total: cart.reduce((a,c)=>a+(c.price*c.qty),0), time: new Date().toLocaleString() });
                    setShowReceipt(true);
                }
                setLoading(false);
            }} 
            disabled={cart.length === 0 || db.shiftStatus === 'CLOSED' || loading} 
            className="w-full py-4 bg-orange-500 text-white rounded-[2rem] font-black shadow-lg disabled:bg-gray-200 active:scale-95 transition uppercase tracking-widest"
          >
             {db.shiftStatus === 'OPEN' ? (loading ? 'PROSES...' : 'BAYAR SEKARANG') : 'SHIFT TUTUP'}
          </button>
        </div>
      </div>

      {/* STRUK */}
      {showReceipt && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-[3rem] w-full max-w-xs font-mono text-[11px] shadow-2xl">
                <center className="mb-4">
                  <b className="text-sm">KEDAI RAME 23</b><br/>
                  <small className="opacity-50">{lastOrder.time}</small>
                </center>
                <div className="mb-2">Nota: {lastOrder.noNota}</div>
                <div className="border-t border-dashed my-2 border-black"></div>
                {lastOrder.items.map((it, i) => (
                    <div key={i} className="flex justify-between mb-1">
                        <span className="flex-1 pr-2">{it.name} {it.option ? `(${it.option})` : ''} x{it.qty}</span>
                        <span>{(it.price*it.qty).toLocaleString()}</span>
                    </div>
                ))}
                <div className="border-t border-dashed my-2 border-black"></div>
                <div className="flex justify-between font-black text-sm mb-8"><span>TOTAL</span><span>Rp {lastOrder.total.toLocaleString()}</span></div>
                <button onClick={() => {setShowReceipt(false); setCart([]); refreshData();}} className="w-full py-4 bg-orange-500 text-white rounded-2xl font-black shadow-lg">SELESAI</button>
            </div>
        </div>
      )}
    </div>
  );
}
