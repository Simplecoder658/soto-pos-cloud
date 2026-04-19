import React, { useState, useEffect } from 'react';
import { LayoutGrid, Settings, Trash2, LogOut, RefreshCw, ShoppingBag, Printer, AlertCircle } from 'lucide-react';
import { fetchCloudData, saveOrderToSheet, updateShiftCloud } from './db';

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
  const [orderNumber, setOrderNumber] = useState("");
  const [cloudUsedNumbers, setCloudUsedNumbers] = useState([]);

  const initApp = async () => {
    setIsLoading(true);
    await loadJsPDF();
    const cloud = await fetchCloudData();
    if (cloud) {
      setMenu(cloud.menu || []);
      setUsers(cloud.users || []);
      setConfig({ qris: cloud.qris, shiftStatus: cloud.shiftStatus });
      setCloudUsedNumbers(cloud.usedOrders || []); 
    }
    setIsLoading(false);
  };

  useEffect(() => { initApp(); }, []);

  const isNumberUsed = cloudUsedNumbers.includes(String(orderNumber));

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
    } catch (e) { alert("Gagal Cloud!"); } finally { setIsSyncing(false); }
  };

  const handleCetakPDF = () => {
    if (!lastOrder) return;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "mm", format: [58, 90 + (lastOrder.items.length * 7)] });
    doc.setFont("courier", "bold").setFontSize(14).text("SOTO RA-ME23", 29, 10, { align: "center" });
    doc.setFontSize(7).setFont("courier", "normal").text("Jl. Watumujur II, Lowokwaru, Malang", 29, 14, { align: "center" });
    doc.text("------------------------------------------", 29, 21, { align: "center" });
    doc.setFontSize(10).text("NO. PESANAN", 29, 25, { align: "center" });
    doc.setFontSize(22).setFont("courier", "bold").text(`${lastOrder.no}`, 29, 34, { align: "center" });
    doc.setFontSize(7).setFont("courier", "normal").text(lastOrder.date, 29, 39, { align: "center" });
    doc.text("------------------------------------------", 29, 43, { align: "center" });
    let yPos = 48;
    lastOrder.items.forEach((item) => {
      doc.setFontSize(9).text(`${item.name.substring(0, 15)} x${item.quantity}`, 5, yPos);
      doc.text((item.price * item.quantity).toLocaleString(), 53, yPos, { align: "right" });
      yPos += 6;
    });
    doc.text("------------------------------------------", 29, yPos + 2, { align: "center" });
    doc.setFontSize(11).setFont("courier", "bold").text("TOTAL", 5, yPos + 9).text(`Rp ${lastOrder.total.toLocaleString()}`, 53, yPos + 9, { align: "right" });
    doc.setFontSize(8).text(`KASIR: ${lastOrder.kasir.toUpperCase()}`, 29, yPos + 17, { align: "center" }).text("-- TERIMA KASIH --", 29, yPos + 22, { align: "center" });
    window.open(doc.output("bloburl"), "_blank");
  };

  if (isLoading) return <div className="h-screen flex items-center justify-center font-black text-amber-500 animate-pulse uppercase tracking-[0.3em]">SOTO RA-ME23</div>;
  if (!currentUser) return <LoginScreen users={users} onLogin={setCurrentUser} onRefresh={initApp} />;

  return (
    <div className="h-screen bg-slate-50 flex overflow-hidden font-sans text-slate-900">
      <nav className="w-20 bg-white border-r flex flex-col items-center py-8 justify-between shadow-sm">
        <div className="flex flex-col gap-8">
          <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-white shadow-lg font-black italic text-xl">R</div>
          <button onClick={() => setView('pos')} className={`p-3 rounded-xl transition-all ${view === 'pos' ? 'bg-amber-50 text-amber-600 shadow-inner' : 'text-slate-300'}`}><LayoutGrid size={24}/></button>
          {currentUser.role === 'admin' && <button onClick={() => setView('admin')} className={`p-3 rounded-xl transition-all ${view === 'admin' ? 'bg-slate-100 text-slate-900 shadow-inner' : 'text-slate-300'}`}><Settings size={24}/></button>}
        </div>
        <button onClick={() => setCurrentUser(null)} className="text-slate-300 hover:text-red-500 transition-colors"><LogOut size={24}/></button>
      </nav>

      <div className="flex-1 flex overflow-hidden">
        {view === 'admin' ? (
          <AdminPanel config={config} onRefresh={initApp} usedNumbers={cloudUsedNumbers} resetOrders={() => setCloudUsedNumbers([])} />
        ) : (
          <>
            <main className="flex-1 p-8 overflow-y-auto scrollbar-hide">
              <div className="flex justify-between items-center mb-8">
                <h1 className="text-2xl font-black uppercase italic border-l-8 border-amber-500 pl-4">Menu Soto</h1>
                <button onClick={initApp} className="p-2 text-slate-300 hover:text-amber-500 active:rotate-180 transition-all"><RefreshCw size={22}/></button>
              </div>
              
              {/* FIXED GRID MENU DENGAN TULISAN WRAPPING */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {menu.map(m => (
                  <div key={m.id} onClick={() => {
                    const inCart = cart.find(x => x.id === m.id);
                    setCart(inCart ? cart.map(x => x.id === m.id ? {...x, quantity: x.quantity + 1} : x) : [...cart, {...m, quantity: 1}]);
                  }} className="bg-white p-4 rounded-[2.5rem] border hover:shadow-xl cursor-pointer active:scale-95 transition-all text-center shadow-sm flex flex-col items-center justify-between min-h-[180px]">
                    <div className="text-5xl mb-2 mt-2">{m.img || '🍲'}</div>
                    <div className="w-full flex-1 flex items-center justify-center">
                      <p className="font-black text-[10px] leading-tight uppercase text-slate-600 break-words px-1">
                        {m.name}
                      </p>
                    </div>
                    <p className="text-amber-600 font-black text-sm mt-2">Rp {Number(m.price).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </main>
            
            <aside className="w-[380px] bg-white border-l p-8 flex flex-col shadow-2xl">
              <h2 className="text-[10px] font-black uppercase text-slate-300 mb-6 tracking-widest text-center italic">Checkout</h2>
              <div className="flex-1 overflow-y-auto space-y-4 mb-6 scrollbar-hide">
                {cart.map(item => (
                  <div key={item.id} className="bg-slate-50 p-5 rounded-3xl flex justify-between items-center border border-slate-100">
                    <div className="flex-1 min-w-0 mr-2"><p className="font-black text-[11px] uppercase truncate">{item.name}</p><p className="text-xs font-black text-amber-600">Rp {(item.price * item.quantity).toLocaleString()}</p></div>
                    <div className="flex items-center gap-2 font-black text-xs"><span className="px-3 py-1 bg-white rounded-xl border">{item.quantity}x</span><button onClick={() => setCart(cart.filter(x => x.id !== item.id))} className="text-red-300 hover:text-red-500"><Trash2 size={18}/></button></div>
                  </div>
                ))}
              </div>

              <div className={`mb-6 p-5 rounded-[2.5rem] shadow-xl transition-all ${isNumberUsed ? 'bg-red-50 border-2 border-red-500' : 'bg-slate-900'}`}>
                <p className={`text-[9px] font-black uppercase mb-3 text-center tracking-[0.2em] ${isNumberUsed ? 'text-red-600' : 'text-slate-400'}`}>
                  {isNumberUsed ? 'NOMOR SUDAH TERPAKAI!' : 'No. Pesanan'}
                </p>
                <input type="number" value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} className={`w-full py-4 rounded-2xl text-center text-4xl font-black outline-none transition-all ${isNumberUsed ? 'bg-white text-red-600' : 'bg-slate-800 text-white focus:border-amber-500'}`} placeholder="---" />
              </div>

              <div className="grid grid-cols-2 gap-2 mb-6">
                {['Tunai', 'QRIS'].map(m => (
                  <button key={m} onClick={() => setPaymentMethod(m)} className={`py-5 rounded-2xl border-2 font-black text-[10px] uppercase transition-all ${paymentMethod === m ? 'bg-amber-500 text-white border-amber-500 shadow-lg' : 'bg-white text-slate-300 border-slate-100'}`}>{m}</button>
                ))}
              </div>

              <button onClick={() => paymentMethod === 'QRIS' ? setShowQRModal(true) : handleCheckout()} disabled={isSyncing || cart.length === 0 || !orderNumber || isNumberUsed} className={`w-full py-6 rounded-[2rem] font-black text-sm shadow-xl transition-all uppercase tracking-widest ${!isNumberUsed && orderNumber && cart.length > 0 ? 'bg-slate-900 text-white active:scale-95' : 'bg-slate-100 text-slate-300 cursor-not-allowed'}`}>
                {isSyncing ? 'SINKRON...' : isNumberUsed ? 'NOMOR GANDA' : 'BAYAR'}
              </button>
            </aside>
          </>
        )}
      </div>

      {/* MODAL STRUK & QRIS TETAP SAMA SEPERTI SEBELUMNYA */}
      {showReceipt && lastOrder && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[3rem] shadow-2xl overflow-hidden border-t-[12px] border-amber-600 p-8 text-center">
             <h2 className="text-xl font-black italic mb-4">Soto Ra-Me23</h2>
             <div className="bg-slate-50 py-6 rounded-3xl border-2 mb-6">
                <p className="text-[10px] font-black text-slate-400 uppercase">No. Pesanan</p>
                <p className="text-6xl font-black text-slate-900">#{lastOrder.no}</p>
             </div>
             <div className="grid grid-cols-2 gap-3">
                <button onClick={handleCetakPDF} className="py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-2"><Printer size={18}/> Cetak</button>
                <button onClick={() => setShowReceipt(false)} className="py-5 bg-white border-2 text-slate-400 rounded-2xl font-black uppercase text-[10px]">Tutup</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminPanel({ config, onRefresh, usedNumbers, resetOrders }) {
  return (
    <main className="flex-1 p-10 bg-white overflow-y-auto">
      <h1 className="text-4xl font-black mb-12 text-center uppercase italic tracking-tighter">Admin Panel</h1>
      <div className="max-w-md mx-auto space-y-6">
        <div className="p-8 bg-slate-50 rounded-[3rem] border-2 border-slate-100">
          <p className="text-center font-black text-xs uppercase text-slate-400 mb-4 tracking-widest">No. Pesanan Cloud Terpakai</p>
          <div className="flex flex-wrap gap-2 justify-center mb-6">
            {usedNumbers.length > 0 ? usedNumbers.map(n => (
              <span key={n} className="px-4 py-2 bg-white border font-black rounded-xl text-slate-600 text-sm">#{n}</span>
            )) : <p className="text-slate-300 italic text-sm">Kosong</p>}
          </div>
          <button onClick={() => { if(confirm("Reset semua nomor pesanan di Cloud?")) resetOrders(); }} className="w-full py-4 bg-red-500 text-white rounded-2xl font-black uppercase text-[10px] shadow-lg active:scale-95 transition-all">Reset No. Pesanan</button>
        </div>
        <button onClick={async () => { await updateShiftCloud(config.shiftStatus === 'OPEN' ? 'CLOSED' : 'OPEN'); onRefresh(); }} className="w-full p-10 border-4 border-dashed border-slate-200 rounded-[3.5rem] font-black uppercase text-slate-500 active:bg-slate-50">Shift: {config.shiftStatus}</button>
      </div>
    </main>
  );
}

function LoginScreen({ users, onLogin, onRefresh }) {
  const [pin, setPin] = useState('');
  const handleLogin = (e) => {
    e.preventDefault();
    const user = users.find(u => String(u.pin).trim() === String(pin).trim());
    if (user) onLogin(user); else { alert("PIN SALAH!"); setPin(''); }
  };
  return (
    <div className="h-screen w-screen flex items-center justify-center bg-slate-100 p-4">
      <form onSubmit={handleLogin} className="bg-white p-14 rounded-[4rem] shadow-2xl w-full max-w-sm text-center border-b-[12px] border-amber-500">
        <h2 className="text-3xl font-black mb-10 uppercase italic text-slate-800 tracking-tighter">Soto Ra-Me23</h2>
        <input type="password" value={pin} onChange={(e) => setPin(e.target.value)} className="w-full bg-slate-50 py-6 rounded-3xl text-center text-5xl font-black outline-none border-4 border-transparent focus:border-amber-500 transition-all mb-6" placeholder="••••" autoFocus />
        <button type="submit" className="w-full py-6 bg-slate-900 text-white rounded-3xl font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all">Masuk</button>
        <button type="button" onClick={onRefresh} className="mt-10 text-slate-300 hover:text-amber-500"><RefreshCw size={24} className="mx-auto" /></button>
      </form>
    </div>
  );
}
