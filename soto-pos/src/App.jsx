import React, { useState, useEffect } from 'react';
import { LayoutGrid, Settings, Trash2, LogOut, Wallet, Banknote, X, RefreshCw, Camera, Maximize, Lock, Unlock } from 'lucide-react';
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
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState('Semua');
  const [isFullscreen, setIsFullscreen] = useState(false);

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

  useEffect(() => {
    initApp();
    const fsHandler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', fsHandler);
    return () => document.removeEventListener('fullscreenchange', fsHandler);
  }, []);

  const enterFS = () => { 
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  };
  
  const exitFSSafe = () => {
    if (currentUser?.role === 'admin') { 
      document.exitFullscreen(); 
      return; 
    }
    const input = prompt("SISTEM TERKUNCI! Masukkan KODE EXIT Admin:");
    if (input === config.exitCode) {
      document.exitFullscreen();
    } else {
      alert("KODE SALAH! Kasir dilarang keluar mode layar penuh.");
    }
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (config.shiftStatus === 'CLOSED' && currentUser.role !== 'admin') { 
      alert("TRANSAKSI GAGAL: Shift sedang ditutup admin!"); 
      return; 
    }
    if (paymentMethod === 'QRIS' && !showQRModal) { setShowQRModal(true); return; }
    
    setIsSyncing(true);
    try {
      const total = cart.reduce((s, i) => s + (i.price * i.quantity), 0);
      await saveOrderToSheet(cart, total, paymentMethod, currentUser.username);
      setCart([]); 
      setShowQRModal(false); 
      alert("TRANSAKSI BERHASIL!"); 
      await initApp();
    } catch (e) { 
      alert("KONEKSI ERROR!"); 
    } finally { 
      setIsSyncing(false); 
    }
  };

  if (isLoading) return <div className="h-screen flex items-center justify-center font-black text-amber-500 animate-pulse uppercase tracking-[0.3em]">Menghubungkan Cloud...</div>;
  if (!currentUser) return <LoginScreen users={users} shiftStatus={config.shiftStatus} onLogin={(u) => { setCurrentUser(u); enterFS(); }} onRefresh={initApp} />;

  const categories = ['Semua', ...new Set(menu.map(i => i.category).filter(Boolean))];
  const filteredMenu = activeTab === 'Semua' ? menu : menu.filter(i => i.category === activeTab);

  return (
    <div className="h-screen bg-slate-50 flex overflow-hidden font-sans select-none">
      {/* QRIS MODAL */}
      {showQRModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-sm text-center border-4 border-amber-500 shadow-2xl">
            <div className="flex justify-between items-center mb-6 text-slate-400 font-black text-[10px] uppercase"><span>Scan Pembayaran</span><button onClick={() => setShowQRModal(false)}><X size={20}/></button></div>
            <img src={config.qris} className="w-full aspect-square object-contain mb-4 border rounded-xl p-2 bg-white" alt="QRIS" />
            <p className="text-3xl font-black italic mb-6">Rp {cart.reduce((s, i) => s + (i.price * i.quantity), 0).toLocaleString()}</p>
            <button onClick={handleCheckout} className="w-full py-5 bg-green-600 text-white rounded-2xl font-black shadow-lg uppercase tracking-widest hover:bg-green-700 active:scale-95 transition-all">Selesai Bayar</button>
          </div>
        </div>
      )}

      {/* SIDE NAV */}
      <nav className="w-20 bg-white border-r flex flex-col items-center py-8 justify-between shadow-sm">
        <div className="flex flex-col gap-8">
          <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-white shadow-lg font-black italic text-xl shadow-amber-200">S</div>
          <button onClick={() => setView('pos')} className={`p-3 rounded-xl transition-all ${view === 'pos' ? 'bg-amber-50 text-amber-600' : 'text-slate-300 hover:text-slate-500'}`}><LayoutGrid size={24}/></button>
          {currentUser.role === 'admin' && <button onClick={() => setView('admin')} className={`p-3 rounded-xl transition-all ${view === 'admin' ? 'bg-slate-100 text-slate-900' : 'text-slate-300 hover:text-slate-500'}`}><Settings size={24}/></button>}
        </div>
        <div className="flex flex-col gap-4">
          <button onClick={exitFSSafe} title="Layar Penuh" className="text-slate-300 hover:text-amber-500 transition-all"><Maximize size={24}/></button>
          <button onClick={() => { setCurrentUser(null); setView('pos'); }} className="text-slate-300 hover:text-red-500 transition-all"><LogOut size={24}/></button>
        </div>
      </nav>

      <div className="flex flex-1 overflow-hidden">
        {view === 'admin' ? (
          <AdminPanel config={config} onRefresh={initApp} />
        ) : (
          <>
            <main className="flex-1 p-8 overflow-y-auto bg-white/50">
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-black uppercase italic tracking-tighter decoration-amber-500 decoration-4 underline">Kasir: {currentUser.username}</h1>
                <button onClick={initApp} className="p-2 text-slate-300 hover:text-amber-500 transition-all"><RefreshCw size={20}/></button>
              </div>

              {config.shiftStatus === 'CLOSED' && <div className="bg-red-500 text-white p-4 mb-6 rounded-2xl font-black text-center uppercase tracking-widest text-[10px] animate-pulse shadow-lg">Shift Ditutup Admin</div>}
              
              <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
                {categories.map(cat => (
                  <button key={cat} onClick={() => setActiveTab(cat)} className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === cat ? 'bg-amber-500 text-white shadow-lg shadow-amber-200' : 'bg-white text-slate-400 border border-slate-100 hover:bg-slate-50'}`}>{cat}</button>
                ))}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {filteredMenu.map(m => {
                  const isOutOfStock = m.stock <= 0;
                  const isShiftClosed = config.shiftStatus === 'CLOSED' && currentUser.role !== 'admin';
                  return (
                    <div key={m.id} onClick={() => {
                      if (isOutOfStock || isShiftClosed) return;
                      const inCart = cart.find(x => x.id === m.id);
                      if (inCart && inCart.quantity >= m.stock) { alert("Stok tidak mencukupi!"); return; }
                      setCart(inCart ? cart.map(x => x.id === m.id ? {...x, quantity: x.quantity + 1} : x) : [...cart, {...m, quantity: 1}]);
                    }} className={`bg-white p-4 rounded-[2.5rem] border relative transition-all text-center ${isOutOfStock || isShiftClosed ? 'opacity-40 grayscale cursor-not-allowed' : 'hover:shadow-xl hover:border-amber-200 cursor-pointer active:scale-95 shadow-sm'}`}>
                      <div className={`absolute top-4 right-4 px-2 py-1 rounded-full text-[8px] font-black ${isOutOfStock ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-500'}`}>{isOutOfStock ? 'HABIS' : `STOK: ${m.stock}`}</div>
                      <div className="text-5xl mb-3 mt-4 group-hover:scale-110 transition-transform duration-300">{m.img || '🍲'}</div>
                      <p className="font-bold text-[10px] uppercase truncate mb-1 text-slate-600">{m.name}</p>
                      <p className="text-amber-600 font-black text-[11px]">Rp {m.price.toLocaleString()}</p>
                    </div>
                  );
                })}
              </div>
            </main>

            {/* CART SIDEBAR */}
            <aside className="w-[380px] bg-white border-l p-8 flex flex-col shadow-2xl">
              <h2 className="text-[10px] font-black uppercase text-slate-400 mb-6 tracking-widest text-center">Keranjang Belanja</h2>
              <div className="flex-1 overflow-y-auto space-y-4 mb-6">
                {cart.length === 0 && <div className="h-full flex items-center justify-center text-slate-300 italic text-[10px] font-medium tracking-widest">ORDERAN KOSONG</div>}
                {cart.map(item => (
                  <div key={item.id} className="bg-slate-50 p-4 rounded-2xl flex justify-between items-center border border-slate-100 shadow-sm animate-in slide-in-from-right duration-300">
                    <div className="flex-1 min-w-0 mr-2"><p className="font-bold text-[10px] uppercase truncate">{item.name}</p><p className="text-[11px] font-black text-amber-600">Rp {(item.price * item.quantity).toLocaleString()}</p></div>
                    <div className="flex items-center gap-2"><span className="font-black text-xs px-2 py-1 bg-white rounded-lg border">{item.quantity}x</span><button onClick={() => setCart(cart.filter(x => x.id !== item.id))} className="text-red-300 hover:text-red-500 transition-all"><Trash2 size={16}/></button></div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2 mb-6">
                {['Tunai', 'QRIS'].map(m => (
                  <button key={m} onClick={() => setPaymentMethod(m)} className={`py-4 rounded-xl text-[10px] font-black border-2 transition-all flex flex-col items-center gap-1 ${paymentMethod === m ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-white text-slate-300 border-slate-100 hover:border-slate-200'}`}>{m === 'Tunai' ? <Banknote size={16}/> : <Wallet size={16}/>}{m}</button>
                ))}
              </div>
              <div className="pt-6 border-t-4 border-double border-slate-100">
                <div className="flex justify-between items-center mb-6 text-slate-900 font-black italic"><span className="text-slate-400 text-[10px] uppercase">Total Bayar</span><span className="text-3xl tracking-tighter">Rp {cart.reduce((s, i) => s + (i.price * i.quantity), 0).toLocaleString()}</span></div>
                <button onClick={handleCheckout} disabled={isSyncing || cart.length === 0} className={`w-full py-5 rounded-2xl font-black text-xs shadow-xl transition-all ${cart.length === 0 ? 'bg-slate-100 text-slate-300 cursor-not-allowed' : 'bg-amber-500 text-white hover:bg-amber-600 shadow-amber-200 active:scale-95'}`}>{isSyncing ? 'MEMPROSES...' : `BAYAR SEKARANG`}</button>
              </div>
            </aside>
          </>
        )}
      </div>
    </div>
  );
}

function AdminPanel({ config, onRefresh }) {
  const handleUpdate = async () => {
    const url = prompt("MASUKKAN LINK FOTO QRIS BARU:");
    if(url) { await updateQrisCloud(url); alert("SUKSES!"); onRefresh(); }
  };
  const toggleShift = async () => {
    const next = config.shiftStatus === 'OPEN' ? 'CLOSED' : 'OPEN';
    await updateShiftCloud(next); 
    alert(`SHIFT BERHASIL DIATUR KE: ${next.toUpperCase()}`); 
    onRefresh();
  };
  return (
    <main className="flex-1 p-10 bg-white">
      <h1 className="text-4xl font-black mb-12 italic uppercase text-slate-900 text-center tracking-tighter underline decoration-blue-500 decoration-8 underline-offset-8">Admin Control</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 max-w-4xl mx-auto">
        <button onClick={toggleShift} className={`p-14 border-4 border-dashed rounded-[3.5rem] flex flex-col items-center gap-5 transition-all group active:scale-95 ${config.shiftStatus === 'OPEN' ? 'border-red-100 hover:bg-red-50' : 'border-green-100 hover:bg-green-50'}`}>
          {config.shiftStatus === 'OPEN' ? <Lock size={48} className="text-red-500 group-hover:scale-110" /> : <Unlock size={48} className="text-green-500 group-hover:scale-110" />}
          <span className="font-black text-[10px] uppercase tracking-[0.2em]">{config.shiftStatus === 'OPEN' ? 'Tutup Shift Sekarang' : 'Buka Shift Sekarang'}</span>
        </button>
        <button onClick={handleUpdate} className="p-14 border-4 border-dashed border-slate-100 rounded-[3.5rem] flex flex-col items-center gap-5 hover:bg-blue-50 group active:scale-95">
          <Camera size={48} className="text-blue-500 group-hover:rotate-12 transition-transform" /><span className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-400">Update Gambar QRIS</span>
        </button>
        <button onClick={onRefresh} className="p-14 border-4 border-dashed border-slate-100 rounded-[3.5rem] flex flex-col items-center gap-5 hover:bg-amber-50 group active:scale-95 sm:col-span-2">
          <RefreshCw size={48} className="text-amber-500 group-hover:rotate-180 transition-transform duration-700" /><span className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-400">Sinkronisasi Data Cloud</span>
        </button>
      </div>
    </main>
  );
}

function LoginScreen({ users, shiftStatus, onLogin, onRefresh }) {
  const [pin, setPin] = useState('');
  const submitLogin = (e) => {
    e.preventDefault();
    const u = users.find(u => String(u.pin).trim() === String(pin).trim());
    if (u) {
      if (shiftStatus === 'CLOSED' && u.role !== 'admin') { 
        alert("AKSES DITOLAK: Shift sedang ditutup oleh Admin."); 
        return; 
      }
      onLogin(u);
    } else { alert("PIN SALAH!"); setPin(''); }
  };
  return (
    <div className="h-screen w-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="bg-white p-14 rounded-[4rem] shadow-2xl w-full max-w-sm text-center border-b-[12px] border-amber-500">
        <div className="w-20 h-20 bg-amber-500 rounded-[1.5rem] flex items-center justify-center text-white shadow-xl mx-auto mb-10 font-black text-4xl italic shadow-amber-200 animate-bounce">S</div>
        <h2 className="text-3xl font-black mb-4 uppercase text-slate-900 italic tracking-tighter">Soto POS Cloud</h2>
        {shiftStatus === 'CLOSED' && <div className="text-red-500 font-black text-[9px] mb-8 uppercase tracking-[0.2em] animate-pulse">Shift Sedang Ditutup</div>}
        <form onSubmit={submitLogin} className="space-y-5">
          <input type="password" placeholder="••••" value={pin} onChange={(e) => setPin(e.target.value)} className="w-full bg-slate-50 py-6 rounded-3xl text-center text-4xl font-black outline-none border-4 border-transparent focus:border-amber-500 transition-all placeholder:text-slate-200" autoFocus />
          <button type="submit" className="w-full py-5 bg-slate-900 text-white rounded-3xl font-black uppercase shadow-xl hover:bg-black transition-all active:scale-95 tracking-widest text-[10px]">Akses Masuk</button>
        </form>
        <button onClick={onRefresh} className="mt-10 text-slate-300 hover:text-amber-500 transition-all hover:rotate-180 duration-500"><RefreshCw size={22} className="mx-auto" /></button>
      </div>
    </div>
  );
}
