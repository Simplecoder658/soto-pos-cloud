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

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center bg-orange-500 font-sans">
      <div className="bg-white p-10 rounded-3xl w-80 shadow-2xl text-center">
        <h1 className="text-orange-600 text-3xl font-black mb-2">KEDAI RAME 23</h1>
        <p className="text-gray-500 text-sm mb-8">Kasir Login</p>
        <form onSubmit={handleLogin} className="space-y-4">
          <input type="text" placeholder="Username" onChange={e => setLogin({...login, username: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none" />
          <input type="password" placeholder="PIN" onChange={e => setLogin({...login, pin: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none" />
          <button type="submit" className="w-full p-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl transition shadow-lg">MASUK</button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-orange-50 font-sans overflow-hidden">
      {/* Sidebar Laptop */}
      <div className="hidden md:flex flex-col items-center w-24 bg-orange-600 py-8 gap-8 shadow-xl">
        <div className="text-white font-black text-xl">KR23</div>
        {["Makanan", "Minuman", "Jajanan", "Extra"].map(cat => (
          <button key={cat} onClick={() => setActiveTab(cat)} className={`text-xs font-bold transition ${activeTab === cat ? 'text-white border-r-4 border-white w-full' : 'text-orange-200'}`}>{cat}</button>
        ))}
        <button onClick={() => setUser(null)} className="mt-auto text-yellow-300 font-bold text-xs">LOGOUT</button>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header Mobile */}
        <div className="md:hidden flex justify-between items-center p-4 bg-orange-700 text-white shadow-md">
          <span className="font-bold">KR23 | {user.username}</span>
          <button onClick={() => setShowCartMobile(true)} className="bg-orange-500 p-2 rounded-lg">🛒 {cart.length}</button>
        </div>

        {/* Tabs Mobile */}
        <div className="md:hidden flex overflow-x-auto bg-orange-600 p-2 gap-2 scrollbar-hide">
          {["Makanan", "Minuman", "Jajanan", "Extra"].map(cat => (
            <button key={cat} onClick={() => setActiveTab(cat)} className={`flex-shrink-0 px-4 py-1 rounded-full text-xs font-bold ${activeTab === cat ? 'bg-white text-orange-600' : 'bg-orange-500 text-white'}`}>{cat}</button>
          ))}
        </div>

        {/* Menu Grid */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-orange-800">{activeTab}</h2>
            <div className="bg-white px-4 py-1 rounded-full shadow text-sm">Shift: <span className={db.shiftStatus === 'OPEN' ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>{db.shiftStatus}</span></div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {db.menu.filter(m => m.category === activeTab).map(m => (
              <div key={m.id} className="bg-white p-4 rounded-2xl shadow-sm border border-orange-100 text-center flex flex-col">
                <span className="text-4xl mb-2">{m.img || '🥣'}</span>
                <p className="font-bold text-sm text-gray-800 h-10 overflow-hidden">{m.name}</p>
                <p className="text-orange-600 font-black mb-3">Rp {m.price.toLocaleString()}</p>
                {m.options.length > 0 ? (
                  <div className="flex gap-1">
                    {m.options.map(o => (
                      <button key={o} onClick={() => addToCart(m, o)} className="flex-1 py-2 text-[10px] border border-orange-200 rounded-lg hover:bg-orange-50 leading-tight">
                        {o}<br/><span className="text-[8px] opacity-60">{o==='Nasi'?'+1k':o==='Singkong'?'-1k':''}</span>
                      </button>
                    ))}
                  </div>
                ) : <button onClick={() => addToCart(m)} className="w-full py-2 bg-orange-100 text-orange-700 font-bold rounded-lg hover:bg-orange-500 hover:text-white transition">Tambah</button>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Cart Panel */}
      <div className={`fixed md:relative top-0 right-0 h-full w-full md:w-80 bg-white shadow-2xl transition-all duration-300 transform ${showCartMobile ? 'translate-x-0' : 'translate-x-full md:translate-x-0'} z-50 flex flex-col`}>
        <div className="p-6 border-b flex justify-between items-center">
          <h3 className="font-black text-orange-800">KERANJANG</h3>
          <button onClick={() => setShowCartMobile(false)} className="md:hidden text-gray-400 text-xl">✕</button>
        </div>
        <div className="p-4">
          <input type="text" placeholder="No. Nota / Meja" value={noNota} onChange={e => setNoNota(e.target.value)} className="w-full p-4 bg-yellow-50 border-2 border-yellow-400 rounded-xl text-xl font-bold text-center outline-none placeholder-yellow-300" />
        </div>
        <div className="flex-1 overflow-y-auto px-4 space-y-3">
          {cart.map((item, i) => (
            <div key={i} className="flex justify-between items-center text-sm border-b pb-2 border-orange-50">
              <div><p className="font-bold">{item.name}</p><small className="text-orange-500">{item.option} x{item.qty}</small></div>
              <b className="text-gray-700">{(item.price * item.qty).toLocaleString()}</b>
            </div>
          ))}
        </div>
        <div className="p-6 bg-orange-50 space-y-4">
          <div className="flex justify-between text-lg font-black text-green-700"><span>TOTAL</span><span>Rp {(cart.reduce((a, c) => a + (c.price * c.qty), 0) - diskon).toLocaleString()}</span></div>
          <button onClick={onCheckout} disabled={loading || cart.length === 0} className="w-full py-4 bg-green-600 text-white font-black rounded-2xl shadow-lg hover:bg-green-700 transition disabled:bg-gray-300">{loading ? 'PROSES...' : 'BAYAR'}</button>
        </div>
      </div>

      {/* Receipt Modal */}
      {showReceipt && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4">
          <div className="bg-white p-6 rounded-2xl w-full max-w-xs shadow-2xl">
            <div ref={printRef} className="font-mono text-[11px] leading-tight space-y-1">
              <center><p className="font-bold text-sm">KEDAI RAME 23</p><p>Nota: {lastOrder?.noNota}</p><p>---</p></center>
              {lastOrder?.items.map((it, i) => <div key={i} className="flex justify-between"><span>{it.name} ({it.option}) x{it.qty}</span><span>{(it.price*it.qty).toLocaleString()}</span></div>)}
              <p className="border-t border-dashed border-black pt-1 flex justify-between font-bold"><span>TOTAL</span><span>Rp {lastOrder?.total.toLocaleString()}</span></p>
              <center className="pt-4"><p>Terima Kasih!</p></center>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => window.print()} className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-bold">PRINT</button>
              <button onClick={handleClosePayment} className="flex-1 bg-red-600 text-white py-2 rounded-lg font-bold">TUTUP</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
