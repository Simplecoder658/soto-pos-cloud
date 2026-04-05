import React, { useState, useEffect } from 'react';
import { LayoutGrid, Settings, Trash2, LogOut, Wallet, Banknote, X, RefreshCw, Camera, ShoppingBag, Printer } from 'lucide-react';
import { fetchCloudData, saveOrderToSheet, updateQrisCloud, updateShiftCloud } from './db';

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [view, setView] = useState('pos');
  const [menu, setMenu] = useState([]);
  const [users, setUsers] = useState([]);
  const [config, setConfig] = useState({ qris: "", exitCode: "", shiftStatus: "" });
  const [cart, setCart] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('Tunai');
  const [showQRModal, setShowQRModal] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState('Semua');

  const initApp = async () => {
    setIsLoading(true);
    const cloud = await fetchCloudData();
    if (cloud) {
      setMenu(cloud.menu || []);
      setUsers(cloud.users || []);
      setConfig({ qris: cloud.qris, exitCode: cloud.exitCode, shiftStatus: cloud.shiftStatus });
    }
    setIsLoading(false);
  };

  useEffect(() => { initApp(); }, []);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (config.shiftStatus === 'CLOSED' && currentUser.role !== 'admin') { 
      alert("SHIFT TUTUP!"); return; 
    }
    if (paymentMethod === 'QRIS' && !showQRModal) { setShowQRModal(true); return; }
    
    setIsSyncing(true);
    try {
      const total = cart.reduce((s, i) => s + (i.price * i.quantity), 0);
      const orderData = {
        no: Math.floor(100 + Math.random() * 900),
        date: new Date().toLocaleString('id-ID'),
        items: [...cart],
        total: total,
        method: paymentMethod,
        kasir: currentUser.username
      };
      await saveOrderToSheet(cart, total, paymentMethod, currentUser.username);
      setLastOrder(orderData);
      setCart([]); 
      setShowQRModal(false);
      setShowReceipt(true);
      await initApp();
    } catch (e) { alert("KONEKSI ERROR!"); } finally { setIsSyncing(false); }
  };

  if (isLoading) return <div className="h-screen flex items-center justify-center font-black text-amber-500 animate-pulse uppercase tracking-[0.3em]">Memuat Data...</div>;
  if (!currentUser) return <LoginScreen users={users} shiftStatus={config.shiftStatus} onLogin={(u) => setCurrentUser(u)} onRefresh={initApp} />;

  const categories = ['Semua', 'Makanan', 'Minuman', 'Jajanan'];
  const filteredMenu = activeTab === 'Semua' ? menu : menu.filter(i => i.category === activeTab);

  return (
    <div className="h-screen bg-slate-50 flex overflow-hidden font-sans select-none">
      
      {/* MODAL STRUK DIGITAL */}
      {showReceipt && lastOrder && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden border-t-[12px] border-amber-500">
            <div className="p-8 text-center border-b border-dashed">
              <h2 className="text-xl font-black italic uppercase">Soto Cloud</h2>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Antrean #{lastOrder.no}</p>
            </div>
            <div className="p-8 space-y-4">
              <div className="text-[10px] text-slate-400 font-bold flex justify-between">
                <span>{lastOrder.date}</span>
                <span>Kasir: {lastOrder.kasir}</span>
              </div>
              <div className="py-4 border-y border-slate-100 space-y-2">
                {lastOrder.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-[11px] font-bold">
                    <span>{item.name} x{item.quantity}</span>
                    <span>Rp {(item.price * item.quantity).toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-[10px] font-black uppercase text-slate-400">Total ({lastOrder.method})</span>
                <span className="text-2xl font-black italic text-amber-600">Rp {lastOrder.total.toLocaleString()}</span>
              </div>
            </div>
            <div className="p-6 bg-slate-50 grid grid-cols-2 gap-3 print:hidden">
              <button onClick={() => window.print()} className="py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2"><Printer size={16}/> Print</button>
              <button onClick={() => setShowReceipt(false)} className="py-4 bg-white border-2 border-slate-200 text-slate-400 rounded-2xl font-black uppercase tracking-widest text-[10px]">Tutup</button>
            </div>
          </div>
        </div>
      )}

      {/* QRIS MODAL */}
      {showQRModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-sm text-center border-4 border-amber-500 shadow-2xl">
            <div className="flex justify-between items-center mb-6 text-slate-400 font-black text-[10px] uppercase"><span>Scan QRIS</span><button onClick={() => setShowQRModal(false)}><X size={20}/></button></div>
            <img src={config.qris} className="w-full aspect-square object-contain mb-4 border rounded-xl p-2 bg-white" alt="QRIS" />
            <p className="text-3xl font-black italic mb-6">Rp {cart.reduce((s, i) => s + (i.price * i.quantity), 0).toLocaleString()}</p>
            <button onClick={handleCheckout} className="w-full py-5 bg-green-600 text-white rounded-2xl font-black shadow-lg uppercase tracking-widest hover:bg-green-700 active:scale-95 transition-all">Selesai Bayar</button>
          </div>
        </div>
      )}

      {/* SIDE NAV */}
      <nav className="w-20 bg-white border-r flex flex-col items-center py-8 justify-between shadow-sm">
        <div className="flex flex-col gap-8">
          <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-white shadow-lg font-black italic text-xl">S</div>
          <button onClick={() => setView('pos')} className={`p-3 rounded-xl transition-all ${view === 'pos' ? 'bg-amber-50 text-amber-600' : 'text-slate-300'}`}><LayoutGrid size={24}/></button>
          {currentUser.role === 'admin' && <button onClick={() => setView('admin')} className={`p-3 rounded-xl transition-all ${view === 'admin' ? 'bg-slate-100 text-slate-900' : 'text-slate-300'}`}><Settings size={24}/></button>}
        </div>
        <button onClick={() => setCurrentUser(null)} className="text-slate-300 hover:text-red-500"><LogOut size={24}/></button>
      </nav>

      <div className="flex flex-1 overflow-hidden">
        {view === 'admin' ? (
          <AdminPanel config={config} onRefresh={initApp} />
        ) : (
          <>
            <main className="flex-1 p-8 overflow-y-auto bg-white/50">
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-black uppercase italic tracking-tighter decoration-amber-500 decoration-4 underline">Kasir: {currentUser.username}</h1>
                <button onClick={initApp} className="p-2 text-slate-300 hover:text-amber-500"><RefreshCw size={20}/></button>
              </div>
              <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
                {categories.map(cat => (
                  <button key={cat} onClick={() => setActiveTab(cat)} className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === cat ? 'bg-amber-500 text-white shadow-lg shadow-amber-200' : 'bg-white text-slate-400 border border-slate-100'}`}>{cat}</button>
                ))}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {filteredMenu.map(m => (
                  <div key={m.id} onClick={() => {
                    if (m.stock <= 0) return;
                    const inCart = cart.find(x => x.id === m.id);
                    setCart(inCart ? cart.map(x => x.id === m.id ? {...x, quantity: x.quantity + 1} : x) : [...cart, {...m, quantity: 1}]);
                  }} className={`bg-white p-4 rounded-[2.5rem] border relative transition-all text-center ${m.stock <= 0 ? 'opacity-40 grayscale' : 'hover:shadow-xl hover:border-amber-200 cursor-pointer active:scale-95'}`}>
                    <div className="absolute top-4 right-4 px-2 py-1 rounded-full text-[8px] font-black bg-slate-100 text-slate-500">{m.stock <= 0 ? 'HABIS' : `STOK: ${m.stock}`}</div>
                    <div className="text-5xl mb-3 mt-4">{m.img || '🍲'}</div>
                    <p className="font-bold text-[10px] uppercase truncate text-slate-600">{m.name}</p>
                    <p className="text-amber-600 font-black text-[11px]">Rp {Number(m.price).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </main>
            <aside className="w-[380px] bg-white border-l p-8 flex flex-col shadow-2xl">
              <h2 className="text-[10px] font-black uppercase text-slate-400 mb-6 tracking-widest text-center flex items-center justify-center gap-2"><ShoppingBag size={14}/> Keranjang</h2>
              <div className="flex-1 overflow-y-auto space-y-4 mb-6">
                {cart.map(item => (
                  <div key={item.id} className="bg-slate-50 p-4 rounded-2xl flex justify-between items-center border border-slate-100 shadow-sm">
                    <div className="flex-1 min-w-0 mr-2"><p className="font-bold text-[10px] uppercase truncate">{item.name}</p><p className="text-[11px] font-black text-amber-600">Rp {(item.price * item.quantity).toLocaleString()}</p></div>
                    <div className="flex items-center gap-2"><span className="font-black text-xs px-2 py-1 bg-white rounded-lg border">{item.quantity}x</span><button onClick={() => setCart(cart.filter(x => x.id !== item.id))} className="text-red-300 hover:text-red-500"><Trash2 size={16}/></button></div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2 mb-6">
                {['Tunai', 'QRIS'].map(m => (
                  <button key={m} onClick={() => setPaymentMethod(m)} className={`py-4 rounded-xl text-[10px] font-black border-2 transition-all flex flex-col items-center gap-1 ${paymentMethod === m ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-white text-slate-300 border-slate-100'}`}>{m === 'Tunai' ? <Banknote size={16}/> : <Wallet size={16}/>}{m}</button>
                ))}
              </div>
              <div className="pt-6 border-t-4 border-double border-slate-100">
                <div className="flex justify-between items-center mb-6 text-slate-900 font-black italic text-3xl"><span>Rp</span><span>{cart.reduce((s, i) => s + (i.price * i.quantity), 0).toLocaleString()}</span></div>
                <button onClick={handleCheckout} disabled={isSyncing || cart.length === 0} className={`w-full py-5 rounded-2xl font-black text-xs shadow-xl transition-all ${cart.length === 0 ? 'bg-slate-100 text-slate-300' : 'bg-amber-500 text-white shadow-amber-200 active:scale-95'}`}>{isSyncing ? 'PROSES...' : `BAYAR SEKARANG`}</button>
              </div>
            </aside>
          </>
        )}
      </div>
    </div>
  );
}

function AdminPanel({ config, onRefresh }) {
  return (
    <main className="flex-1 p-10 bg-white">
      <h1 className="text-4xl font-black mb-12 text-center uppercase tracking-tighter underline decoration-blue-500 decoration-8">Admin Control</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 max-w-4xl mx-auto">
        <button onClick={async () => { const next = config.shiftStatus === 'OPEN' ? 'CLOSED' : 'OPEN'; await updateShiftCloud(next); onRefresh(); }} className={`p-14 border-4 border-dashed rounded-[3.5rem] flex flex-col items-center gap-5 transition-all ${config.shiftStatus === 'OPEN' ? 'border-red-100 hover:bg-red-50' : 'border-green-100 hover:bg-green-50'}`}>
          <Settings size={48} className={config.shiftStatus === 'OPEN' ? "text-red-500" : "text-green-500"} />
          <span className="font-black text-[10px] uppercase tracking-[0.2em]">{config.shiftStatus === 'OPEN' ? 'Tutup Shift' : 'Buka Shift'}</span>
        </button>
        <button onClick={() => { const url = prompt("Link QRIS:"); if(url) updateQrisCloud(url).then(onRefresh); }} className="p-14 border-4 border-dashed border-slate-100 rounded-[3.5rem] flex flex-col items-center gap-5 hover:bg-blue-50">
          <Camera size={48} className="text-blue-500" /><span className="font-black text-[10px] uppercase tracking-[0.2em]">Update QRIS</span>
        </button>
      </div>
    </main>
  );
}

function LoginScreen({ users, onLogin, onRefresh }) {
  const [pin, setPin] = useState('');
  return (
    <div className="h-screen w-screen flex items-center justify-center bg-slate-100 p-4 text-center">
      <div className="bg-white p-14 rounded-[4rem] shadow-2xl w-full max-w-sm border-b-[12px] border-amber-500">
        <div className="w-20 h-20 bg-amber-500 rounded-[1.5rem] flex items-center justify-center text-white mx-auto mb-10 font-black text-4xl italic">S</div>
        <h2 className="text-3xl font-black mb-10 uppercase italic">Soto Cloud</h2>
        <form onSubmit={(e) => { e.preventDefault(); const u = users.find(u => String(u.pin) === String(pin)); if(u) onLogin(u); else alert("PIN SALAH"); setPin(''); }} className="space-y-5">
          <input type="password" value={pin} onChange={(e) => setPin(e.target.value)} className="w-full bg-slate-50 py-6 rounded-3xl text-center text-4xl font-black outline-none border-4 border-transparent focus:border-amber-500" placeholder="PIN" autoFocus />
          <button type="submit" className="w-full py-5 bg-slate-900 text-white rounded-3xl font-black uppercase tracking-widest text-[10px]">Masuk</button>
        </form>
        <button onClick={onRefresh} className="mt-10 text-slate-300"><RefreshCw size={22} className="mx-auto" /></button>
      </div>
    </div>
  );
}
