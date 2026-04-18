import React, { useState, useEffect, useRef } from 'react';
import { LayoutGrid, Settings, Trash2, LogOut, Wallet, Banknote, X, RefreshCw, Camera, ShoppingBag, Printer } from 'lucide-react';
import { fetchCloudData, saveOrderToSheet, updateQrisCloud, updateShiftCloud } from './db';

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
  const [config, setConfig] = useState({ qris: "", shiftStatus: "" });
  const [cart, setCart] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('Tunai');
  const [showQRModal, setShowQRModal] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState('Semua');
  
  // State Input No. Pesanan Manual
  const [orderNumber, setOrderNumber] = useState("");
  const inputRef = useRef(null);

  const initApp = async () => {
    setIsLoading(true);
    await loadJsPDF();
    const cloud = await fetchCloudData();
    if (cloud) {
      setMenu(cloud.menu || []);
      setUsers(cloud.users || []);
      setConfig({ qris: cloud.qris, shiftStatus: cloud.shiftStatus });
    }
    setIsLoading(false);
  };

  useEffect(() => { initApp(); }, []);

  const handleCetakPDF = () => {
    if (!lastOrder) return;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
      unit: "mm",
      format: [58, 85 + (lastOrder.items.length * 7)]
    });

    doc.setFont("courier", "bold");
    doc.setFontSize(14);
    doc.text("SOTO RA-ME23", 29, 10, { align: "center" });
    
    doc.setFontSize(7);
    doc.setFont("courier", "normal");
    doc.text("Jl. Watumujur II, Ketawanggede", 29, 14, { align: "center" });
    doc.text("Lowokwaru, Kota Malang", 29, 17, { align: "center" });

    doc.text("------------------------------------------", 29, 21, { align: "center" });
    doc.setFontSize(10);
    doc.text("NO. PESANAN", 29, 25, { align: "center" });
    doc.setFontSize(22);
    doc.setFont("courier", "bold");
    doc.text(`${lastOrder.no}`, 29, 34, { align: "center" });
    
    doc.setFontSize(7);
    doc.setFont("courier", "normal");
    doc.text(lastOrder.date, 29, 39, { align: "center" });
    doc.text("------------------------------------------", 29, 43, { align: "center" });

    let yPos = 48;
    doc.setFontSize(9);
    lastOrder.items.forEach((item) => {
      doc.text(`${item.name.substring(0, 15)} x${item.quantity}`, 5, yPos);
      doc.text((item.price * item.quantity).toLocaleString(), 53, yPos, { align: "right" });
      yPos += 6;
    });

    doc.text("------------------------------------------", 29, yPos + 2, { align: "center" });
    doc.setFontSize(11);
    doc.setFont("courier", "bold");
    doc.text("TOTAL", 5, yPos + 9);
    doc.text(`Rp ${lastOrder.total.toLocaleString()}`, 53, yPos + 9, { align: "right" });
    
    doc.setFontSize(8);
    doc.setFont("courier", "normal");
    doc.text(`KASIR: ${lastOrder.kasir.toUpperCase()}`, 29, yPos + 17, { align: "center" });
    doc.text("-- TERIMA KASIH --", 29, yPos + 22, { align: "center" });

    window.open(doc.output("bloburl"), "_blank");
  };

  const handleCheckout = async () => {
    if (cart.length === 0 || !orderNumber) return;

    setIsSyncing(true);
    try {
      const total = cart.reduce((s, i) => s + (i.price * i.quantity), 0);
      const orderData = {
        no: orderNumber,
        date: new Date().toLocaleString('id-ID'),
        items: [...cart],
        total: total,
        method: paymentMethod,
        kasir: currentUser.username
      };
      
      await saveOrderToSheet(cart, total, paymentMethod, currentUser.username);
      setLastOrder(orderData);
      setCart([]); 
      setOrderNumber(""); 
      setShowQRModal(false);
      setShowReceipt(true);
    } catch (e) { alert("Error simpan data!"); } finally { setIsSyncing(false); }
  };

  if (isLoading) return <div className="h-screen flex items-center justify-center font-black text-amber-500 animate-pulse uppercase tracking-[0.3em]">SOTO RA-ME23</div>;
  if (!currentUser) return <LoginScreen users={users} onLogin={(u) => setCurrentUser(u)} onRefresh={initApp} />;

  return (
    <div className="h-screen bg-slate-50 flex overflow-hidden font-sans text-slate-900">
      
      {/* MODAL STRUK */}
      {showReceipt && lastOrder && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[3rem] shadow-2xl overflow-hidden border-t-[12px] border-amber-600">
            <div className="p-8 text-center border-b border-dashed">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Transaksi Berhasil</p>
              <h2 className="text-xl font-black italic mb-4">Soto Ra-Me23</h2>
              <div className="bg-slate-50 py-6 rounded-3xl border-2 border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">No. Pesanan</p>
                <p className="text-6xl font-black text-slate-900 tracking-tighter">#{lastOrder.no}</p>
              </div>
            </div>
            <div className="p-6 grid grid-cols-2 gap-3">
              <button onClick={handleCetakPDF} className="py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-2 active:scale-95 shadow-lg"><Printer size={18}/> Cetak Struk</button>
              <button onClick={() => setShowReceipt(false)} className="py-5 bg-white border-2 border-slate-200 text-slate-400 rounded-2xl font-black uppercase text-[10px] active:scale-95">Selesai</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL QRIS */}
      {showQRModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[3rem] p-8 w-full max-w-sm text-center shadow-2xl border-4 border-amber-500">
            <p className="text-[10px] font-black uppercase text-amber-600 mb-4 tracking-widest">Scan QRIS di Bawah</p>
            <img src={config.qris} className="w-full aspect-square object-contain mb-4 border rounded-3xl p-2 bg-white" />
            <p className="text-3xl font-black italic mb-6">Rp {cart.reduce((s, i) => s + (i.price * i.quantity), 0).toLocaleString()}</p>
            <button onClick={handleCheckout} className="w-full py-5 bg-green-600 text-white rounded-2xl font-black uppercase shadow-lg active:scale-95">Sudah Bayar</button>
          </div>
        </div>
      )}

      {/* SIDEBAR */}
      <nav className="w-20 bg-white border-r flex flex-col items-center py-8 justify-between shadow-sm">
        <div className="flex flex-col gap-8">
          <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-white shadow-lg font-black italic text-xl">R</div>
          <button onClick={() => setView('pos')} className={`p-3 rounded-xl ${view === 'pos' ? 'bg-amber-50 text-amber-600' : 'text-slate-300'}`}><LayoutGrid size={24}/></button>
          {currentUser.role === 'admin' && <button onClick={() => setView('admin')} className={`p-3 rounded-xl ${view === 'admin' ? 'bg-slate-100 text-slate-900' : 'text-slate-300'}`}><Settings size={24}/></button>}
        </div>
        <button onClick={() => setCurrentUser(null)} className="text-slate-300 hover:text-red-500 transition-colors"><LogOut size={24}/></button>
      </nav>

      <div className="flex-1 flex overflow-hidden">
        {view === 'admin' ? (
          <AdminPanel config={config} onRefresh={initApp} />
        ) : (
          <>
            <main className="flex-1 p-8 overflow-y-auto scrollbar-hide">
              <div className="flex justify-between items-center mb-8">
                <h1 className="text-2xl font-black uppercase italic border-l-8 border-amber-500 pl-4">Kasir: {currentUser.username}</h1>
                <button onClick={initApp} className="p-2 text-slate-300 hover:text-amber-500 transition-all active:rotate-180"><RefreshCw size={22}/></button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {menu.map(m => (
                  <div key={m.id} onClick={() => {
                    const inCart = cart.find(x => x.id === m.id);
                    setCart(inCart ? cart.map(x => x.id === m.id ? {...x, quantity: x.quantity + 1} : x) : [...cart, {...m, quantity: 1}]);
                  }} className="bg-white p-6 rounded-[2.5rem] border hover:shadow-xl cursor-pointer active:scale-95 transition-all text-center shadow-sm">
                    <div className="text-5xl mb-3">{m.img || '🍲'}</div>
                    <p className="font-bold text-[10px] uppercase text-slate-500 truncate">{m.name}</p>
                    <p className="text-amber-600 font-black text-sm">Rp {Number(m.price).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </main>
            
            <aside className="w-[380px] bg-white border-l p-8 flex flex-col shadow-2xl relative">
              <h2 className="text-[10px] font-black uppercase text-slate-300 mb-6 tracking-widest text-center italic">Checkout Panel</h2>
              
              <div className="flex-1 overflow-y-auto space-y-4 mb-6 scrollbar-hide">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-200">
                    <ShoppingBag size={48} className="mb-2 opacity-20" />
                    <p className="text-[10px] font-black uppercase tracking-widest">Keranjang Kosong</p>
                  </div>
                ) : cart.map(item => (
                  <div key={item.id} className="bg-slate-50 p-5 rounded-3xl flex justify-between items-center border border-slate-100">
                    <div className="flex-1 min-w-0 mr-2"><p className="font-black text-[11px] uppercase truncate">{item.name}</p><p className="text-xs font-black text-amber-600">Rp {(item.price * item.quantity).toLocaleString()}</p></div>
                    <div className="flex items-center gap-2"><span className="font-black text-xs px-3 py-1 bg-white rounded-xl border">{item.quantity}x</span><button onClick={() => setCart(cart.filter(x => x.id !== item.id))} className="text-red-300 hover:text-red-500"><Trash2 size={18}/></button></div>
                  </div>
                ))}
              </div>

              {/* INPUT NOMOR PESANAN MANUAL */}
              <div className="mb-6 p-5 bg-slate-900 rounded-[2.5rem] shadow-xl shadow-slate-200">
                <p className="text-[9px] font-black uppercase text-slate-400 mb-3 text-center tracking-[0.2em]">Input No. Pesanan</p>
                <input 
                  type="number" 
                  ref={inputRef}
                  value={orderNumber} 
                  onChange={(e) => setOrderNumber(e.target.value)} 
                  className="w-full bg-slate-800 py-4 rounded-2xl text-center text-4xl font-black text-white outline-none border-2 border-transparent focus:border-amber-500 transition-all" 
                  placeholder="---" 
                />
              </div>

              <div className="grid grid-cols-2 gap-2 mb-6">
                {['Tunai', 'QRIS'].map(m => (
                  <button key={m} onClick={() => setPaymentMethod(m)} className={`py-5 rounded-2xl border-2 font-black text-[10px] uppercase transition-all ${paymentMethod === m ? 'bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-100' : 'bg-white text-slate-300 border-slate-100'}`}>{m}</button>
                ))}
              </div>

              <button 
                onClick={() => paymentMethod === 'QRIS' ? setShowQRModal(true) : handleCheckout()} 
                disabled={isSyncing || cart.length === 0 || !orderNumber} 
                className={`w-full py-6 rounded-[2rem] font-black text-sm shadow-xl transition-all uppercase tracking-widest ${cart.length > 0 && orderNumber ? 'bg-slate-900 text-white active:scale-95' : 'bg-slate-100 text-slate-300 cursor-not-allowed'}`}
              >
                {isSyncing ? 'SINKRON DATA...' : `BAYAR Rp ${cart.reduce((s, i) => s + (i.price * i.quantity), 0).toLocaleString()}`}
              </button>
            </aside>
          </>
        )}
      </div>
    </div>
  );
}

function AdminPanel({ config, onRefresh }) {
  return (
    <main className="flex-1 p-10 bg-white overflow-y-auto">
      <h1 className="text-4xl font-black mb-12 text-center uppercase italic tracking-tighter">Admin Panel</h1>
      <div className="max-w-md mx-auto space-y-6">
        <button onClick={async () => { await updateShiftCloud(config.shiftStatus === 'OPEN' ? 'CLOSED' : 'OPEN'); onRefresh(); }} className="w-full p-10 border-4 border-dashed border-slate-200 rounded-[3.5rem] font-black uppercase text-slate-500 active:bg-slate-50 transition-all shadow-sm">Shift Status: {config.shiftStatus}</button>
        <p className="text-center text-slate-300 text-[10px] font-bold uppercase italic tracking-widest">Sistem Nomor Pesanan Manual Aktif</p>
      </div>
    </main>
  );
}

function LoginScreen({ users, onLogin, onRefresh }) {
  const [pin, setPin] = useState('');
  const handleLogin = (e) => {
    e.preventDefault();
    const user = users.find(u => String(u.pin).trim() === String(pin).trim());
    if (user) { onLogin(user); } else { alert("PIN SALAH!"); setPin(''); }
  };
  return (
    <div className="h-screen w-screen flex items-center justify-center bg-slate-100 p-4">
      <form onSubmit={handleLogin} className="bg-white p-14 rounded-[4rem] shadow-2xl w-full max-w-sm text-center border-b-[12px] border-amber-500">
        <div className="w-20 h-20 bg-amber-500 rounded-[1.5rem] flex items-center justify-center text-white mx-auto mb-10 font-black text-4xl italic shadow-xl shadow-amber-100">R</div>
        <h2 className="text-3xl font-black mb-10 uppercase italic text-slate-800">Soto Ra-Me23</h2>
        <input type="password" value={pin} onChange={(e) => setPin(e.target.value)} className="w-full bg-slate-50 py-6 rounded-3xl text-center text-5xl font-black outline-none border-4 border-transparent focus:border-amber-500 transition-all mb-6 placeholder-slate-100" placeholder="••••" autoFocus />
        <button type="submit" className="w-full py-6 bg-slate-900 text-white rounded-3xl font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all">Masuk</button>
        <button type="button" onClick={onRefresh} className="mt-10 text-slate-300 hover:text-amber-500"><RefreshCw size={24} className="mx-auto" /></button>
      </form>
    </div>
  );
}
