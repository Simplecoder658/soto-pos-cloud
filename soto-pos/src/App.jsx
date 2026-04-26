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
  const [showCartMobile, setShowCartMobile] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);

  useEffect(() => { refreshData(); }, []);

  useEffect(() => {
    if (db.orders) {
      setNoNota("KR-" + String(db.orders.length + 1).padStart(3, '0'));
    }
  }, [db.orders]);

  const refreshData = async () => {
    setLoading(true);
    const res = await getInitialData();
    if (res && res.status === "SUCCESS") setDb(res);
    setLoading(false);
  };

  const handleLogin = (e) => {
    e.preventDefault();
    const found = MASTER_USERS.find(u => u.username === login.username && u.pin === login.pin) 
                || (db.users && db.users.find(u => u.username === login.username && u.pin === login.pin));
    if (found) setUser(found); else alert("PIN Salah!");
  };

  const addToCart = (item, opt) => {
    let p = item.price;
    if (opt === "Singkong") p -= 1000; 
    else if (opt === "Nasi") p += 1000;
    const label = item.options?.length > 0 ? (opt || item.options[0]) : null;
    const existing = cart.find(x => x.id === item.id && x.option === label);
    if (existing) {
      setCart(cart.map(x => (x.id === item.id && x.option === label) ? {...existing, qty: existing.qty + 1} : x));
    } else {
      setCart([...cart, { ...item, price: p, qty: 1, option: label }]);
    }
  };

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center bg-orange-600 p-4">
      <form onSubmit={handleLogin} className="bg-white p-8 rounded-[2.5rem] w-full max-w-sm shadow-2xl">
        <h1 className="text-3xl font-black text-orange-600 text-center mb-6 uppercase">KR23 KASIR</h1>
        <input type="text" placeholder="Username" onChange={e => setLogin({...login, username: e.target.value})} className="w-full p-4 mb-3 border rounded-2xl outline-none" required />
        <input type="password" placeholder="PIN" onChange={e => setLogin({...login, pin: e.target.value})} className="w-full p-4 mb-6 border rounded-2xl outline-none" required />
        <button className="w-full py-4 bg-orange-600 text-white font-bold rounded-2xl shadow-lg">MASUK</button>
      </form>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      
      {/* SIDEBAR - Kategori Pindah Kesini (Bagian Atas) */}
      <div className="hidden md:flex flex-col w-28 bg-white border-r text-gray-400 p-2 gap-2 no-print shadow-sm">
        <div className="font-black text-center text-orange-600 text-xl py-4 border-b mb-2 uppercase italic">KR23</div>
        
        {/* Navigasi Kategori di Sidebar Atas */}
        <div className="flex flex-col gap-2 flex-1">
          {["Makanan", "Minuman", "Jajanan", "Extra"].map(cat => (
            <button 
              key={cat} 
              onClick={() => setActiveTab(cat)} 
              className={`text-[10px] font-black py-4 rounded-2xl transition-all flex flex-col items-center justify-center gap-1 ${activeTab === cat ? 'bg-orange-600 text-white shadow-md scale-105' : 'hover:bg-orange-50 hover:text-orange-600'}`}
            >
              <span>{cat === 'Makanan' ? '🍲' : cat === 'Minuman' ? '🍹' : cat === 'Jajanan' ? '🥨' : '➕'}</span>
              {cat.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Menu Sistem di Sidebar Bawah */}
        <div className="border-t pt-4 flex flex-col gap-2">
          {user.role === 'admin' && (
            <button onClick={async () => {
              const next = db.shiftStatus === "OPEN" ? "CLOSED" : "OPEN";
              if(confirm(`Ubah ke ${next}?`)) { await updateShiftStatus(next); refreshData(); }
            }} className="text-[9px] bg-yellow-400 text-orange-900 py-3 rounded-2xl font-black uppercase">SHIFT</button>
          )}
          <button onClick={() => setUser(null)} className="text-[9px] font-black py-3 uppercase border rounded-2xl">KELUAR</button>
        </div>
      </div>

      {/* AREA UTAMA */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header Nota */}
        <div className="p-4 bg-white border-b flex justify-between items-center no-print">
            <h2 className="font-black text-gray-700 tracking-widest">{activeTab.toUpperCase()}</h2>
            <div className="text-right">
                <span className="text-[10px] font-bold text-gray-400 block">NO. NOTA</span>
                <span className="font-black text-orange-600">{noNota}</span>
            </div>
        </div>

        {/* Grid Menu (Sesuai Tema Awal) */}
        <div className="flex-1 p-6 overflow-y-auto no-print">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {db.menu.filter(m => String(m.category).toLowerCase() === activeTab.toLowerCase()).map((m) => (
              <div key={m.id} className="bg-white p-4 rounded-[2rem] shadow-sm flex flex-col border border-orange-100 h-full hover:shadow-md transition">
                <span className="text-4xl text-center mb-2">{m.img}</span>
                <p className="font-bold text-[11px] text-center h-8 flex items-center justify-center mb-1 leading-tight">{m.name}</p>
                <p className="text-orange-600 font-black text-center text-sm mb-3">Rp {m.price.toLocaleString()}</p>
                <div className="mt-auto space-y-2">
                  {m.options?.length > 0 && (
                    <select id={`opt-${m.id}`} className="w-full p-2 text-[10px] bg-orange-50 border rounded-xl font-bold outline-none">
                      {m.options.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  )}
                  <button 
                    onClick={() => {
                      const optVal = m.options?.length > 0 ? document.getElementById(`opt-${m.id}`).value : null;
                      addToCart(m, optVal);
                    }} 
                    disabled={db.shiftStatus === 'CLOSED'}
                    className="w-full py-2 bg-orange-600 text-white rounded-xl text-[10px] font-bold active:scale-95 transition"
                  >
                    TAMBAH
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Keranjang Samping (Tema Awal) */}
      <div className="w-80 bg-white border-l flex flex-col no-print">
        <div className="p-4 border-b font-black text-gray-600 text-center tracking-tighter">DAFTAR PESANAN</div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.map((item, i) => (
            <div key={i} className="flex justify-between text-xs border-b pb-2">
              <div className="flex-1 pr-2">
                <b className="text-gray-800 uppercase">{item.name}</b>
                <br/><small className="text-orange-600 font-bold">{item.option ? `${item.option} ` : ''}x{item.qty}</small>
              </div>
              <div className="flex items-center gap-2">
                <b className="text-gray-900">{(item.price * item.qty).toLocaleString()}</b>
                <button onClick={() => setCart(cart.filter((_, idx) => idx !== i))} className="text-red-500 font-bold">✕</button>
              </div>
            </div>
          ))}
        </div>
        <div className="p-6 bg-gray-50 border-t space-y-4">
          <div className="flex gap-2">
            <button onClick={() => setPayMethod("Tunai")} className={`flex-1 py-2 text-[10px] font-bold rounded-xl ${payMethod === "Tunai" ? "bg-orange-600 text-white" : "bg-white border text-gray-400"}`}>TUNAI</button>
            <button onClick={() => setPayMethod("QRIS")} className={`flex-1 py-2 text-[10px] font-bold rounded-xl ${payMethod === "QRIS" ? "bg-blue-600 text-white" : "bg-white border text-gray-400"}`}>QRIS</button>
          </div>
          <div className="flex justify-between font-black text-xl text-orange-700">
            <span>TOTAL</span>
            <span>Rp {cart.reduce((a,c)=>a+(c.price*c.qty),0).toLocaleString()}</span>
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
            disabled={cart.length === 0 || db.shiftStatus === 'CLOSED'} 
            className="w-full py-4 bg-green-600 text-white rounded-2xl font-black shadow-lg disabled:bg-gray-300"
          >
             {db.shiftStatus === 'OPEN' ? 'BAYAR' : 'SHIFT TUTUP'}
          </button>
        </div>
      </div>

      {/* Struk Modal */}
      {showReceipt && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4">
          <div className="bg-white p-6 rounded-[2rem] w-full max-w-xs shadow-2xl font-mono text-[11px]">
            <center className="mb-4 font-bold uppercase">Kedai Rame 23<br/><small>{lastOrder?.time}</small></center>
            {lastOrder?.items.map((it, i) => (
                <div key={i} className="flex justify-between mb-1">
                  <span>{it.name} {it.option ? `(${it.option})` : ''} x{it.qty}</span>
                  <span>{(it.price*it.qty).toLocaleString()}</span>
                </div>
            ))}
            <div className="border-t border-dashed my-2 border-black"></div>
            <div className="flex justify-between font-bold text-sm"><span>TOTAL</span><span>Rp {lastOrder?.total.toLocaleString()}</span></div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => window.print()} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold">PRINT</button>
              <button onClick={() => {setShowReceipt(false); setCart([]); refreshData();}} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold">TUTUP</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
