import React, { useState, useEffect, useRef } from 'react';
import { getInitialData, saveOrder, updateShiftStatus } from './db';

export default function App() {
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

  const removeItem = (index) => {
    const newCart = [...cart];
    newCart.splice(index, 1);
    setCart(newCart);
  };

  const onCheckout = async () => {
    if (!noNota) return alert("Isi No Nota!");
    setLoading(true);
    const subtotal = cart.reduce((a, c) => a + (c.price * c.qty), 0);
    const res = await saveOrder({ noNota, total: subtotal, method: payMethod, kasir: user.username, cart });
    if (res.status === "OK") {
      setLastOrder({ noNota, kasir: user.username, items: [...cart], total: subtotal, method: payMethod, time: new Date().toLocaleString('id-ID') });
      setShowReceipt(true);
    }
    setLoading(false);
  };

  const handleClosePayment = () => {
    setShowReceipt(false); setCart([]); setNoNota(""); setPayMethod("Tunai"); setShowCartMobile(false); loadData();
  };

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center bg-orange-500 p-4">
      <div className="bg-white p-8 rounded-3xl w-full max-w-sm shadow-2xl text-center">
        <h1 className="text-orange-600 text-3xl font-black mb-1">KEDAI RAME 23</h1>
        <p className="text-gray-400 text-sm mb-8">Sistem Kasir v2.0</p>
        <form onSubmit={handleLogin} className="space-y-4">
          <input type="text" placeholder="Username" onChange={e => setLogin({...login, username: e.target.value})} className="w-full p-4 border border-gray-200 rounded-2xl outline-none focus:border-orange-500" />
          <input type="password" placeholder="PIN" onChange={e => setLogin({...login, pin: e.target.value})} className="w-full p-4 border border-gray-200 rounded-2xl outline-none focus:border-orange-500" />
          <button type="submit" className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white font-black rounded-2xl shadow-lg transition">MASUK</button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-orange-50 overflow-hidden font-sans">
      {/* Sidebar Laptop */}
      <div className="hidden md:flex flex-col items-center w-24 bg-orange-600 py-8 gap-8 shadow-2xl text-white no-print">
        <div className="font-black text-2xl">KR</div>
        {["Makanan", "Minuman", "Jajanan", "Extra"].map(cat => (
          <button key={cat} onClick={() => setActiveTab(cat)} className={`text-[10px] font-bold uppercase transition ${activeTab === cat ? 'bg-orange-700 w-full py-4 border-r-4 border-white' : 'opacity-60 hover:opacity-100'}`}>{cat}</button>
        ))}
        <button onClick={() => setUser(null)} className="mt-auto text-yellow-300 font-bold text-[10px]">EXIT</button>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden no-print">
        {/* Header Mobile */}
        <div className="md:hidden flex justify-between items-center p-4 bg-orange-600 text-white shadow-lg">
          <span className="font-black">KEDAI RAME 23</span>
          <button onClick={() => setShowCartMobile(true)} className="bg-white text-orange-600 px-4 py-2 rounded-xl font-bold">🛒 {cart.length}</button>
        </div>

        {/* Category Tab Mobile */}
        <div className="md:hidden flex overflow-x-auto bg-orange-500 p-2 gap-2">
          {["Makanan", "Minuman", "Jajanan", "Extra"].map(cat => (
            <button key={cat} onClick={() => setActiveTab(cat)} className={`flex-shrink-0 px-6 py-2 rounded-full text-xs font-bold transition ${activeTab === cat ? 'bg-white text-orange-600' : 'text-white'}`}>{cat}</button>
          ))}
        </div>

        {/* Main Grid Menu */}
        <div className="flex-1 p-4 md:p-8 overflow-y-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {db.menu.filter(m => m.category === activeTab).map(m => (
              <div key={m.id} className="bg-white p-4 rounded-3xl shadow-sm border border-orange-100 flex flex-col items-center text-center">
                <span className="text-4xl mb-2">{m.img || '🥣'}</span>
                <p className="font-bold text-gray-800 text-sm h-10 leading-tight mb-1">{m.name}</p>
                <p className="text-orange-600 font-black mb-4 text-sm">Rp {m.price.toLocaleString()}</p>
                <div className="w-full mt-auto">
                  {m.options.length > 0 ? (
                    <div className="flex gap-1">
                      {m.options.map(o => (
                        <button key={o} onClick={() => addToCart(m, o)} className="flex-1 py-2 text-[10px] bg-orange-50 text-orange-700 rounded-xl hover:bg-orange-500 hover:text-white transition font-bold leading-tight">
                          {o}<br/><span className="text-[8px] opacity-70">{o==='Nasi'?'+1k':o==='Singkong'?'-1k':''}</span>
                        </button>
                      ))}
                    </div>
                  ) : <button onClick={() => addToCart(m)} className="w-full py-3 bg-orange-600 text-white rounded-2xl font-bold text-sm hover:bg-orange-700">Tambah</button>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Cart Panel */}
      <div className={`fixed md:relative top-0 right-0 h-full w-full md:w-96 bg-white shadow-2xl transition-all duration-300 transform ${showCartMobile ? 'translate-x-0' : 'translate-x-full md:translate-x-0'} z-50 flex flex-col no-print`}>
        <div className="p-6 border-b flex justify-between items-center bg-white">
          <h3 className="font-black text-gray-800">PESANAN</h3>
          <button onClick={() => setShowCartMobile(false)} className="md:hidden text-2xl">✕</button>
        </div>

        <div className="p-4 space-y-4">
          <input type="text" placeholder="NO NOTA / MEJA" value={noNota} onChange={e => setNoNota(e.target.value)} className="w-full p-4 bg-yellow-50 border-2 border-yellow-400 rounded-2xl text-center text-2xl font-black text-yellow-700 outline-none placeholder:text-yellow-200" />
          <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
            <button onClick={() => setPayMethod("Tunai")} className={`flex-1 py-2 rounded-lg font-bold text-xs transition ${payMethod === "Tunai" ? "bg-orange-500 text-white shadow" : "text-gray-500"}`}>TUNAI</button>
            <button onClick={() => setPayMethod("QRIS")} className={`flex-1 py-2 rounded-lg font-bold text-xs transition ${payMethod === "QRIS" ? "bg-blue-500 text-white shadow" : "text-gray-500"}`}>QRIS</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 space-y-4">
          {cart.map((item, i) => (
            <div key={i} className="flex justify-between items-center border-b border-orange-50 pb-3">
              <div className="flex-1"><p className="font-bold text-gray-800 text-sm">{item.name}</p><small className="text-orange-500 font-bold">{item.option} x{item.qty}</small></div>
              <div className="flex items-center gap-4"><b className="text-gray-700 text-sm">{(item.price * item.qty).toLocaleString()}</b><button onClick={() => removeItem(i)} className="text-red-400 text-lg font-bold">✕</button></div>
            </div>
          ))}
        </div>

        <div className="p-6 bg-orange-50 border-t border-orange-100 space-y-4">
          {cart.length > 0 && <button onClick={() => setCart([])} className="w-full text-[10px] font-bold text-red-500 mb-2 tracking-widest uppercase">Kosongkan Keranjang</button>}
          <div className="flex justify-between items-center text-xl font-black text-orange-900"><span>TOTAL</span><span>Rp {cart.reduce((a, c) => a + (c.price * c.qty), 0).toLocaleString()}</span></div>
          <button onClick={onCheckout} disabled={loading || cart.length === 0} className="w-full py-5 bg-green-600 hover:bg-green-700 text-white rounded-3xl font-black text-lg shadow-xl transition-all disabled:bg-gray-300 uppercase">
            {loading ? 'Memproses...' : `Bayar (${payMethod})`}
          </button>
        </div>
      </div>

      {/* Modal Print Struk */}
      {showReceipt && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-0 md:p-6 overlay-print">
          <div className="bg-white p-6 rounded-none md:rounded-3xl w-full max-w-xs shadow-2xl print-container">
            <div className="font-mono text-[12px] text-black leading-tight struk-print">
              <center className="mb-4">
                <p className="font-bold text-sm text-center uppercase">Kedai Rame 23</p>
                <p className="text-center">Jl. Pesanggrahan No. 23</p>
                <p className="text-center">--------------------------------</p>
                <div className="text-left text-[10px]">
                  Nota  : {lastOrder?.noNota}<br/>
                  Kasir : {lastOrder?.kasir}<br/>
                  Bayar : {lastOrder?.method}<br/>
                  Waktu : {lastOrder?.time}
                </div>
                <p className="text-center">--------------------------------</p>
              </center>
              <div className="space-y-1 mb-4">
                {lastOrder?.items.map((it, i) => (
                  <div key={i} className="flex justify-between items-start">
                    <span className="flex-1 mr-2">{it.name} {it.option && `(${it.option})`} x{it.qty}</span>
                    <span className="whitespace-nowrap">{(it.price * it.qty).toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <p className="border-t border-black border-dashed pt-2 flex justify-between font-bold text-sm">
                <span>TOTAL</span>
                <span>Rp {lastOrder?.total.toLocaleString()}</span>
              </p>
              <center className="mt-6">
                <p>Terima Kasih!</p>
                <p>Selamat Menikmati</p>
              </center>
            </div>
            <div className="flex gap-2 mt-6 no-print">
              <button onClick={() => window.print()} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold">PRINT</button>
              <button onClick={handleClosePayment} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold">TUTUP</button>
            </div>
          </div>
        </div>
      )}

      {/* TRICK PRINT CSS */}
      <style>{`
        @media print {
          /* Sembunyikan semua elemen kecuali area struk */
          body * { visibility: hidden; }
          .print-container, .print-container * { visibility: visible; }
          
          /* Atur posisi struk agar di pojok kiri atas kertas print */
          .print-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 0;
            box-shadow: none !important;
            border: none !important;
          }
          
          /* Sembunyikan tombol print dan tutup di dalam modal saat ngeprint */
          .no-print { display: none !important; }
          
          /* Hilangkan overlay hitam */
          .overlay-print { background: none !important; }
        }
      `}</style>
    </div>
  );
}
