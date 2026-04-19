import React, { useState, useEffect } from 'react';
import { LayoutGrid, Settings, Trash2, LogOut, RefreshCw, ShoppingBag, Printer, AlertCircle, X } from 'lucide-react';
import { fetchCloudData, saveOrderToSheet, updateShiftCloud } from './db';

// Loader PDF untuk struk
const loadJsPDF = () => {
  return new Promise((resolve) => {
    if (window.jspdf) return resolve(window.jspdf);
    const script = document.createElement('script');
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
    script.onload = () => resolve(window.jspdf);
    document.head.appendChild(script);
  });
};

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [view, setView] = useState('pos');
  const [menu, setMenu] = useState([]);
  const [users, setUsers] = useState([]);
  const [config, setConfig] = useState({ qris: "", shiftStatus: "CLOSED" });
  const [cart, setCart] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('Tunai');
  const [showQRModal, setShowQRModal] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  const [cloudUsedNumbers, setCloudUsedNumbers] = useState([]);
  
  // --- STATE MODAL ADDON ---
  const [addonModal, setAddonModal] = useState(null);

  const initApp = async () => {
    try {
      setIsLoading(true);
      await loadJsPDF();
      const cloud = await fetchCloudData();
      if (cloud) {
        setMenu(cloud.menu || []);
        setUsers(cloud.users || []);
        setConfig({ qris: cloud.qris || "", shiftStatus: cloud.shiftStatus || "CLOSED" });
        setCloudUsedNumbers(cloud.usedOrders || []);
      }
    } catch (error) {
      console.error("Gagal load data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { initApp(); }, []);

  const isNumberUsed = cloudUsedNumbers.includes(String(orderNumber));

  // --- LOGIKA HARGA & PENAMAAN (FIXED) ---
  const addToCart = (item, addon = "") => {
    let finalName = item.name;
    let finalPrice = Number(item.price);

    const isPorsiAdik = item.id === "M3" || item.id === "M4";

    if (addon === "Lontong") {
      finalName = `${item.name} (Ori)`;
    } else if (addon === "Singkong") {
      finalName = `${item.name} (Singkong)`;
    } else if (addon === "Nasi") {
      finalName = `${item.name} (Nasi)`;
    }

    if (!isPorsiAdik) {
      if (addon === "Singkong") {
        finalPrice = Number(item.price) - 1000;
      } else if (addon === "Nasi") {
        finalPrice = Number(item.price) + 1000;
      }
      // Lontong tetap sesuai item.price (Base)
    }

    const itemKey = finalName;
    const existing = cart.find(x => x.itemKey === itemKey);
    
    if (existing) {
      setCart(cart.map(x => x.itemKey === itemKey ? {...x, quantity: x.quantity + 1} : x));
    } else {
      setCart([...cart, { ...item, name: finalName, price: finalPrice, quantity: 1, itemKey }]);
    }
    setAddonModal(null); // Tutup modal setelah pilih
  };

  const handleMenuClick = (m) => {
    // Memastikan modal muncul jika kolom options di Google Sheet tidak kosong
    if (m.options && m.options !== "" && m.options !== "-") {
      setAddonModal(m);
    } else {
      addToCart(m);
    }
  };

  const handleCheckout = async () => {
    if (cart.length === 0 || !orderNumber || isNumberUsed) return;
    setIsSyncing(true);
    try {
      const total = cart.reduce((s, i) => s + (i.price * i.quantity), 0);
      const orderData = { no: orderNumber, date: new Date().toLocaleString('id-ID'), items: [...cart], total, method: paymentMethod, kasir: currentUser.username };
      await saveOrderToSheet(cart, total, paymentMethod, currentUser.username, orderNumber);
      setCloudUsedNumbers([...cloudUsedNumbers, String(orderNumber)]);
      setLastOrder(orderData);
      setCart([]); setOrderNumber(""); setShowQRModal(false); setShowReceipt(true);
    } catch (e) { alert("Error simpan data!"); } finally { setIsSyncing(false); }
  };

  const handleCetakPDF = () => {
    if (!lastOrder || !window.jspdf) return;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "mm", format: [58, 100] });
    doc.setFont("courier", "bold").setFontSize(10).text("SOTO RA-ME23", 29, 10, { align: "center" });
    doc.setFontSize(20).text(`${lastOrder.no}`, 29, 22, { align: "center" });
    doc.setFontSize(7).setFont("courier", "normal").text(lastOrder.date, 29, 28, { align: "center" });
    let y = 35;
    lastOrder.items.forEach(i => {
      doc.text(`${i.name.substring(0,22)}`, 5, y);
      doc.text(`${i.quantity}x ${ (i.price * i.quantity).toLocaleString() }`, 53, y + 4, { align: "right" });
      y += 8;
    });
    doc.setFont("courier", "bold").text(`TOTAL: Rp ${lastOrder.total.toLocaleString()}`, 5, y + 5);
    window.open(doc.output("bloburl"), "_blank");
  };

  if (isLoading) return <div className="h-screen flex items-center justify-center bg-white font-black text-amber-500 animate-pulse text-2xl italic">SOTO RA-ME23...</div>;
  if (!currentUser) return <LoginScreen users={users} onLogin={setCurrentUser} onRefresh={initApp} />;

  return (
    <div className="h-screen bg-slate-50 flex overflow-hidden font-sans text-slate-900">
      {/* SIDEBAR */}
      <nav className="w-20 bg-white border-r flex flex-col items-center py-8 justify-between shadow-sm">
        <div className="flex flex-col gap-8">
          <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-white shadow-lg font-black italic text-xl">R</div>
          <button onClick={() => setView('pos')} className={`p-3 rounded-xl ${view === 'pos' ? 'bg-amber-50 text-amber-600' : 'text-slate-300'}`}><LayoutGrid size={24}/></button>
          {currentUser.role === 'admin' && <button onClick={() => setView('admin')} className={`p-3 rounded-xl ${view === 'admin' ? 'bg-slate-100 text-slate-900' : 'text-slate-300'}`}><Settings size={24}/></button>}
        </div>
        <button onClick={() => setCurrentUser(null)} className="text-slate-300 hover:text-red-500"><LogOut size={24}/></button>
      </nav>

      <div className="flex-1 flex overflow-hidden">
        {view === 'admin' ? (
          <AdminPanel config={config} onRefresh={initApp} usedNumbers={cloudUsedNumbers} />
        ) : (
          <>
            <main className="flex-1 p-8 overflow-y-auto">
              <div className="flex justify-between items-center mb-8">
                <h1 className="text-2xl font-black uppercase italic border-l-8 border-amber-500 pl-4">Menu Kedai</h1>
                <button onClick={initApp} className="p-2 text-slate-300 hover:text-amber-500"><RefreshCw size={22}/></button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {menu.map(m => (
                  <div key={m.id} onClick={() => handleMenuClick(m)} className="bg-white p-4 rounded-[2.5rem] border hover:shadow-xl cursor-pointer active:scale-95 transition-all text-center flex flex-col items-center justify-between min-h-[160px]">
                    <div className="text-4xl mb-2 mt-2">{m.img || '🍲'}</div>
                    <p className="font-black text-[10px] uppercase text-slate-600 leading-tight">{m.name}</p>
                    <p className="text-amber-600 font-black text-sm mt-2">Rp {Number(m.price).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </main>
            
            <aside className="w-[380px] bg-white border-l p-8 flex flex-col shadow-2xl">
              <div className="flex-1 overflow-y-auto space-y-4 mb-6">
                {cart.map(item => (
                  <div key={item.itemKey} className="bg-slate-50 p-4 rounded-3xl flex justify-between items-center border">
                    <div className="flex-1">
                      <p className="font-black text-[10px] uppercase leading-tight">{item.name}</p>
                      <p className="text-xs font-black text-amber-600">Rp {(item.price * item.quantity).toLocaleString()}</p>
                    </div>
                    <button onClick={() => setCart(cart.filter(x => x.itemKey !== item.itemKey))} className="text-red-300 ml-2"><Trash2 size={18}/></button>
                  </div>
                ))}
              </div>

              <div className={`mb-6 p-5 rounded-[2.5rem] ${isNumberUsed ? 'bg-red-50 border-2 border-red-500' : 'bg-slate-900'}`}>
                <input type="number" value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} className="w-full bg-transparent text-center text-4xl font-black outline-none text-white" placeholder="00" />
                <p className="text-[9px] text-center text-slate-400 font-bold mt-2 uppercase">No. Pesanan</p>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-6">
                {['Tunai', 'QRIS'].map(m => (
                  <button key={m} onClick={() => setPaymentMethod(m)} className={`py-4 rounded-2xl border-2 font-black text-[10px] ${paymentMethod === m ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-slate-300'}`}>{m}</button>
                ))}
              </div>

              <button onClick={() => paymentMethod === 'QRIS' ? setShowQRModal(true) : handleCheckout()} disabled={isSyncing || cart.length === 0 || !orderNumber || isNumberUsed} className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black uppercase disabled:bg-slate-100">
                {isSyncing ? 'SINKRON...' : 'BAYAR'}
              </button>
            </aside>
          </>
        )}
      </div>

      {/* MODAL PILIHAN (NASI, LONTONG, SINGKONG) */}
      {addonModal && (
        <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[3.5rem] p-10 text-center border-t-[12px] border-amber-500 shadow-2xl">
            <h2 className="text-xl font-black mb-8 uppercase italic">{addonModal.name}</h2>
            <div className="space-y-3">
              {addonModal.options.split(',').map(opt => (
                <button 
                  key={opt.trim()} 
                  onClick={() => addToCart(addonModal, opt.trim())} 
                  className="w-full py-5 bg-slate-50 hover:bg-amber-500 hover:text-white rounded-2xl font-black uppercase transition-all border-2"
                >
                  + {opt.trim()}
                </button>
              ))}
              <button onClick={() => setAddonModal(null)} className="w-full py-4 text-slate-300 font-black uppercase text-[10px]">Batal</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL QRIS & RECEIPT */}
      {showQRModal && (
        <div className="fixed inset-0 z-[120] bg-black/80 flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] p-8 w-full max-w-sm text-center">
            <img src={config.qris} className="w-full aspect-square object-contain mb-4" alt="QR" />
            <button onClick={handleCheckout} className="w-full py-5 bg-green-600 text-white rounded-2xl font-black uppercase">Sudah Bayar</button>
          </div>
        </div>
      )}

      {showReceipt && lastOrder && (
        <div className="fixed inset-0 z-[130] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[3rem] p-8 text-center border-t-[12px] border-amber-600">
             <p className="text-6xl font-black mb-6">#{lastOrder.no}</p>
             <div className="grid grid-cols-2 gap-3">
                <button onClick={handleCetakPDF} className="py-5 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase">Cetak Struk</button>
                <button onClick={() => setShowReceipt(false)} className="py-5 bg-white border-2 text-slate-400 rounded-2xl font-black text-[10px] uppercase">Tutup</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminPanel({ config, onRefresh, usedNumbers }) {
  return (
    <main className="flex-1 p-10 bg-white overflow-y-auto">
      <h1 className="text-4xl font-black mb-12 uppercase italic">Admin Panel</h1>
      <div className="p-8 bg-slate-50 rounded-[3rem] border-2 max-w-md mx-auto">
        <p className="font-black text-xs text-slate-400 mb-4 uppercase">No. Terpakai Hari Ini:</p>
        <div className="flex flex-wrap gap-2 mb-6">
          {usedNumbers.map(n => <span key={n} className="px-3 py-1 bg-white border font-black rounded-lg">#{n}</span>)}
        </div>
        <button onClick={async () => { await updateShiftCloud(config.shiftStatus === 'OPEN' ? 'CLOSED' : 'OPEN'); onRefresh(); }} className="w-full py-6 bg-slate-900 text-white rounded-3xl font-black uppercase">
          Status Shift: {config.shiftStatus}
        </button>
      </div>
    </main>
  );
}

function LoginScreen({ users, onLogin, onRefresh }) {
  const [pin, setPin] = useState('');
  const handleLogin = (e) => {
    e.preventDefault();
    const user = users.find(u => String(u.pin) === String(pin));
    if (user) onLogin(user); else { alert("PIN Salah!"); setPin(''); }
  };
  return (
    <div className="h-screen w-screen flex items-center justify-center bg-slate-100 p-6">
      <form onSubmit={handleLogin} className="bg-white p-12 rounded-[4rem] shadow-2xl w-full max-w-sm text-center border-b-[12px] border-amber-500">
        <h2 className="text-3xl font-black mb-10 uppercase italic">Soto Ra-Me23</h2>
        <input type="password" value={pin} onChange={(e) => setPin(e.target.value)} className="w-full bg-slate-50 py-6 rounded-3xl text-center text-5xl font-black outline-none border-4 border-transparent focus:border-amber-500 mb-6" placeholder="••••" />
        <button type="submit" className="w-full py-6 bg-slate-900 text-white rounded-3xl font-black uppercase">Masuk</button>
        <button type="button" onClick={onRefresh} className="mt-8 text-slate-300"><RefreshCw size={24} className="mx-auto" /></button>
      </form>
    </div>
  );
}
