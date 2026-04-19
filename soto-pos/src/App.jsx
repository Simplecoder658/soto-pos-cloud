import React, { useState, useEffect } from 'react';
import { 
  LayoutGrid, Settings, Trash2, LogOut, RefreshCw, 
  ShoppingBag, X, ChevronRight, CheckCircle2, Printer 
} from 'lucide-react';
import { fetchCloudData, saveOrderToSheet, updateShiftCloud } from './db';

export default function App() {
  // --- STATES ---
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [view, setView] = useState('pos');
  const [menu, setMenu] = useState([]);
  const [users, setUsers] = useState([]);
  const [config, setConfig] = useState({ qris: "", shiftStatus: "CLOSED" });
  const [usedNumbers, setUsedNumbers] = useState([]);

  const [cart, setCart] = useState([]);
  const [orderNo, setOrderNo] = useState("");
  const [payMethod, setPayMethod] = useState('Tunai');
  const [isSync, setIsSync] = useState(false);

  // UI States
  const [addonModal, setAddonModal] = useState(null); 
  const [showReceipt, setShowReceipt] = useState(null); 

  const initData = async () => {
    setIsLoading(true);
    const data = await fetchCloudData();
    if (data) {
      setMenu(data.menu || []);
      setUsers(data.users || []);
      setUsedNumbers(data.usedOrders || []);
      setConfig({ qris: data.qris || "", shiftStatus: data.shiftStatus || "CLOSED" });
    }
    setIsLoading(false);
  };

  useEffect(() => { initData(); }, []);

  // --- LOGIKA HARGA (SINGKONG, NASI, LONTONG) ---
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
    setAddonModal(null);
  };

  // --- LOGIKA PRINT STRUK ---
  const cetakStruk = (data, itemsCart) => {
    const printWindow = window.open('', '_blank', 'width=300,height=600');
    const itemsHtml = itemsCart.map(i => `
      <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
        <span style="flex: 1;">${i.name}</span>
        <span>${i.qty}x</span>
        <span style="width: 70px; text-align: right;">${(i.price * i.qty).toLocaleString()}</span>
      </div>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <style>
            @page { margin: 0; }
            body { font-family: 'Courier New', monospace; width: 58mm; padding: 4mm; font-size: 12px; }
            .text-center { text-align: center; }
            .line { border-top: 1px dashed #000; margin: 5px 0; }
            .bold { font-weight: bold; }
            .big { font-size: 18px; }
          </style>
        </head>
        <body>
          <div class="text-center bold big">SOTO RA-ME23</div>
          <div class="text-center">Antrean: <span class="big">#${data.no_pesanan}</span></div>
          <div class="line"></div>
          <div style="font-size: 10px;">
            Tgl: ${new Date().toLocaleString('id-ID')}<br>
            Kasir: ${data.kasir}<br>
            Bayar: ${data.method}
          </div>
          <div class="line"></div>
          ${itemsHtml}
          <div class="line"></div>
          <div style="display: flex; justify-content: space-between;" class="bold">
            <span>TOTAL</span>
            <span>Rp ${data.total.toLocaleString()}</span>
          </div>
          <div class="line"></div>
          <div class="text-center" style="margin-top: 10px;">TERIMA KASIH</div>
          <script>setTimeout(() => { window.print(); window.close(); }, 500);</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const totalCart = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const isNumberUsed = usedNumbers.includes(String(orderNo));

  const handleCheckout = async () => {
    if (cart.length === 0 || !orderNo || isNumberUsed || isSync) return;
    setIsSync(true);
    const orderData = {
      no_pesanan: orderNo,
      items: cart.map(i => `${i.name} x${i.qty}`).join(", "),
      total: totalCart,
      method: payMethod,
      kasir: currentUser.username,
      cart: cart.map(i => ({ id: i.id, quantity: i.qty }))
    };

    const res = await saveOrderToSheet(orderData);
    if (res.status === "OK") {
      cetakStruk(orderData, cart); // Otomatis Print
      setShowReceipt({ ...orderData, date: new Date().toLocaleTimeString() });
      setCart([]);
      setOrderNo("");
      initData();
    } else { alert("Gagal Simpan!"); }
    setIsSync(false);
  };

  if (isLoading) return <div className="h-screen flex items-center justify-center font-black text-amber-500 animate-pulse text-2xl italic">SOTO RA-ME23...</div>;
  if (!currentUser) return <LoginScreen users={users} onLogin={setCurrentUser} onRefresh={initData} />;

  return (
    <div className="h-screen w-full bg-slate-50 flex overflow-hidden font-sans select-none">
      {/* SIDEBAR */}
      <nav className="w-20 bg-white border-r flex flex-col items-center py-8 justify-between shadow-sm z-30">
        <div className="flex flex-col gap-8">
          <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-white shadow-lg font-black italic text-xl">R</div>
          <button onClick={() => setView('pos')} className={`p-3 rounded-xl ${view === 'pos' ? 'bg-amber-100 text-amber-600' : 'text-slate-300'}`}><LayoutGrid/></button>
          {currentUser.role === 'admin' && <button onClick={() => setView('admin')} className={`p-3 rounded-xl ${view === 'admin' ? 'bg-slate-100 text-slate-900' : 'text-slate-300'}`}><Settings/></button>}
        </div>
        <button onClick={() => setCurrentUser(null)} className="text-slate-300 hover:text-red-500"><LogOut/></button>
      </nav>

      <div className="flex-1 flex overflow-hidden">
        {view === 'admin' ? (
          <AdminPanel config={config} onRefresh={initData} usedNumbers={usedNumbers} />
        ) : (
          <>
            <main className="flex-1 p-8 overflow-y-auto">
              <div className="flex justify-between items-center mb-8">
                <h1 className="text-2xl font-black uppercase italic border-l-8 border-amber-500 pl-4">Pilih Menu</h1>
                <button onClick={initData} className="p-2 text-slate-300"><RefreshCw size={22}/></button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {menu.map(m => (
                  <div key={m.id} onClick={() => m.options ? setAddonModal(m) : handleAddToCart(m)} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 hover:shadow-xl cursor-pointer active:scale-95 transition-all text-center">
                    <div className="text-5xl mb-4">{m.img || '🍲'}</div>
                    <p className="font-black text-[10px] uppercase text-slate-500 h-8 flex items-center justify-center">{m.name}</p>
                    <p className="text-amber-600 font-black text-lg italic">Rp {Number(m.price).toLocaleString()}</p>
                    <p className="text-[9px] font-bold text-slate-300 mt-1 uppercase">Stok: {m.stock}</p>
                  </div>
                ))}
              </div>
            </main>

            <aside className="w-[380px] bg-white border-l p-8 flex flex-col shadow-2xl z-10">
              <div className="flex-1 overflow-y-auto space-y-3 mb-6 pr-2">
                {cart.length === 0 && <div className="h-full flex items-center justify-center opacity-20 italic font-black text-slate-400">KERANJANG KOSONG</div>}
                {cart.map(item => (
                  <div key={item.key} className="bg-slate-50 p-4 rounded-3xl flex justify-between items-center border border-slate-100">
                    <div className="flex-1">
                      <p className="font-black text-[10px] uppercase text-slate-500">{item.name}</p>
                      <p className="text-sm font-black text-slate-800">Rp {(item.price * item.qty).toLocaleString()}</p>
                    </div>
                    <button onClick={() => setCart(cart.filter(x => x.key !== item.key))} className="text-slate-300 hover:text-red-500 p-2"><Trash2 size={18}/></button>
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <div className={`p-4 rounded-[2rem] border-2 ${isNumberUsed ? 'bg-red-50 border-red-500' : 'bg-slate-900 border-slate-900'}`}>
                  <p className="text-[9px] text-center text-slate-400 font-black uppercase mb-1">No. Antrean</p>
                  <input type="number" value={orderNo} onChange={(e) => setOrderNo(e.target.value)} className="w-full bg-transparent text-center text-4xl font-black outline-none text-white" placeholder="00" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {['Tunai', 'QRIS'].map(m => (
                    <button key={m} onClick={() => setPayMethod(m)} className={`py-4 rounded-2xl border-2 font-black text-xs uppercase ${payMethod === m ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-slate-400 border-slate-100'}`}>{m}</button>
                  ))}
                </div>
                <div className="pt-4 border-t border-dashed space-y-4">
                  <div className="flex justify-between items-center px-2">
                    <p className="font-black text-xs text-slate-400 uppercase">Total</p>
                    <p className="font-black text-3xl text-slate-900 italic leading-none">Rp {totalCart.toLocaleString()}</p>
                  </div>
                  <button onClick={handleCheckout} disabled={cart.length === 0 || !orderNo || isNumberUsed || isSync} className="w-full py-6 bg-amber-500 text-white rounded-[2rem] font-black uppercase shadow-xl disabled:bg-slate-100">
                    {isSync ? 'PROSES...' : 'BAYAR & PRINT'}
                  </button>
                </div>
              </div>
            </aside>
          </>
        )}
      </div>

      {/* MODAL KARBO */}
      {addonModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[3.5rem] shadow-2xl overflow-hidden">
            <div className="bg-amber-500 p-8 text-center text-white">
              <h2 className="text-2xl font-black uppercase italic tracking-tighter">{addonModal.name}</h2>
              <p className="text-[10px] uppercase font-black opacity-70">Pilih Karbohidrat</p>
            </div>
            <div className="p-8 space-y-3">
              {['Nasi', 'Lontong', 'Singkong'].map(type => {
                const isSmall = addonModal.id === "M3" || addonModal.id === "M4";
                let badge = "Harga Tetap";
                if (!isSmall && type === 'Nasi') badge = "+1.000";
                if (!isSmall && type === 'Singkong') badge = "-1.000";
                return (
                  <button key={type} onClick={() => handleAddToCart(addonModal, type)} className="w-full flex items-center justify-between p-5 bg-slate-50 hover:bg-amber-50 border-2 border-transparent hover:border-amber-200 rounded-2xl transition-all">
                    <div className="flex items-center gap-4">
                      <span className="text-3xl">{type === 'Nasi' ? '🍚' : type === 'Lontong' ? '📦' : '🍠'}</span>
                      <span className="font-black uppercase text-slate-700 text-sm">{type}</span>
                    </div>
                    <span className="text-[10px] font-black px-3 py-1 bg-white rounded-full border shadow-sm">{badge}</span>
                  </button>
                );
              })}
              <button onClick={() => setAddonModal(null)} className="w-full py-2 text-slate-300 font-black text-[10px] uppercase">Batal</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SUCCESS / RECEIPT */}
      {showReceipt && (
        <div className="fixed inset-0 z-[110] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[3.5rem] p-10 text-center shadow-2xl border-t-[12px] border-green-500">
            <div className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={48} />
            </div>
            <h2 className="text-2xl font-black uppercase italic mb-2 tracking-tighter">Berhasil Simpan</h2>
            <p className="text-6xl font-black text-slate-900 mb-8 tracking-tighter">#{showReceipt.no_pesanan}</p>
            <div className="grid gap-3">
               <button onClick={() => cetakStruk(showReceipt, cart)} className="w-full py-4 bg-amber-500 text-white rounded-2xl font-black uppercase flex items-center justify-center gap-2"><Printer size={20}/> Cetak Ulang</button>
               <button onClick={() => setShowReceipt(null)} className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black uppercase">Tutup</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- SUB COMPONENTS ---
function LoginScreen({ users, onLogin, onRefresh }) {
  const [pin, setPin] = useState('');
  return (
    <div className="h-screen w-screen flex items-center justify-center bg-amber-500 p-6">
      <div className="bg-white p-12 rounded-[4rem] shadow-2xl w-full max-w-sm text-center">
        <h2 className="text-3xl font-black mb-10 uppercase italic text-slate-900 tracking-tighter leading-none">Soto Ra-Me23</h2>
        <input type="password" value={pin} onChange={(e) => setPin(e.target.value)} className="w-full bg-slate-100 py-6 rounded-3xl text-center text-5xl font-black outline-none border-4 focus:border-amber-500 mb-6 transition-all" placeholder="••••" />
        <button onClick={() => {
          const u = users.find(x => String(x.pin) === String(pin));
          if (u) onLogin(u); else { alert("PIN SALAH!"); setPin(''); }
        }} className="w-full py-6 bg-slate-900 text-white rounded-3xl font-black uppercase shadow-xl">Masuk</button>
        <button onClick={onRefresh} className="mt-8 text-slate-300"><RefreshCw size={24} className="mx-auto"/></button>
      </div>
    </div>
  );
}

function AdminPanel({ config, onRefresh, usedNumbers }) {
  return (
    <main className="flex-1 p-12 bg-white overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-black mb-12 uppercase italic border-b-4 border-amber-500 pb-2 inline-block">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="p-8 bg-slate-50 rounded-[3rem] text-center">
            <p className="font-black text-xs text-slate-400 mb-6 uppercase">Shift Status: {config.shiftStatus}</p>
            <button onClick={async () => { await updateShiftCloud(config.shiftStatus === 'OPEN' ? 'CLOSED' : 'OPEN'); onRefresh(); }} className={`w-full py-8 rounded-[2rem] font-black uppercase text-xl text-white ${config.shiftStatus === 'OPEN' ? 'bg-red-500' : 'bg-green-500'}`}>
              {config.shiftStatus === 'OPEN' ? 'Tutup Shift' : 'Buka Shift'}
            </button>
          </div>
          <div className="p-8 bg-slate-50 rounded-[3rem]">
            <p className="font-black text-xs text-slate-400 mb-4 uppercase text-center">Antrean Terpakai</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {usedNumbers.map(n => <span key={n} className="px-4 py-2 bg-white border font-black rounded-xl">#{n}</span>)}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
