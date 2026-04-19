import React, { useState, useEffect } from 'react';
import { LayoutGrid, Settings, Trash2, LogOut, RefreshCw, ShoppingBag, Printer, AlertCircle, X } from 'lucide-react';
import { fetchCloudData, saveOrderToSheet, updateShiftCloud } from './db';

// Loader PDF
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
  const [addonModal, setAddonModal] = useState(null);

  // Inisialisasi App
  const initApp = async () => {
    try {
      setIsLoading(true);
      await loadJsPDF();
      const cloud = await fetchCloudData();
      if (cloud) {
        setMenu(cloud.menu || []);
        setUsers(cloud.users || []);
        setConfig({ 
          qris: cloud.qris || "", 
          shiftStatus: cloud.shiftStatus || "CLOSED" 
        });
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

  // Logika Klik Menu (Pop-up Addon)
  const handleMenuClick = (m) => {
    const sotoItems = [
      'Soto Ayam Kampung "Resep Ibu"',
      'Soto Daging "Andalan Bapak"',
      'Soto Ayam Kampung "Porsi Adik"',
      'Soto Daging "Porsi Adik"',
      'Kalsot "Favorit Warga 23"'
    ];

    if (sotoItems.some(name => m.name.includes(name))) {
      setAddonModal(m);
    } else {
      addToCart(m);
    }
  };

  const addToCart = (item, addon = "") => {
    const finalName = addon ? `${item.name} (${addon})` : item.name;
    let finalPrice = Number(item.price);

    // Penyesuaian Harga sesuai PDF
    if (item.name.includes("Resep Ibu") || item.name.includes("Andalan Bapak")) {
      if (addon === "Nasi") finalPrice -= 1000;
      if (addon === "Lontong") finalPrice -= 2000;
    } else if (item.name.includes("Kalsot")) {
      if (addon === "Lontong") finalPrice -= 1000;
    }

    const itemKey = finalName;
    const existing = cart.find(x => x.itemKey === itemKey);
    
    if (existing) {
      setCart(cart.map(x => x.itemKey === itemKey ? {...x, quantity: x.quantity + 1} : x));
    } else {
      setCart([...cart, { ...item, name: finalName, price: finalPrice, quantity: 1, itemKey }]);
    }
    setAddonModal(null);
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
    doc.setFont("courier", "bold").setFontSize(12).text("SOTO RA-ME23", 29, 10, { align: "center" });
    doc.setFontSize(18).text(`${lastOrder.no}`, 29, 25, { align: "center" });
    doc.setFontSize(7).setFont("courier", "normal").text(lastOrder.date, 29, 30, { align: "center" });
    let y = 40;
    lastOrder.items.forEach(i => {
      doc.text(`${i.name.substring(0,20)} x${i.quantity}`, 5, y);
      doc.text((i.price * i.quantity).toLocaleString(), 53, y, { align: "right" });
      y += 5;
    });
    doc.text(`TOTAL: Rp ${lastOrder.total.toLocaleString()}`, 5, y + 5);
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
          <AdminPanel config={config} onRefresh={initApp} usedNumbers={cloudUsedNumbers} resetOrders={() => setCloudUsedNumbers([])} />
        ) : (
          <>
            <main className="flex-1 p-8 overflow-y-auto">
              <div className="flex justify-between items-center mb-8">
                <h1 className="text-2xl font-black uppercase italic border-l-8 border-amber-500 pl-4">Menu</h1>
                <button onClick={initApp} className="p-2 text-slate-300 hover:text-amber-500 transition-all"><RefreshCw size={22}/></button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {menu.map(m => (
                  <div key={m.id} onClick={() => handleMenuClick(m)} className="bg-white p-4 rounded-[2.5rem] border hover:shadow-xl cursor-pointer active:scale-95 transition-all text-center flex flex-col items-center justify-between min-h-[180px]">
                    <div className="text-5xl mb-2 mt-2">{m.img || '🍲'}</div>
                    <div className="w-full flex-1 flex items-center justify-center">
                      <p className="font-black text-[10px] leading-tight uppercase text-slate-600 break-words">{m.name}</p>
                    </div>
                    <p className="text-amber-600 font-black text-sm mt-2">Rp {Number(m.price).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </main>
            
            <aside className="w-[380px] bg-white border-l p-8 flex flex-col shadow-2xl">
              <h2 className="text-[10px] font-black uppercase text-slate-300 mb-6 text-center italic">Checkout</h2>
              <div className="flex-1 overflow-y-auto space-y-4 mb-6">
                {cart.map(item => (
                  <div key={item.itemKey} className="bg-slate-50 p-5 rounded-3xl flex justify-between items-center border">
                    <div className="flex-1 min-w-0 mr-2">
                      <p className="font-black text-[10px] uppercase leading-tight">{item.name}</p>
                      <p className="text-xs font-black text-amber-600">Rp {(item.price * item.quantity).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 bg-white rounded-xl border font-black text-xs">{item.quantity}x</span>
                      <button onClick={() => setCart(cart.filter(x => x.itemKey !== item.itemKey))} className="text-red-300 hover:text-red-500"><Trash2 size={18}/></button>
                    </div>
                  </div>
                ))}
              </div>

              <div className={`mb-6 p-5 rounded-[2.5rem] shadow-xl ${isNumberUsed ? 'bg-red-50 border-2 border-red-500' : 'bg-slate-900'}`}>
                <p className={`text-[9px] font-black uppercase mb-3 text-center ${isNumberUsed ? 'text-red-600' : 'text-slate-400'}`}>No. Pesanan</p>
                <input type="number" value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} className={`w-full py-4 rounded-2xl text-center text-4xl font-black outline-none ${isNumberUsed ? 'bg-white text-red-600' : 'bg-slate-800 text-white'}`} placeholder="---" />
              </div>

              <div className="grid grid-cols-2 gap-2 mb-6">
                {['Tunai', 'QRIS'].map(m => (
                  <button key={m} onClick={() => setPaymentMethod(m)} className={`py-5 rounded-2xl border-2 font-black text-[10px] uppercase ${paymentMethod === m ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-slate-300 border-slate-100'}`}>{m}</button>
                ))}
              </div>

              <button onClick={() => paymentMethod === 'QRIS' ? setShowQRModal(true) : handleCheckout()} disabled={isSyncing || cart.length === 0 || !orderNumber || isNumberUsed} className={`w-full py-6 rounded-[2rem] font-black text-sm uppercase ${!isNumberUsed && orderNumber && cart.length > 0 ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-300'}`}>
                {isSyncing ? 'SINKRON...' : 'BAYAR'}
              </button>
            </aside>
          </>
        )}
      </div>

      {/* MODAL ADDON */}
      {addonModal && (
        <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[3.5rem] p-10 text-center border-t-[12px] border-amber-500">
            <p className="text-[10px] font-black text-slate-400 mb-2 uppercase">Pilih Karbo</p>
            <h2 className="text-xl font-black mb-8 uppercase italic">{addonModal.name}</h2>
            <div className="space-y-3">
              {(addonModal.name.includes("Porsi Adik") || addonModal.name.includes("Kalsot") ? ['Nasi', 'Lontong'] : ['Singkong', 'Nasi', 'Lontong']).map(opt => (
                <button key={opt} onClick={() => addToCart(addonModal, opt)} className="w-full py-5 bg-slate-50 hover:bg-amber-500 hover:text-white rounded-2xl font-black uppercase border-2">
                  + {opt}
                </button>
              ))}
              <button onClick={() => setAddonModal(null)} className="w-full py-4 text-slate-300 font-black uppercase text-[10px]">Batal</button>
            </div>
          </div>
        </div>
      )}

      {/* QRIS & RECEIPT MODALS */}
      {showQRModal && (
        <div className="fixed inset-0 z-[120] bg-black/80 flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] p-8 w-full max-w-sm text-center border-4 border-amber-500">
            <img src={config.qris} className="w-full aspect-square object-contain mb-4 border rounded-3xl p-2 bg-white" alt="QR" />
            <button onClick={handleCheckout} className="w-full py-5 bg-green-600 text-white rounded-2xl font-black uppercase">Sudah Bayar</button>
            <button onClick={() => setShowQRModal(false)} className="mt-4 text-slate-400 text-xs">Batal</button>
          </div>
        </div>
      )}

      {showReceipt && lastOrder && (
        <div className="fixed inset-0 z-[130] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[3rem] p-8 text-center border-t-[12px] border-amber-600">
             <div className="bg-slate-50 py-6 rounded-3xl border-2 mb-6">
                <p className="text-[10px] font-black text-slate-400">NO. PESANAN</p>
                <p className="text-6xl font-black text-slate-900">#{lastOrder.no}</p>
             </div>
             <div className="grid grid-cols-2 gap-3">
                <button onClick={handleCetakPDF} className="py-5 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase">Cetak</button>
                <button onClick={() => setShowReceipt(false)} className="py-5 bg-white border-2 text-slate-400 rounded-2xl font-black text-[10px] uppercase">Tutup</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminPanel({ config, onRefresh, usedNumbers, resetOrders }) {
  const handleToggleShift = async () => {
    const nextStatus = config.shiftStatus === 'OPEN' ? 'CLOSED' : 'OPEN';
    await updateShiftCloud(nextStatus);
    onRefresh();
  };

  return (
    <main className="flex-1 p-10 bg-white overflow-y-auto">
      <h1 className="text-4xl font-black mb-12 text-center uppercase italic">Admin Panel</h1>
      <div className="max-w-md mx-auto space-y-6">
        <div className="p-8 bg-slate-50 rounded-[3rem] border-2">
          <p className="text-center font-black text-xs text-slate-400 mb-4 uppercase">No. Terpakai</p>
          <div className="flex flex-wrap gap-2 justify-center mb-6">
            {usedNumbers.map(n => <span key={n} className="px-3 py-1 bg-white border font-black rounded-lg">#{n}</span>)}
          </div>
          <button onClick={() => { if(confirm("Reset nomor?")) resetOrders(); }} className="w-full py-4 bg-red-500 text-white rounded-2xl font-black uppercase text-[10px]">Reset No. Pesanan</button>
        </div>
        <button onClick={handleToggleShift} className="w-full p-10 border-4 border-dashed border-slate-200 rounded-[3.5rem] font-black uppercase text-slate-500">
          Shift: {config.shiftStatus}
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
    <div className="h-screen w-screen flex items-center justify-center bg-slate-100">
      <form onSubmit={handleLogin} className="bg-white p-14 rounded-[4rem] shadow-2xl w-full max-w-sm text-center border-b-[12px] border-amber-500">
        <h2 className="text-3xl font-black mb-10 uppercase italic">Soto Ra-Me23</h2>
        <input type="password" value={pin} onChange={(e) => setPin(e.target.value)} className="w-full bg-slate-50 py-6 rounded-3xl text-center text-5xl font-black outline-none border-4 border-transparent focus:border-amber-500 mb-6" placeholder="••••" />
        <button type="submit" className="w-full py-6 bg-slate-900 text-white rounded-3xl font-black uppercase tracking-widest shadow-xl active:scale-95">Masuk</button>
        <button type="button" onClick={onRefresh} className="mt-10 text-slate-300 hover:text-amber-500"><RefreshCw size={24} className="mx-auto" /></button>
      </form>
    </div>
  );
}
