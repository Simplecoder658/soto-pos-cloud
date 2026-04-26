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

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (db.orders) setNoNota("KR-" + String(db.orders.length + 1).padStart(3, '0'));
  }, [db.orders]);

  const loadData = async () => {
    setLoading(true);
    const res = await getInitialData();
    if (res && res.status === "SUCCESS") setDb(res);
    setLoading(false);
  };

  const addToCart = (item, opt) => {
    let p = item.price;
    // Logika harga khusus: Nasi +1000, Singkong -1000
    if (opt === "Singkong") p -= 1000; 
    else if (opt === "Nasi") p += 1000;

    const label = opt || null;
    const existing = cart.find(x => x.id === item.id && x.option === label);
    if (existing) {
      setCart(cart.map(x => (x.id === item.id && x.option === label) ? {...existing, qty: existing.qty + 1} : x));
    } else {
      setCart([...cart, { ...item, price: p, qty: 1, option: label }]);
    }
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setLoading(true);
    const res = await saveOrder({ noNota, cart, method: payMethod, kasir: user.username });
    if (res.status === "OK") {
      setLastOrder({ 
        noNota, 
        items: [...cart], 
        total: cart.reduce((a, c) => a + (c.price * c.qty), 0), 
        method: payMethod,
        time: new Date().toLocaleString('id-ID') 
      });
      setShowReceipt(true);
    }
    setLoading(false);
  };

  if (loading && !user) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8C491] text-white font-black text-2xl animate-pulse">
      MEMBUKA KEDAI RAME...
    </div>
  );

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8C491] p-4">
      <form onSubmit={(e) => {
        e.preventDefault();
        const found = MASTER_USERS.find(u => u.username === login.username && u.pin === login.pin) 
                    || (db.users && db.users.find(u => u.username === login.username && u.pin === login.pin));
        if (found) setUser(found); else alert("PIN SALAH BOS!");
      }} className="bg-white p-10 rounded-[3rem] w-full max-w-sm shadow-2xl">
        <h1 className="text-4xl font-black text-[#555] text-center mb-8 italic">KR<span className="text-orange-500">23</span></h1>
        <input type="text" placeholder="Username" onChange={e => setLogin({...login, username: e.target.value})} className="w-full p-4 mb-4 bg-gray-100 rounded-2xl outline-none" required />
        <input type="password" placeholder="PIN" onChange={e => setLogin({...login, pin: e.target.value})} className="w-full p-4 mb-6 bg-gray-100 rounded-2xl outline-none" required />
        <button className="w-full py-4 bg-orange-500 text-white font-black rounded-2xl shadow-lg">LOGIN</button>
      </form>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#F8C491] overflow-hidden font-sans">
      
      {/* SIDEBAR PUTIH (KATEGORI DI ATAS) */}
      <div className="w-64 bg-white flex flex-col items-center py-8 shadow-2xl z-20 no-print">
        {/* LOGO */}
        <div className="relative mb-8">
            <div className="text-5xl font-black text-[#444]">K<span className="text-orange-500 italic">R</span></div>
            <div className="absolute -top-1 -right-4 bg-orange-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold">23</div>
        </div>

        {/* SECTION KATEGORI (DI PINDAH KE ATAS) */}
        <div className="w-full px-4 mb-6 space-y-1">
          <p className="text-[10px] font-black text-gray-300 ml-4 mb-2 tracking-[0.2em]">KATEGORI MENU</p>
          {["Makanan", "Minuman", "Jajanan", "Extra"].map(cat => (
            <button 
              key={cat} 
              onClick={() => setActiveTab(cat)}
              className={`w-full flex items-center px-6 py-3 rounded-2xl font-black text-[11px] tracking-widest transition-all ${activeTab === cat ? 'bg-orange-500 text-white shadow-lg scale-105' : 'text-gray-400 hover:bg-orange-50'}`}
            >
              {cat.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="w-full h-[1px] bg-gray-100 mb-6 px-4"></div>

        {/* SECTION SYSTEM */}
        <div className="flex flex-col w-full gap-1 px-4">
          <SidebarBtn icon="⚙️" label="SHIFT STATUS" onClick={async () => {
             if(user.role !== 'admin') return;
             const next = db.shiftStatus === "OPEN" ? "CLOSED" : "OPEN";
             if(confirm(`Ubah Shift ke ${next}?`)) { setLoading(true); await updateShiftStatus(next); loadData(); }
          }} />
          <SidebarBtn icon="👤" label={user.username} />
          <SidebarBtn icon="🚪" label="LOGOUT" onClick={() => setUser(null)} />
        </div>

        {/* VERTICAL TEXT (KASIR DIGITAL) */}
        <div className="mt-auto relative w-full flex justify-center pb-10">
            <div className="absolute bottom-20 rotate-180 [writing-mode:vertical-lr] text-[#999] font-black text-4xl tracking-tighter opacity-10 uppercase select-none">KASIR DIGITAL</div>
            <div className="[writing-mode:vertical-lr] text-[#555] font-black text-4xl tracking-tighter uppercase select-none">KASIR DIGITAL</div>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        
        {/* HEADER INFO */}
        <div className="p-8 flex justify-between items-center no-print">
            <div className="bg-white/40 px-6 py-2 rounded-full border border-white/20 backdrop-blur-md">
                <span className="text-orange-900 font-black tracking-[0.2em] text-xs uppercase">{activeTab}</span>
            </div>
            <div className="text-right">
                <p className="text-[10px] font-black text-orange-900 opacity-40 tracking-widest">NOMOR NOTA</p>
                <p className="text-2xl font-black text-orange-950 leading-none">{noNota}</p>
            </div>
        </div>

        {/* GRID MENU CARDS */}
        <div className="flex-1 px-8 pb-24 overflow-y-auto no-print">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {db.menu.filter(m => m.category.toLowerCase() === activeTab.toLowerCase()).map(m => (
              <div key={m.id} className="bg-white rounded-[2.5rem] p-5 shadow-xl flex flex-col hover:shadow-2xl transition-all border-b-4 border-gray-100">
                <div className="flex gap-4 mb-5">
                    <div className="w-20 h-20 bg-orange-50 rounded-3xl flex items-center justify-center text-4xl shadow-inner border border-orange-100">{m.img}</div>
                    <div className="flex-1">
                        <h3 className="font-black text-gray-700 text-[13px] leading-tight mb-1">{m.name}</h3>
                        <p className="text-orange-600 font-black text-lg">R {m.price.toLocaleString()}</p>
                    </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 mt-auto">
                  {m.options.length > 0 ? m.options.map(opt => (
                    <button key={opt} onClick={() => addToCart(m, opt)} 
                      className="bg-[#0066CC] text-white text-[10px] font-black py-3 rounded-2xl hover:bg-blue-700 transition uppercase shadow-md active:scale-95">
                      + {opt}
                    </button>
                  )) : (
                    <button onClick={() => addToCart(m, null)} className="col-span-2 bg-[#0066CC] text-white text-[10px] font-black py-3 rounded-2xl uppercase active:scale-95">
                        TAMBAH PESANAN
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* BOTTOM NAV BAR */}
        <div className="absolute bottom-0 w-full bg-[#333] h-20 flex items-center px-8 no-print shadow-2xl">
            <div className="flex gap-10 flex-1 justify-center items-center">
                <NavIcon icon="📋" count={cart.length} />
                <NavIcon icon="🗑️" onClick={() => setCart([])} />
                <NavIcon icon="🖨️" onClick={() => window.print()} />
            </div>
            <div className="flex flex-col items-end mr-10 text-white">
                <span className="text-[10px] font-black opacity-40 tracking-widest uppercase">Total Bill</span>
                <span className="text-3xl font-black italic tracking-tighter text-orange-400">Rp {cart.reduce((a,c)=>a+(c.price*c.qty),0).toLocaleString()}</span>
            </div>
            <button onClick={handleCheckout} disabled={cart.length === 0 || db.shiftStatus === 'CLOSED' || loading} 
              className="bg-orange-500 h-full px-16 text-white font-black tracking-[0.3em] hover:bg-green-600 transition-all disabled:bg-gray-700 active:bg-orange-700">
              {db.shiftStatus === 'OPEN' ? 'PAYMENT' : 'CLOSED'}
            </button>
        </div>
      </div>

      {/* STRUK MODAL (OVERLAY) */}
      {showReceipt && (
        <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4">
            <div className="bg-white p-10 rounded-[3rem] w-full max-w-xs font-mono text-[11px] shadow-2xl">
                <center className="mb-6">
                  <b className="text-lg">KEDAI RAME 23</b><br/>
                  <small className="opacity-60">{lastOrder.time}</small>
                </center>
                <div className="mb-4 font-bold">Nota: {lastOrder.noNota}</div>
                <div className="space-y-1 mb-4">
                  {lastOrder.items.map((it, i) => (
                      <div key={i} className="flex justify-between">
                          <span>{it.name} {it.option ? `(${it.option})` : ''} x{it.qty}</span>
                          <span>{(it.price*it.qty).toLocaleString()}</span>
                      </div>
                  ))}
                </div>
                <div className="border-t border-dashed my-4 border-black"></div>
                <div className="flex justify-between font-black text-base mb-8"><span>TOTAL</span><span>Rp {lastOrder.total.toLocaleString()}</span></div>
                <button onClick={() => {setShowReceipt(false); setCart([]); loadData();}} className="w-full py-4 bg-orange-500 text-white rounded-2xl font-black shadow-lg uppercase tracking-[0.2em]">Selesai</button>
            </div>
        </div>
      )}
    </div>
  );
}

// Komponen Pendukung
const SidebarBtn = ({ icon, label, onClick }) => (
  <button onClick={onClick} className="flex items-center gap-4 w-full px-6 py-3 rounded-2xl text-gray-400 hover:bg-gray-50 hover:text-orange-500 transition-all group">
    <span className="text-xl group-hover:scale-110 transition-transform">{icon}</span>
    <span className="font-black text-[10px] tracking-widest uppercase">{label}</span>
  </button>
);

const NavIcon = ({ icon, onClick, count }) => (
  <button onClick={onClick} className="relative w-14 h-14 flex items-center justify-center text-3xl rounded-2xl text-gray-400 hover:text-white transition-colors">
    {icon}
    {count > 0 && <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] w-6 h-6 rounded-full flex items-center justify-center font-bold border-4 border-[#333] animate-bounce">{count}</span>}
  </button>
);
