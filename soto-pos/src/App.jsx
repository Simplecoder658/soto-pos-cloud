import React, { useState, useEffect } from 'react';
import { LayoutGrid, Settings, Trash2, LogOut, Wallet, Banknote, X, RefreshCw, Camera, ShoppingBag, Printer } from 'lucide-center';
import { fetchCloudData, saveOrderToSheet, updateQrisCloud, updateShiftCloud } from './db';

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

  const initApp = async () => {
    setIsLoading(true);
    const cloud = await fetchCloudData();
    if (cloud) {
      setMenu(cloud.menu || []);
      setUsers(cloud.users || []);
      setConfig({ qris: cloud.qris, shiftStatus: cloud.shiftStatus });
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

  if (isLoading) return <div className="h-screen flex items-center justify-center font-black text-amber-500 animate-pulse uppercase tracking-[0.3em]">Memuat...</div>;
  if (!currentUser) return <LoginScreen users={users} onLogin={(u) => setCurrentUser(u)} onRefresh={initApp} />;

  const categories = ['Semua', 'Makanan', 'Minuman', 'Jajanan'];
  const filteredMenu = activeTab === 'Semua' ? menu : menu.filter(i => i.category === activeTab);

  return (
    <div className="h-screen bg-slate-50 flex overflow-hidden font-sans select-none">
      
      {/* STRUK DIGITAL */}
      {showReceipt && lastOrder && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden border-t-[12px] border-amber-500">
            <div className="p-8 text-center border-b border-dashed">
              <h2 className="text-xl font-black italic uppercase">Soto Cloud</h2>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-sans">Antrean #{lastOrder.no}</p>
            </div>
            <div className="p-8 space-y-4">
              <div className="text-[10px] text-slate-400 font-bold flex justify-between"><span>{lastOrder.date}</span><span>Kasir: {lastOrder.kasir}</span></div>
              <div className="py-4 border-y border-slate-100 space-y-2 text-[11px] font-bold">
                {lastOrder.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between"><span>{item.name} x{item.quantity}</span><span>Rp {(item.price * item.quantity).toLocaleString()}</span></div>
                ))}
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-[10px] font-black uppercase text-slate-400">Total</span>
                <span className="text-2xl font-black italic text-amber-600 font-sans">Rp {lastOrder.total.toLocaleString()}</span>
              </div>
            </div>
            <div className="p-6 bg-slate-50 grid grid-cols-2 gap-3 print:hidden">
              <button onClick={() => window.print()} className="py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-2 tracking-widest"><Printer size={16}/> Print</button>
              <button onClick={() => setShowReceipt(false)} className="py-4 bg-white border-2 border-slate-200 text-slate-400 rounded-2xl font-black uppercase text-[10px] tracking-widest">Tutup</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL QRIS */}
      {showQRModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 text-center">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-sm border-4 border-amber-500 shadow-2xl">
            <div className="flex justify-between items-center mb-6 text-slate-400 font-black text-[10px] uppercase tracking-widest"><span>Scan QRIS</span><button onClick={() => setShowQRModal(false)}><X size={20}/></button></div>
            <img src={config.qris} className="w-full aspect-square object-contain mb-4 border rounded-2xl p-2 bg-white" alt="QRIS" />
            <p className="text-3xl font-black italic mb-6 font-sans tracking-tighter">Rp {cart.reduce((s, i) => s + (i.price * i.quantity), 0).toLocaleString()}</p>
            <button onClick={handleCheckout} className="w-full py-5 bg-green-600 text-white rounded-2xl font-black shadow-lg uppercase tracking-widest active:scale-95 transition-all">Selesai Bayar</button>
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
                <h1 className="text-2xl font-black uppercase italic tracking-tighter decoration-amber-500 decoration-4 underline font-sans">Kasir: {currentUser.username}</h1>
                <button onClick={initApp} className="p-2 text-slate-300 hover:text-amber-500 transition-all"><RefreshCw size={20}/></button>
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
                    if (inCart && inCart.quantity >= m.stock) { alert("Stok Habis!"); return; }
                    setCart(inCart ? cart.map(x => x.id === m.id ? {...x, quantity: x.quantity + 1} : x) : [...cart, {...m, quantity: 1}]);
                  }} className={`bg-white p-4 rounded-[2.5rem] border relative transition-all text-center shadow-sm ${m.stock <= 0 ? 'opacity-40 grayscale' : 'hover:shadow-xl hover:border-amber-200 cursor-pointer active:scale-95'}`}>
                    <div className="absolute top-4 right-4 px-2 py-1 rounded-full text-[8px] font-black bg-slate-100 text-slate-500 font-sans tracking-widest uppercase">{m.stock <= 0 ? 'HABIS' : `STOK: ${m.stock}`}</div>
                    <div className="text-5xl mb-3 mt-4">{m.img || '🍲'}</div>
                    <p className="font-bold text-[10px] uppercase truncate text-slate-600 mb-1">{m.name}</p>
                    <p className="text-amber-600 font-black text-[11px] font-sans italic">Rp {Number(m.price).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </main>
            
            <aside className="w-[380px] bg-white border-l p-8 flex flex-col shadow-2xl">
              <h2 className="text-[10px] font-black uppercase text-slate-400 mb-6 tracking-widest text-center flex items-center justify-center gap-2"><ShoppingBag size={14}/> Keranjang Belanja</h2>
              <div className="flex-1 overflow-y-auto space-y-4 mb-6 scrollbar-hide">
                {cart.map(item => (
                  <div key={item.id} className="bg-slate-50 p-4 rounded-2xl flex justify-between items-center border border-slate-100 shadow-sm">
                    <div className="flex-1 min-w-0 mr-2"><p className="font-bold text-[10px] uppercase truncate">{item.name}</p><p className="text-[11px] font-black text-amber-600 font-sans italic">Rp {(item.price * item.quantity).toLocaleString()}</p></div>
                    <div className="flex items-center gap-2"><span className="font-black text-xs px-2 py-1 bg-white rounded-lg border font-sans">{item.quantity}x</span><button onClick={() => setCart(cart.filter(x => x.id !== item.id))} className="text-red-300 hover:text-red-500 transition-all"><Trash2 size={16}/></button></div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2 mb-6">
                {['Tunai', 'QRIS'].map(m => (
                  <button key={m} onClick={() => setPaymentMethod(m)} className={`py-4 rounded-xl border-2 transition-all flex flex-col items-center gap-1 font-black text-[10px] uppercase tracking-widest ${paymentMethod === m ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-white text-slate-300 border-slate-100'}`}>{m === 'Tunai' ? <Banknote size={16}/> : <Wallet size={16}/>}{m}</button>
                ))}
              </div>
              <div className="pt-6 border-t-4 border-double border-slate-100">
                <div className="flex justify-between items-center mb-6 text-slate-900 font-black italic text-3xl font-sans tracking-tighter"><span>Rp</span><span>{cart.reduce((s, i) => s + (i.price * i.quantity), 0).toLocaleString()}</span></div>
                <button onClick={handleCheckout} disabled={isSyncing || cart.length === 0} className={`w-full py-5 rounded-2xl font-black text-xs shadow-xl transition-all tracking-[0.2em] uppercase ${cart.length === 0 ? 'bg-slate-100 text-slate-300' : 'bg-amber-500 text-white shadow-amber-200 active:scale-95'}`}>{isSyncing ? 'SINKRON...' : `BAYAR SEKARANG`}</button>
              </div>
            </aside>
          </>
        )}
      </div>
    </div>
  );
}

function AdminPanel({ config, onRefresh }) {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      setIsUpdating(true);
      await updateQrisCloud(event.target.result);
      alert("QRIS Berhasil Diupload!");
      onRefresh();
      setIsUpdating(false);
    };
    reader.readAsDataURL(file);
  };

  return (
    <main className="flex-1 p-10 bg-white">
      <h1 className="text-4xl font-black mb-12 text-center uppercase tracking-tighter underline decoration-blue-500 decoration-8 italic font-sans underline-offset-8">Admin Control</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {/* SHIFT CONTROL */}
        <button onClick={async () => { await updateShiftCloud(config.shiftStatus === 'OPEN' ? 'CLOSED' : 'OPEN'); onRefresh(); }} className={`p-10 border-4 border-dashed rounded-[3.5rem] flex flex-col items-center gap-4 transition-all active:scale-95 ${config.shiftStatus === 'OPEN' ? 'border-red-100 bg-red-50/10' : 'border-green-100 bg-green-50/10'}`}>
          <Settings size={40} className={config.shiftStatus === 'OPEN' ? "text-red-500" : "text-green-500"} />
          <span className="font-black text-[10px] uppercase tracking-widest">Shift Status: {config.shiftStatus}</span>
        </button>

        {/* QRIS CONTROL */}
        <div className="p-10 border-4 border-dashed border-slate-100 rounded-[3.5rem] flex flex-col items-center gap-4 bg-slate-50">
          <Camera size={40} className="text-blue-500" />
          <div className="flex gap-2 w-full">
            <label className="flex-1 py-4 bg-blue-500 text-white rounded-2xl font-black text-[9px] uppercase text-center cursor-pointer tracking-widest shadow-lg shadow-blue-100">
              {isUpdating ? "PROSES..." : "UPLOAD FILE"}
              <input type="file" className="hidden" onChange={handleFileUpload} disabled={isUpdating} />
            </label>
            <button onClick={() => { const u = prompt("Masukkan Link Gambar QRIS:"); if(u) updateQrisCloud(u).then(onRefresh); }} className="flex-1 py-4 bg-white border-2 border-slate-200 rounded-2xl font-black text-[9px] uppercase tracking-widest hover:bg-slate-100">PASTE LINK</button>
          </div>
        </div>
      </div>
    </main>
  );
}

function LoginScreen({ users, onLogin, onRefresh }) {
  const [pin, setPin] = useState('');
  return (
    <div className="h-screen w-screen flex items-center justify-center bg-slate-100 p-4 text-center font-sans">
      <div className="bg-white p-14 rounded-[4rem] shadow-2xl w-full max-w-sm border-b-[12px] border-amber-500">
        <div className="w-20 h-20 bg-amber-500 rounded-[1.5rem] flex items-center justify-center text-white mx-auto mb-10 font-black text-4xl italic shadow-xl shadow-amber-100">S</div>
        <h2 className="text-3xl font-black mb-10 uppercase italic tracking-tighter decoration-amber-500 decoration-2">Soto Cloud</h2>
        <form onSubmit={(e) => { e.preventDefault(); const u = users.find(u => String(u.pin) === String(pin)); if(u) onLogin(u); else alert("PIN SALAH"); setPin(''); }} className="space-y-5">
          <input type="password" value={pin} onChange={(e) => setPin(e.target.value)} className="w-full bg-slate-50 py-6 rounded-3xl text-center text-4xl font-black outline-none border-4 border-transparent focus:border-amber-500 transition-all placeholder-slate-200" placeholder="••••" autoFocus />
          <button type="submit" className="w-full py-5 bg-slate-900 text-white rounded-3xl font-black uppercase tracking-[0.2em] text-[10px] shadow-xl active:scale-95">Masuk Kasir</button>
        </form>
        <button onClick={onRefresh} className="mt-10 text-slate-300 hover:text-amber-500 transition-all"><RefreshCw size={22} className="mx-auto" /></button>
      </div>
    </div>
  );
}
