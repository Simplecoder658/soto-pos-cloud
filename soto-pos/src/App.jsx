import React, { useState, useEffect } from 'react';
import { 
  LayoutGrid, Settings, Trash2, LogOut, RefreshCw, 
  ShoppingBag, X, ChevronRight, CheckCircle2, AlertCircle 
} from 'lucide-react';
import { fetchCloudData, saveOrderToSheet, updateShiftCloud } from './db';

export default function App() {
  // --- STATE UTAMA ---
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [view, setView] = useState('pos'); // 'pos' atau 'admin'
  const [menu, setMenu] = useState([]);
  const [users, setUsers] = useState([]);
  const [config, setConfig] = useState({ qris: "", shiftStatus: "CLOSED" });
  const [usedNumbers, setUsedNumbers] = useState([]);

  // --- STATE TRANSAKSI ---
  const [cart, setCart] = useState([]);
  const [orderNo, setOrderNo] = useState("");
  const [payMethod, setPayMethod] = useState('Tunai');
  const [isSync, setIsSync] = useState(false);

  // --- STATE UI (MODAL) ---
  const [addonModal, setAddonModal] = useState(null); // Menyimpan objek menu yang sedang dipilih
  const [showReceipt, setShowReceipt] = useState(null); // Menyimpan data pesanan terakhir untuk struk

  const initData = async () => {
    setIsLoading(true);
    const data = await fetchCloudData();
    if (data) {
      setMenu(data.menu || []);
      setUsers(data.users || []);
      setUsedNumbers(data.usedOrders || []);
      setConfig({ 
        qris: data.qris || "", 
        shiftStatus: data.shiftStatus || "CLOSED" 
      });
    }
    setIsLoading(false);
  };

  useEffect(() => { initData(); }, []);

  // --- LOGIKA ADD TO CART & HARGA ---
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
    setCart(prev => {
      const existing = prev.find(x => x.key === itemKey);
      if (existing) {
        return prev.map(x => x.key === itemKey ? { ...x, qty: x.qty + 1 } : x);
      }
      return [...prev, { ...item, name: finalName, price: finalPrice, qty: 1, key: itemKey }];
    });
    setAddonModal(null); // Tutup modal setelah pilih
  };

  const totalCart = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const isNumberInvalid = usedNumbers.includes(String(orderNo)) || !orderNo;

  // --- HANDLE CHECKOUT ---
  const handleCheckout = async () => {
    if (cart.length === 0 || isNumberInvalid || isSync) return;
    
    setIsSync(true);
    const orderData = {
      no_pesanan: orderNo,
      items: cart.map(i => `${i.name} x${i.qty}`).join(", "),
      total: totalCart,
      method: payMethod,
      kasir: currentUser.username,
      cart: cart.map(i => ({ id: i.id, quantity: i.qty })) // Untuk potong stok di Apps Script
    };

    const res = await saveOrderToSheet(orderData);
    if (res.status === "OK") {
      setShowReceipt({ ...orderData, date: new Date().toLocaleTimeString() });
      setCart([]);
      setOrderNo("");
      initData(); // Refresh data untuk update usedNumbers & stok
    } else {
      alert("Gagal simpan pesanan: " + res.message);
    }
    setIsSync(false);
  };

  if (isLoading) return <div className="h-screen flex items-center justify-center font-black text-amber-500 animate-pulse text-2xl italic">LOADING DATA...</div>;
  if (!currentUser) return <LoginScreen users={users} onLogin={setCurrentUser} onRefresh={initData} />;

  return (
    <div className="h-screen w-full bg-slate-50 flex overflow-hidden font-sans select-none">
      
      {/* SIDEBAR NAV */}
      <nav className="w-20 bg-white border-r flex flex-col items-center py-8 justify-between shadow-sm z-20">
        <div className="flex flex-col gap-8">
          <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-white shadow-lg font-black italic text-xl">R</div>
          <button onClick={() => setView('pos')} className={`p-3 rounded-xl transition-all ${view === 'pos' ? 'bg-amber-100 text-amber-600' : 'text-slate-300'}`}><LayoutGrid/></button>
          {currentUser.role === 'admin' && (
            <button onClick={() => setView('admin')} className={`p-3 rounded-xl transition-all ${view === 'admin' ? 'bg-slate-100 text-slate-900' : 'text-slate-300'}`}><Settings/></button>
          )}
        </div>
        <button onClick={() => setCurrentUser(null)} className="text-slate-300 hover:text-red-500 transition-colors"><LogOut/></button>
      </nav>

      {/* MAIN AREA */}
      <div className="flex-1 flex overflow-hidden">
        {view === 'admin' ? (
          <AdminPanel config={config} onRefresh={initData} usedNumbers={usedNumbers} />
        ) : (
          <>
            <main className="flex-1 p-8 overflow-y-auto">
              <div className="flex justify-between items-center mb-8">
                <h1 className="text-2xl font-black uppercase italic border-l-8 border-amber-500 pl-4 tracking-tighter">Menu Utama</h1>
                <button onClick={initData} className="p-2 text-slate-300 hover:text-amber-500"><RefreshCw size={22}/></button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {menu.map(m => (
                  <div 
                    key={m.id} 
                    onClick={() => m.options ? setAddonModal(m) : handleAddToCart(m)}
                    className="bg-white p-6 rounded-[2.5rem] border border-slate-100 hover:shadow-2xl hover:shadow-amber-200/50 cursor-pointer active:scale-95 transition-all text-center group"
                  >
                    <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">{m.img || '🍲'}</div>
                    <p className="font-black text-[10px] uppercase text-slate-500 leading-tight mb-2 h-8 flex items-center justify-center">{m.name}</p>
                    <p className="text-amber-600 font-black text-lg italic">Rp {Number(m.price).toLocaleString()}</p>
                    <p className="text-[9px] font-bold text-slate-300 mt-1 uppercase tracking-widest">Stok: {m.stock}</p>
                  </div>
                ))}
              </div>
            </main>

            {/* KERANJANG / SIDEBAR KANAN */}
            <aside className="w-[400px] bg-white border-l p-8 flex flex-col shadow-2xl z-10">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-amber-500 rounded-2xl text-white"><ShoppingBag size={20}/></div>
                <h2 className="text-xl font-black uppercase italic tracking-tighter text-slate-800">Pesanan</h2>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 mb-6 pr-2 custom-scrollbar">
                {cart.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center opacity-20 italic font-black text-slate-400">
                    <ShoppingBag size={64} className="mb-4" />
                    <p>BELUM ADA ITEM</p>
                  </div>
                )}
                {cart.map(item => (
                  <div key={item.key} className="bg-slate-50 p-4 rounded-3xl flex justify-between items-center border border-slate-100">
                    <div className="flex-1">
                      <p className="font-black text-[10px] uppercase text-slate-500">{item.name}</p>
                      <p className="text-sm font-black text-slate-800">Rp {(item.price * item.qty).toLocaleString()}</p>
                      <p className="text-[10px] font-bold text-amber-500 italic">{item.qty} Porsi</p>
                    </div>
                    <button onClick={() => setCart(cart.filter(x => x.key !== item.key))} className="text-slate-300 hover:text-red-500 p-2"><Trash2 size={18}/></button>
                  </div>
                ))}
              </div>

              {/* INPUT AREA */}
              <div className="space-y-4">
                <div className={`p-4 rounded-[2rem] transition-all border-2 ${usedNumbers.includes(String(orderNo)) ? 'bg-red-50 border-red-500' : 'bg-slate-900 border-slate-900'}`}>
                  <p className="text-[9px] text-center text-slate-400 font-black uppercase mb-1">Nomor Antrean</p>
                  <input 
                    type="number" 
                    value={orderNo} 
                    onChange={(e) => setOrderNo(e.target.value)} 
                    className="w-full bg-transparent text-center text-4xl font-black outline-none text-white" 
                    placeholder="00" 
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {['Tunai', 'QRIS'].map(m => (
                    <button 
                      key={m} 
                      onClick={() => setPayMethod(m)} 
                      className={`py-4 rounded-2xl border-2 font-black text-xs uppercase transition-all ${payMethod === m ? 'bg-amber-500 text-white border-amber-500 shadow-lg' : 'bg-white text-slate-400 border-slate-100'}`}
                    >
                      {m}
                    </button>
                  ))}
                </div>

                <div className="pt-4 border-t border-dashed space-y-4">
                  <div className="flex justify-between items-center px-2">
                    <p className="font-black text-xs uppercase text-slate-400">Total Tagihan</p>
                    <p className="font-black text-3xl text-slate-900 italic leading-none">Rp {totalCart.toLocaleString()}</p>
                  </div>
                  <button 
                    onClick={handleCheckout}
                    disabled={cart.length === 0 || isNumberInvalid || isSync}
                    className="w-full py-6 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-100 disabled:text-slate-300 text-white rounded-[2rem] font-black uppercase text-lg shadow-xl transition-all active:scale-95"
                  >
                    {isSync ? 'MENYIMPAN...' : 'KONFIRMASI'}
                  </button>
                </div>
              </div>
            </aside>
          </>
        )}
      </div>

      {/* --- MODAL ADDON (PILIHAN KARBO) --- */}
      {addonModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[3.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="bg-amber-500 p-8 text-center text-white relative">
              <button onClick={() => setAddonModal(null)} className="absolute top-6 right-6 opacity-50 hover:opacity-100"><X/></button>
              <p className="text-[10px] uppercase font-black tracking-widest mb-1 opacity-70">Pilih Karbohidrat</p>
              <h2 className="text-2xl font-black uppercase italic tracking-tighter">{addonModal.name}</h2>
            </div>
            <div className="p-8 space-y-3">
              {addonModal.options.split(',').map(opt => (
                <button 
                  key={opt} 
                  onClick={() => handleAddToCart(addonModal, opt.trim())}
                  className="w-full group flex items-center justify-between p-5 bg-slate-50 hover:bg-amber-50 border-2 border-transparent hover:border-amber-200 rounded-2xl transition-all"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-2xl">{opt.trim() === 'Nasi' ? '🍚' : opt.trim() === 'Lontong' ? '📦' : '🍠'}</span>
                    <span className="font-black uppercase text-slate-700 text-sm">{opt.trim()}</span>
                  </div>
                  <ChevronRight size={18} className="text-slate-300 group-hover:text-amber-500" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL STRUK / SUCCESS --- */}
      {showReceipt && (
        <div className="fixed inset-0 z-[110] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[3.5rem] p-10 text-center shadow-2xl border-t-[12px] border-green-500">
            <div className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={48} />
            </div>
            <h2 className="text-2xl font-black uppercase italic mb-2">Berhasil Simpan</h2>
            <p className="text-5xl font-black text-slate-900 mb-8">#{showReceipt.no_pesanan}</p>
            <div className="space-y-2 mb-8 text-left bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Detail Pesanan:</p>
              <p className="text-xs font-bold text-slate-600 line-clamp-3">{showReceipt.items}</p>
            </div>
            <button 
              onClick={() => setShowReceipt(null)}
              className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black uppercase tracking-widest"
            >
              Tutup & Lanjut
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

// --- SUB COMPONENTS ---

function LoginScreen({ users, onLogin, onRefresh }) {
  const [pin, setPin] = useState('');
  const handleLogin = (e) => {
    e.preventDefault();
    const user = users.find(u => String(u.pin) === String(pin));
    if (user) onLogin(user);
    else { alert("PIN SALAH!"); setPin(''); }
  };

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-amber-500 p-6 overflow-hidden">
      <div className="bg-white p-12 rounded-[4rem] shadow-2xl w-full max-w-sm text-center border-b-[12px] border-slate-900">
        <h2 className="text-3xl font-black mb-10 uppercase italic text-slate-900 tracking-tighter">Soto Ra-Me23</h2>
        <form onSubmit={handleLogin}>
          <input 
            type="password" 
            value={pin} 
            onChange={(e) => setPin(e.target.value)} 
            className="w-full bg-slate-100 py-6 rounded-3xl text-center text-5xl font-black outline-none border-4 border-transparent focus:border-amber-500 mb-6 transition-all" 
            placeholder="••••" 
          />
          <button type="submit" className="w-full py-6 bg-slate-900 text-white rounded-3xl font-black uppercase hover:bg-slate-800 transition-all active:scale-95 shadow-xl shadow-slate-200">
            Masuk Kasir
          </button>
        </form>
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
          <div className="p-8 bg-slate-50 rounded-[3rem] border border-slate-100 shadow-sm text-center">
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
            <p className="mt-4 text-xs font-bold text-slate-400 uppercase tracking-tighter">STATUS SAAT INI: {config.shiftStatus}</p>
          </div>
          <div className="p-8 bg-slate-50 rounded-[3rem] border border-slate-100 shadow-sm">
            <p className="font-black text-xs text-slate-400 mb-6 uppercase tracking-widest text-center">Antrean Terpakai</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {usedNumbers.map(n => (
                <span key={n} className="px-4 py-2 bg-white border border-slate-200 font-black rounded-xl text-slate-600 shadow-sm">#{n}</span>
              ))}
              {usedNumbers.length === 0 && <p className="italic text-slate-300">Belum ada pesanan.</p>}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
