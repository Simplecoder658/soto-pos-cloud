import React, { useState, useEffect } from 'react';
import { LayoutGrid, Settings, Trash2, LogOut, RefreshCw, ShoppingBag, X, ChevronRight } from 'lucide-react';
import { fetchCloudData, saveOrderToSheet, updateShiftCloud } from './db';

// --- MAIN COMPONENT ---
export default function App() {
  // State Utama
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [view, setView] = useState('pos'); // 'pos' atau 'admin'
  const [menu, setMenu] = useState([]);
  const [users, setUsers] = useState([]);
  const [config, setConfig] = useState({ qris: "", shiftStatus: "CLOSED" });
  const [cloudUsedNumbers, setCloudUsedNumbers] = useState([]);

  // State Transaksi
  const [cart, setCart] = useState([]);
  const [orderNumber, setOrderNumber] = useState("");
  const [paymentMethod, setPaymentMethod] = useState('Tunai');
  
  // State UI/Modal (Ini yang kita fix)
  const [selectedItemForAddon, setSelectedItemForAddon] = useState(null); 
  const [showQRModal, setShowQRModal] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Load Data
  const initApp = async () => {
    try {
      setIsLoading(true);
      const cloud = await fetchCloudData();
      if (cloud) {
        setMenu(cloud.menu || []);
        setUsers(cloud.users || []);
        setConfig({ qris: cloud.qris || "", shiftStatus: cloud.shiftStatus || "CLOSED" });
        setCloudUsedNumbers(cloud.usedOrders || []);
      }
    } catch (e) { console.error("Data error:", e); } 
    finally { setIsLoading(false); }
  };

  useEffect(() => { initApp(); }, []);

  // --- LOGIKA HARGA (Lontong = Base) ---
  const handleAddToCart = (item, karboType = "") => {
    let finalName = item.name;
    let finalPrice = Number(item.price);
    const isPorsiAdik = item.id === "M3" || item.id === "M4";

    if (karboType === "Lontong") {
      finalName += " (Ori)";
    } else if (karboType === "Nasi") {
      finalName += " (Nasi)";
      if (!isPorsiAdik) finalPrice += 1000;
    } else if (karboType === "Singkong") {
      finalName += " (Singkong)";
      if (!isPorsiAdik) finalPrice -= 1000;
    }

    const itemKey = finalName;
    const existing = cart.find(x => x.itemKey === itemKey);

    if (existing) {
      setCart(cart.map(x => x.itemKey === itemKey ? { ...x, quantity: x.quantity + 1 } : x));
    } else {
      setCart([...cart, { ...item, name: finalName, price: finalPrice, quantity: 1, itemKey }]);
    }
    setSelectedItemForAddon(null); // Tutup modal
  };

  const totalCart = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const isNumberUsed = cloudUsedNumbers.includes(String(orderNumber));

  if (isLoading) return <div className="h-screen flex items-center justify-center font-black text-amber-500 animate-pulse italic text-2xl">SOTO RA-ME23...</div>;
  if (!currentUser) return <LoginScreen users={users} onLogin={setCurrentUser} onRefresh={initApp} />;

  return (
    <div className="h-screen w-full bg-slate-50 flex overflow-hidden font-sans select-none">
      
      {/* SIDEBAR */}
      <nav className="w-20 bg-white border-r flex flex-col items-center py-8 justify-between shadow-sm z-20">
        <div className="flex flex-col gap-8">
          <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-white shadow-lg font-black italic text-xl">R</div>
          <button onClick={() => setView('pos')} className={`p-3 rounded-xl transition-all ${view === 'pos' ? 'bg-amber-100 text-amber-600' : 'text-slate-300'}`}><LayoutGrid size={24}/></button>
          {currentUser.role === 'admin' && (
            <button onClick={() => setView('admin')} className={`p-3 rounded-xl transition-all ${view === 'admin' ? 'bg-slate-100 text-slate-900' : 'text-slate-300'}`}><Settings size={24}/></button>
          )}
        </div>
        <button onClick={() => setCurrentUser(null)} className="text-slate-300 hover:text-red-500 transition-colors"><LogOut size={24}/></button>
      </nav>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex overflow-hidden">
        {view === 'admin' ? (
          <AdminPanel config={config} onRefresh={initApp} usedNumbers={cloudUsedNumbers} />
        ) : (
          <>
            <main className="flex-1 p-8 overflow-y-auto">
              <div className="flex justify-between items-center mb-8">
                <h1 className="text-2xl font-black uppercase italic border-l-8 border-amber-500 pl-4 tracking-tight">Menu Utama</h1>
                <button onClick={initApp} className="p-2 text-slate-300 hover:text-amber-500 transition-all"><RefreshCw size={22}/></button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {menu.map(m => (
                  <div 
                    key={m.id} 
                    onClick={() => m.options ? setSelectedItemForAddon(m) : handleAddToCart(m)}
                    className="bg-white p-6 rounded-[2.5rem] border border-slate-100 hover:shadow-2xl hover:shadow-amber-200/50 cursor-pointer active:scale-95 transition-all text-center group"
                  >
                    <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">{m.img || '🍲'}</div>
                    <p className="font-black text-xs uppercase text-slate-600 leading-tight mb-2 h-8 flex items-center justify-center">{m.name}</p>
                    <p className="text-amber-600 font-black text-lg italic">Rp {Number(m.price).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </main>

            {/* KERANJANG */}
            <aside className="w-[400px] bg-white border-l p-8 flex flex-col shadow-2xl z-10">
              <div className="flex items-center gap-3 mb-8">
                <ShoppingBag className="text-amber-500" size={28} />
                <h2 className="text-xl font-black uppercase italic tracking-tighter">Pesanan</h2>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 mb-6 pr-2 custom-scrollbar">
                {cart.length === 0 && (
                   <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-50 italic">
                      <p>Keranjang Kosong</p>
                   </div>
                )}
                {cart.map(item => (
                  <div key={item.itemKey} className="bg-slate-50 p-4 rounded-3xl flex justify-between items-center border border-slate-100 group">
                    <div className="flex-1">
                      <p className="font-black text-[10px] uppercase leading-tight text-slate-500">{item.name}</p>
                      <p className="text-sm font-black text-slate-800">Rp {(item.price * item.quantity).toLocaleString()}</p>
                      <p className="text-[10px] font-bold text-amber-500 italic">{item.quantity} porsi</p>
                    </div>
                    <button onClick={() => setCart(cart.filter(x => x.itemKey !== item.itemKey))} className="text-slate-300 hover:text-red-500 transition-colors p-2"><Trash2 size={18}/></button>
                  </div>
                ))}
              </div>

              {/* INPUT NOMOR & PEMBAYARAN */}
              <div className="space-y-4">
                <div className={`p-4 rounded-3xl transition-all border-2 ${isNumberUsed ? 'bg-red-50 border-red-500' : 'bg-slate-900 border-slate-900'}`}>
                  <p className="text-[9px] text-center text-slate-400 font-black uppercase mb-1">Nomor Antrean</p>
                  <input 
                    type="number" 
                    value={orderNumber} 
                    onChange={(e) => setOrderNumber(e.target.value)} 
                    className="w-full bg-transparent text-center text-4xl font-black outline-none text-white placeholder:text-slate-700" 
                    placeholder="00" 
                  />
                  {isNumberUsed && <p className="text-[8px] text-center text-red-500 font-black uppercase mt-1">Sudah digunakan!</p>}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {['Tunai', 'QRIS'].map(m => (
                    <button 
                      key={m} 
                      onClick={() => setPaymentMethod(m)} 
                      className={`py-4 rounded-2xl border-2 font-black text-xs uppercase transition-all ${paymentMethod === m ? 'bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-200' : 'bg-white text-slate-400 border-slate-100'}`}
                    >
                      {m}
                    </button>
                  ))}
                </div>

                <div className="pt-4 border-t border-dashed space-y-4">
                  <div className="flex justify-between items-end px-2">
                    <p className="font-black text-xs uppercase text-slate-400">Total Tagihan</p>
                    <p className="font-black text-3xl text-slate-900 italic leading-none">Rp {totalCart.toLocaleString()}</p>
                  </div>
                  <button 
                    onClick={() => paymentMethod === 'QRIS' ? setShowQRModal(true) : alert('Lanjut Bayar?')} // Sesuaikan handleCheckout Bos
                    disabled={cart.length === 0 || !orderNumber || isNumberUsed || isSyncing}
                    className="w-full py-6 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-100 disabled:text-slate-300 text-white rounded-[2rem] font-black uppercase text-lg transition-all shadow-xl shadow-amber-100 active:scale-95"
                  >
                    {isSyncing ? 'Proses...' : 'Bayar Sekarang'}
                  </button>
                </div>
              </div>
            </aside>
          </>
        )}
      </div>

      {/* --- MODAL ADDON (PASTI MUNCUL) --- */}
      {selectedItemForAddon && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 overflow-hidden">
          <div className="bg-white w-full max-w-sm rounded-[3.5rem] shadow-2xl border border-white/20 animate-in zoom-in duration-300 overflow-hidden">
            <div className="bg-amber-500 p-8 text-center text-white relative">
              <button onClick={() => setSelectedItemForAddon(null)} className="absolute top-6 right-6 opacity-50 hover:opacity-100"><X size={20}/></button>
              <p className="text-[10px] uppercase font-black tracking-widest mb-1 opacity-70">Pilihan Karbo</p>
              <h2 className="text-2xl font-black uppercase italic">{selectedItemForAddon.name}</h2>
            </div>
            <div className="p-8 space-y-3">
              {selectedItemForAddon.options.split(',').map(opt => {
                const type = opt.trim();
                let priceLabel = "Tetap";
                if (type === "Nasi" && !["M3", "M4"].includes(selectedItemForAddon.id)) priceLabel = "+1.000";
                if (type === "Singkong" && !["M3", "M4"].includes(selectedItemForAddon.id)) priceLabel = "-1.000";

                return (
                  <button 
                    key={type} 
                    onClick={() => handleAddToCart(selectedItemForAddon, type)}
                    className="w-full group flex items-center justify-between p-5 bg-slate-50 hover:bg-amber-50 border-2 border-transparent hover:border-amber-200 rounded-2xl transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover:rotate-12 transition-transform">
                        {type === 'Nasi' ? '🍚' : type === 'Lontong' ? '📦' : '🍠'}
                      </div>
                      <span className="font-black uppercase text-slate-700 text-sm tracking-tight">{type}</span>
                    </div>
                    <span className={`text-[10px] font-black px-3 py-1 rounded-full ${priceLabel.includes('+') ? 'bg-red-100 text-red-500' : priceLabel.includes('-') ? 'bg-green-100 text-green-500' : 'bg-slate-200 text-slate-500'}`}>
                      {priceLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tambahkan modal QR dan Receipt di sini jika perlu */}
    </div>
  );
}

// --- SUB-COMPONENTS (Login & Admin) ---
function LoginScreen({ users, onLogin, onRefresh }) {
  const [pin, setPin] = useState('');
  return (
    <div className="h-screen w-screen flex items-center justify-center bg-amber-500 p-6">
      <div className="bg-white p-12 rounded-[4rem] shadow-2xl w-full max-w-sm text-center border-b-[12px] border-slate-900">
        <h2 className="text-3xl font-black mb-10 uppercase italic text-slate-900 tracking-tighter">Soto Ra-Me23</h2>
        <input 
          type="password" 
          value={pin} 
          onChange={(e) => setPin(e.target.value)} 
          className="w-full bg-slate-100 py-6 rounded-3xl text-center text-5xl font-black outline-none border-4 border-transparent focus:border-amber-500 mb-6 transition-all" 
          placeholder="••••" 
        />
        <button 
          onClick={() => {
            const user = users.find(u => String(u.pin) === String(pin));
            if (user) onLogin(user); else { alert("PIN Salah!"); setPin(''); }
          }} 
          className="w-full py-6 bg-slate-900 text-white rounded-3xl font-black uppercase hover:bg-slate-800 transition-all active:scale-95 shadow-xl shadow-slate-200"
        >
          Masuk
        </button>
        <button onClick={onRefresh} className="mt-8 text-slate-300 hover:text-amber-500 transition-colors"><RefreshCw size={24} className="mx-auto" /></button>
      </div>
    </div>
  );
}

function AdminPanel({ config, onRefresh, usedNumbers }) {
  return (
    <main className="flex-1 p-12 bg-white overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-black mb-12 uppercase italic tracking-tighter border-b-4 border-amber-500 pb-4 inline-block">Dashboard Admin</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="p-8 bg-slate-50 rounded-[3rem] border border-slate-100 shadow-sm">
            <p className="font-black text-xs text-slate-400 mb-6 uppercase tracking-widest">Kontrol Shift</p>
            <button 
              onClick={async () => { 
                await updateShiftCloud(config.shiftStatus === 'OPEN' ? 'CLOSED' : 'OPEN'); 
                onRefresh(); 
              }} 
              className={`w-full py-8 rounded-[2rem] font-black uppercase text-xl transition-all shadow-lg ${config.shiftStatus === 'OPEN' ? 'bg-red-500 text-white shadow-red-100' : 'bg-green-500 text-white shadow-green-100'}`}
            >
              {config.shiftStatus === 'OPEN' ? 'Tutup Shift' : 'Buka Shift'}
            </button>
          </div>
          <div className="p-8 bg-slate-50 rounded-[3rem] border border-slate-100 shadow-sm">
            <p className="font-black text-xs text-slate-400 mb-6 uppercase tracking-widest">Antrean Terpakai</p>
            <div className="flex flex-wrap gap-2">
              {usedNumbers.map(n => (
                <span key={n} className="px-4 py-2 bg-white border border-slate-200 font-black rounded-xl text-slate-600">#{n}</span>
              ))}
              {usedNumbers.length === 0 && <p className="italic text-slate-300">Belum ada pesanan</p>}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
