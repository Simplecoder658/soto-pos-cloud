import React, { useState, useEffect } from 'react';
import { 
  LayoutGrid, Settings, Trash2, LogOut, Wallet, 
  Banknote, X, RefreshCw, Camera 
} from 'lucide-react';
import { fetchCloudData, saveOrderToSheet, updateQrisCloud } from './db';

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [view, setView] = useState('pos');
  const [menu, setMenu] = useState([]);
  const [users, setUsers] = useState([]);
  const [qrisImage, setQrisImage] = useState("");
  const [cart, setCart] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('Tunai');
  const [showQRModal, setShowQRModal] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const initApp = async () => {
    setIsLoading(true);
    const cloud = await fetchCloudData();
    if (cloud) {
      setMenu(cloud.menu || []);
      setUsers(cloud.users || []);
      setQrisImage(cloud.qris || "");
    }
    setIsLoading(false);
  };

  useEffect(() => { initApp(); }, []);

  const cleanPrice = (p) => parseFloat(String(p).replace(/[^0-9.-]+/g,"")) || 0;

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (paymentMethod === 'QRIS' && !showQRModal) { setShowQRModal(true); return; }

    setIsSyncing(true);
    const total = cart.reduce((s, i) => s + (cleanPrice(i.price) * i.quantity), 0);
    
    try {
      await saveOrderToSheet(cart, total, paymentMethod, currentUser.username);
      setCart([]);
      setPaymentMethod('Tunai');
      setShowQRModal(false);
      alert("TRANSAKSI BERHASIL!");
    } catch (e) {
      alert("Gagal Simpan ke Cloud!");
    } finally {
      setIsSyncing(false);
    }
  };

  if (isLoading) return (
    <div className="h-screen flex flex-col items-center justify-center font-black text-amber-500 uppercase">
      <RefreshCw className="animate-spin mb-4" size={40} />
      Sync Database Soto...
    </div>
  );

  if (!currentUser) return <LoginScreen users={users} onLogin={setCurrentUser} onRefresh={initApp} />;

  return (
    <div className="h-screen bg-slate-50 flex overflow-hidden font-sans">
      {showQRModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] p-8 w-full max-w-sm text-center shadow-2xl border-4 border-amber-500">
            <div className="flex justify-between items-center mb-6">
              <span className="font-black text-[10px] text-slate-400 uppercase tracking-widest">Scan QRIS</span>
              <button onClick={() => setShowQRModal(false)}><X size={20}/></button>
            </div>
            <img src={qrisImage} className="w-full aspect-square object-contain mb-4 border rounded-xl p-2" alt="QRIS" />
            <p className="text-3xl font-black italic mb-6">Rp {cart.reduce((s, i) => s + (cleanPrice(i.price) * i.quantity), 0).toLocaleString()}</p>
            <button onClick={handleCheckout} className="w-full py-4 bg-green-600 text-white rounded-xl font-black shadow-lg uppercase tracking-widest">Bayar Sekarang</button>
          </div>
        </div>
      )}

      <nav className="w-20 bg-white border-r flex flex-col items-center py-8 justify-between shadow-sm">
        <div className="flex flex-col gap-8">
          <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-white shadow-lg font-black italic text-xl">S</div>
          <button onClick={() => setView('pos')} className={`p-3 rounded-xl ${view === 'pos' ? 'bg-amber-50 text-amber-600' : 'text-slate-300'}`}><LayoutGrid size={24}/></button>
          {currentUser.role === 'admin' && (
            <button onClick={() => setView('admin')} className={`p-3 rounded-xl ${view === 'admin' ? 'bg-slate-100 text-slate-900' : 'text-slate-300'}`}><Settings size={24}/></button>
          )}
        </div>
        <button onClick={() => {setCurrentUser(null); setView('pos');}} className="text-slate-300 hover:text-red-500"><LogOut size={24}/></button>
      </nav>

      <div className="flex flex-1 overflow-hidden">
        {view === 'admin' ? (
          <AdminPanel qris={qrisImage} setQris={setQrisImage} onRefresh={initApp} />
        ) : (
          <>
            <main className="flex-1 p-8 overflow-y-auto">
              <div className="flex justify-between items-center mb-10">
                <h1 className="text-2xl font-black uppercase italic tracking-tighter">Kasir: {currentUser.username}</h1>
                <button onClick={initApp} className="p-2 text-slate-300 hover:text-amber-500"><RefreshCw size={20}/></button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {menu.map(m => (
                  <div key={m.id} onClick={() => {
                    const exists = cart.find(x => x.id === m.id);
                    if (exists) setCart(cart.map(x => x.id === m.id ? {...x, quantity: x.quantity + 1} : x));
                    else setCart([...cart, {...m, quantity: 1}]);
                  }} className="bg-white p-4 rounded-[2rem] border hover:shadow-xl cursor-pointer active:scale-95 transition-all text-center">
                    <div className="text-5xl mb-3">{m.img || '🍲'}</div>
                    <p className="font-bold text-[10px] uppercase truncate mb-1">{m.name}</p>
                    <p className="text-amber-600 font-black text-[10px]">Rp {cleanPrice(m.price).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </main>

            <aside className="w-[350px] bg-white border-l p-8 flex flex-col shadow-2xl">
              <h2 className="text-[10px] font-black uppercase text-slate-400 mb-6 tracking-widest">Orderan</h2>
              <div className="flex-1 overflow-y-auto space-y-4 mb-6">
                {cart.map(item => (
                  <div key={item.id} className="bg-slate-50 p-4 rounded-2xl flex justify-between items-center border border-slate-100">
                    <div className="flex-1 min-w-0 mr-2">
                      <p className="font-bold text-[10px] uppercase truncate">{item.name}</p>
                      <p className="text-[10px] font-black text-amber-600">Rp {(cleanPrice(item.price) * item.quantity).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-xs px-2 py-1 bg-white rounded-lg border">{item.quantity}x</span>
                      <button onClick={() => setCart(cart.filter(x => x.id !== item.id))} className="text-red-300 hover:text-red-500"><Trash2 size={16}/></button>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Pilihan Pembayaran Balik ke 2 Tombol Saja */}
              <div className="grid grid-cols-2 gap-2 mb-6">
                {['Tunai', 'QRIS'].map(m => (
                  <button key={m} onClick={() => setPaymentMethod(m)} className={`py-4 rounded-xl text-[10px] font-black border-2 transition-all flex flex-col items-center gap-1 ${paymentMethod === m ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-white text-slate-400 border-slate-100'}`}>
                    {m === 'Tunai' && <Banknote size={14}/>}
                    {m === 'QRIS' && <Wallet size={14}/>}
                    {m}
                  </button>
                ))}
              </div>

              <div className="pt-6 border-t-2 border-dashed border-slate-100">
                <div className="flex justify-between items-center mb-6">
                  <span className="text-slate-400 text-[10px] font-black uppercase">Total</span>
                  <span className="text-3xl font-black italic tracking-tighter">Rp {cart.reduce((s, i) => s + (cleanPrice(i.price) * i.quantity), 0).toLocaleString()}</span>
                </div>
                <button 
                  onClick={handleCheckout} 
                  disabled={isSyncing || cart.length === 0}
                  className={`w-full py-5 rounded-2xl font-black text-xs shadow-xl transition-all ${cart.length === 0 ? 'bg-slate-100 text-slate-300' : 'bg-amber-500 text-white hover:bg-amber-600 active:scale-95'}`}
                >
                  {isSyncing ? 'SINKRON...' : `PROSES ${paymentMethod.toUpperCase()}`}
                </button>
              </div>
            </aside>
          </>
        )}
      </div>
    </div>
  );
}

function AdminPanel({ qris, setQris, onRefresh }) {
  const handleUpdate = async () => {
    const url = prompt("Link QRIS Baru:", qris);
    if(url) { setQris(url); await updateQrisCloud(url); alert("QRIS Berhasil Diupdate!"); }
  };
  return (
    <main className="flex-1 p-10 bg-white">
      <h1 className="text-4xl font-black mb-10 italic uppercase text-slate-900 text-center">Admin Panel</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <button onClick={onRefresh} className="p-12 border-4 border-dashed border-slate-100 rounded-[3rem] flex flex-col items-center gap-4 hover:bg-amber-50 transition-all">
          <RefreshCw size={40} className="text-amber-500" />
          <span className="font-black text-xs uppercase text-slate-400">Tarik Data Sheets</span>
        </button>
        <button onClick={handleUpdate} className="p-12 border-4 border-dashed border-slate-100 rounded-[3rem] flex flex-col items-center gap-4 hover:bg-blue-50 transition-all">
          <Camera size={40} className="text-blue-500" />
          <span className="font-black text-xs uppercase text-slate-400">Update Foto QRIS</span>
        </button>
      </div>
    </main>
  );
}

function LoginScreen({ users, onLogin, onRefresh }) {
  const [pin, setPin] = useState('');
  const submitLogin = (e) => {
    e.preventDefault();
    const foundUser = users.find(u => String(u.pin).trim() === String(pin).trim());
    if (foundUser) onLogin(foundUser);
    else { alert(`PIN SALAH!`); setPin(''); }
  };
  return (
    <div className="h-screen w-screen flex items-center justify-center bg-slate-100">
      <div className="bg-white p-12 rounded-[3rem] shadow-2xl w-full max-w-sm text-center">
        <div className="w-20 h-20 bg-amber-500 rounded-[1.5rem] flex items-center justify-center text-white shadow-xl mx-auto mb-8 font-black text-4xl italic">S</div>
        <h2 className="text-2xl font-black mb-8 uppercase text-slate-900 italic">Soto POS Cloud</h2>
        <form onSubmit={submitLogin} className="space-y-4">
          <input type="password" placeholder="••••" value={pin} onChange={(e) => setPin(e.target.value)} className="w-full bg-slate-50 py-5 rounded-2xl text-center text-3xl font-black outline-none border-2 focus:border-amber-500" autoFocus />
          <button type="submit" className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase shadow-xl">MASUK</button>
        </form>
        <button onClick={onRefresh} className="mt-8 text-slate-300 hover:text-amber-500"><RefreshCw size={18} className="mx-auto" /></button>
      </div>
    </div>
  );
}
