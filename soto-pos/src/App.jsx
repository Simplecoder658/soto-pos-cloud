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
  const [diskon, setDiskon] = useState(0);
  const [cashReceived, setCashReceived] = useState(0); // Untuk kalkulator tunai
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Makanan");
  const [showCart, setShowCart] = useState(false);
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

  const subTotal = cart.reduce((a, c) => a + (c.price * c.qty), 0);
  const totalAkhir = subTotal - diskon;
  const kembalian = cashReceived - totalAkhir;

  const onCheckout = async () => {
    if (payMethod === "Tunai" && cashReceived < totalAkhir) {
      alert("Uang yang diterima kurang!");
      return;
    }
    setLoading(true);
    const res = await saveOrder({ noNota, cart, method: payMethod, kasir: user.username, diskon, total: totalAkhir });
    if (res.status === "OK") {
      setLastOrder({ 
        noNota, items: [...cart], total: totalAkhir, diskon, 
        method: payMethod, cash: cashReceived, change: kembalian,
        time: new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }), 
        kasir: user.username 
      });
      setShowReceipt(true);
      setShowCart(false);
      setDiskon(0);
      setCashReceived(0);
    }
    setLoading(false);
  };

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center bg-orange-500 p-4 font-sans">
      <form onSubmit={(e) => {
        e.preventDefault();
        const found = MASTER_USERS.find(u => u.username === login.username && u.pin === login.pin) 
                    || (db.users && db.users.find(u => u.username === login.username && u.pin === login.pin));
        if (found) setUser(found); else alert("PIN SALAH!");
      }} className="bg-white p-10 rounded-[3rem] w-full max-w-sm shadow-2xl text-center">
        <h1 className="text-4xl font-black text-orange-500 mb-8 italic uppercase leading-none">Kedai<br/>Ra-Me 23</h1>
        <input type="text" placeholder="Username" onChange={e => setLogin({...login, username: e.target.value})} className="w-full p-4 mb-4 bg-gray-50 border rounded-2xl outline-none" required />
        <input type="password" placeholder="PIN" onChange={e => setLogin({...login, pin: e.target.value})} className="w-full p-4 mb-6 bg-gray-50 border rounded-2xl outline-none" required />
        <button className="w-full py-4 bg-orange-500 text-white font-black rounded-2xl shadow-lg">MASUK</button>
      </form>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      
      {/* SIDEBAR */}
      <div className="w-28 bg-white flex flex-col items-center py-6 border-r border-gray-100 z-40 no-print">
        <div className="text-2xl font-black text-orange-500 italic mb-8 uppercase text-center leading-tight">KR23</div>
        <div className="flex flex-col w-full gap-2 px-2 flex-1">
          {["Makanan", "Minuman", "Jajanan", "Extra"].map(cat => (
            <button key={cat} onClick={() => setActiveTab(cat)}
              className={`w-full flex flex-col items-center justify-center py-4 rounded-2xl transition-all ${activeTab === cat ? 'bg-orange-500 text-white shadow-md' : 'text-gray-400 hover:bg-orange-50'}`}>
              <span className="font-black text-[9px] tracking-widest">{cat.toUpperCase()}</span>
            </button>
          ))}
          <button onClick={() => setShowCart(true)} className="relative w-full flex flex-col items-center justify-center py-4 rounded-2xl text-orange-600 hover:bg-orange-50 mt-4 border-2 border-dashed border-orange-200">
            <span className="text-2xl">🛒</span>
            <span className="font-black text-[8px] mt-1">CART ({cart.length})</span>
          </button>
        </div>
        <button onClick={() => setUser(null)} className="w-full py-4 text-[8px] font-black text-gray-400 uppercase">Logout</button>
      </div>

      {/* MAIN AREA */}
      <div className="flex-1 flex flex-col bg-white overflow-hidden no-print">
        <div className="p-6 border-b border-gray-50 flex justify-between items-center">
            <h2 className="text-xl font-black text-gray-800 uppercase italic tracking-tighter">{activeTab}</h2>
            <div className="bg-orange-50 px-4 py-1 rounded-full"><span className="text-[10px] font-black text-orange-600">NOTA: {noNota}</span></div>
        </div>
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {db.menu.filter(m => m.category.toLowerCase() === activeTab.toLowerCase()).map(m => (
              <div key={m.id} className="bg-white rounded-[2rem] p-5 border border-gray-100 shadow-sm flex flex-col hover:border-orange-200 transition-all">
                <div className="text-4xl text-center mb-3">{m.img || '🥣'}</div>
                <h3 className="font-black text-gray-700 text-[11px] text-center h-8 flex items-center justify-center leading-tight mb-1 uppercase">{m.name}</h3>
                <p className="text-orange-500 font-black text-center text-sm mb-4">Rp {m.price.toLocaleString()}</p>
                <div className="mt-auto space-y-2">
                  {m.options && m.options.length > 0 && (
                    <select id={`opt-${m.id}`} className="w-full p-2 text-[10px] bg-orange-50 border border-orange-100 rounded-xl font-black outline-none">
                      {m.options.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  )}
                  <button onClick={() => addToCart(m, m.options?.length > 0 ? document.getElementById(`opt-${m.id}`).value : null)} 
                    disabled={db.shiftStatus === 'CLOSED'}
                    className="w-full py-2 bg-orange-500 text-white rounded-xl text-[10px] font-black transition active:scale-95">TAMBAH</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CART DRAWER */}
      <div className={`fixed inset-y-0 right-0 w-80 bg-white shadow-2xl z-50 transform transition-transform duration-300 flex flex-col no-print ${showCart ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-4 border-b flex justify-between items-center bg-orange-500 text-white font-black uppercase text-xs tracking-widest">
          <span>Keranjang Pesanan</span>
          <button onClick={() => setShowCart(false)} className="text-xl px-2">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.map((item, i) => (
            <div key={i} className="flex justify-between items-center text-xs border-b border-gray-50 pb-2">
              <div className="flex-1"><b className="text-gray-700 uppercase">{item.name}</b><span className="text-[10px] text-orange-500 font-black block">{item.option ? `${item.option} ` : ''}x{item.qty}</span></div>
              <b className="text-gray-800">{(item.price * item.qty).toLocaleString()}</b>
              <button onClick={() => setCart(cart.filter((_, idx) => idx !== i))} className="ml-2 text-red-400 font-bold">✕</button>
            </div>
          ))}
        </div>
        <div className="p-6 bg-gray-50 border-t border-gray-100 space-y-4">
          {/* PEMBAYARAN */}
          <div className="flex gap-2 p-1 bg-white border rounded-xl">
            {["Tunai", "QRIS"].map(m => (
              <button key={m} onClick={() => setPayMethod(m)} className={`flex-1 py-2 text-[10px] font-black rounded-lg transition ${payMethod === m ? 'bg-orange-500 text-white' : 'text-gray-400'}`}>{m}</button>
            ))}
          </div>
          
          {payMethod === "Tunai" && (
            <div className="space-y-2">
              <input type="number" placeholder="Uang Diterima" className="w-full p-3 bg-white border rounded-xl text-sm font-black" 
                value={cashReceived || ''} onChange={(e) => setCashReceived(Number(e.target.value))} />
              <div className="flex justify-between text-[11px] font-black text-gray-500 px-1">
                <span>KEMBALIAN:</span>
                <span className={kembalian < 0 ? 'text-red-500' : 'text-green-600'}>Rp {kembalian.toLocaleString()}</span>
              </div>
            </div>
          )}

          <div className="flex justify-between items-end border-t pt-2">
              <span className="text-[10px] font-black text-gray-400 uppercase italic">Total Bayar</span>
              <span className="text-xl font-black text-orange-600 italic leading-none">Rp {totalAkhir.toLocaleString()}</span>
          </div>
          <button onClick={onCheckout} disabled={cart.length === 0 || loading || (payMethod === "Tunai" && kembalian < 0)} 
            className="w-full py-4 bg-orange-500 text-white rounded-[2rem] font-black shadow-lg disabled:bg-gray-200">PROSES BAYAR</button>
        </div>
      </div>

      {/* STRUK MODAL */}
      {showReceipt && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-[2rem] w-full max-w-xs shadow-2xl receipt-to-print">
                <div className="font-mono text-[11px] text-black leading-tight">
                    <center className="mb-4">
                      <b className="text-[14px] uppercase block">Kedai Ra-Me 23</b>
                      <span className="text-[9px] block font-bold">SPESIALIS SOTO SINGKONG</span>
                      <small className="block mt-1 uppercase text-[8px]">Jl. Watumujur II No.6, Ketawanggede</small>
                      <small className="block uppercase text-[8px]">Lowokwaru, Kota Malang, Jatim 65152</small>
                      <small className="block">--------------------------------</small>
                    </center>
                    <div className="mb-2 text-[9px]">
                        Nota  : {lastOrder.noNota}<br/>
                        Kasir : {lastOrder.kasir}<br/>
                        Waktu : {lastOrder.time}
                    </div>
                    <div className="border-t border-black border-dashed my-2"></div>
                    <div className="space-y-1">
                        {lastOrder.items.map((it, i) => (
                            <div key={i} className="flex justify-between items-start">
                                <span className="flex-1 pr-2 uppercase text-[9px]">{it.name} {it.option ? `(${it.option})` : ''} x{it.qty}</span>
                                <span className="text-[9px]">{(it.price*it.qty).toLocaleString()}</span>
                            </div>
                        ))}
                    </div>
                    <div className="border-t border-black border-dashed my-2"></div>
                    <div className="flex justify-between font-bold text-[11px] mt-1"><span>TOTAL</span><span>Rp {lastOrder.total.toLocaleString()}</span></div>
                    {lastOrder.method === "Tunai" && (
                      <div className="mt-1 space-y-0.5 text-[9px]">
                        <div className="flex justify-between"><span>TUNAI</span><span>{lastOrder.cash.toLocaleString()}</span></div>
                        <div className="flex justify-between"><span>KEMBALIAN</span><span>{lastOrder.change.toLocaleString()}</span></div>
                      </div>
                    )}
                    <div className="border-t border-black border-dashed my-2"></div>
                    <center className="mt-4">
                      <small className="block">Metode: {lastOrder.method}</small>
                      <b className="block mt-2">Terima Kasih, Datang lagi ya!</b>
                    </center>
                </div>
                <div className="flex gap-2 mt-8 no-print">
                    <button onClick={() => window.print()} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg">PRINT</button>
                    <button onClick={() => {setShowReceipt(false); setCart([]); refreshData();}} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold shadow-lg">TUTUP</button>
                </div>
            </div>
        </div>
      )}

      {/* PRINT STYLES */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .receipt-to-print, .receipt-to-print * { visibility: visible; }
          .receipt-to-print { 
            position: fixed; left: 0; top: 0; width: 100%; 
            padding: 0; margin: 0; box-shadow: none !important; border: none !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>
    </div>
  );
}
