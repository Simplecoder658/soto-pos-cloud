import React, { useState, useEffect } from 'react';
import { LayoutGrid, Settings, Trash2, LogOut, RefreshCw, ShoppingBag, X, CheckCircle2, Printer } from 'lucide-react';
import { fetchCloudData, saveOrderToSheet, updateShiftCloud } from './db';

export default function App() {
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
  const [addonModal, setAddonModal] = useState(null); 
  const [showReceipt, setShowReceipt] = useState(null); 

  const initData = async () => {
    setIsLoading(true);
    const data = await fetchCloudData();
    if (data) {
      setMenu(data.menu || []);
      setUsers(data.users || []);
      setUsedNumbers(data.usedOrders || []);
      setConfig({ qris: data.qris, shiftStatus: data.shiftStatus });
    }
    setIsLoading(false);
  };

  useEffect(() => { initData(); }, []);

  // LOGIKA HARGA SINGKONG/NASI/LONTONG
  const handleAddToCart = (item, type = "") => {
    let finalName = item.name;
    let finalPrice = Number(item.price);
    const isPorsiAdik = item.id === "M3" || item.id === "M4";

    if (type === "Lontong") finalName += " (Ori)";
    else if (type === "Nasi") { 
      finalName += " (Nasi)"; 
      if (!isPorsiAdik) finalPrice += 1000; 
    }
    else if (type === "Singkong") { 
      finalName += " (Singkong)"; 
      if (!isPorsiAdik) finalPrice -= 1000; 
    }

    const itemKey = finalName; // Supaya Nasi & Singkong jadi item berbeda di keranjang
    setCart(prev => {
      const ex = prev.find(x => x.key === itemKey);
      if (ex) return prev.map(x => x.key === itemKey ? { ...x, qty: x.qty + 1 } : x);
      return [...prev, { ...item, name: finalName, price: finalPrice, qty: 1, key: itemKey }];
    });
    setAddonModal(null);
  };

  // STRUK THERMAL 58mm
  const cetakStruk = (data, items) => {
    const p = window.open('', '_blank', 'width=300');
    p.document.write(`<html><body style="font-family:monospace;width:58mm;padding:3mm;font-size:11px;">
      <center><b>SOTO RA-ME23</b><br>#${data.no_pesanan}</center><hr>
      ${items.map(i => `<div>${i.name}<br>${i.qty}x @${i.price.toLocaleString()} = ${(i.price*i.qty).toLocaleString()}</div>`).join('<br>')}
      <hr><b>TOTAL: Rp ${data.total.toLocaleString()}</b><br>Kasir: ${data.kasir} / ${data.method}<br><center>TERIMA KASIH</center>
      <script>setTimeout(() => { window.print(); window.close(); }, 500);</script></body></html>`);
    p.document.close();
  };

  const handleCheckout = async () => {
    if (cart.length === 0 || !orderNo || usedNumbers.includes(String(orderNo)) || isSync) return;
    setIsSync(true);
    const total = cart.reduce((s, i) => s + (i.price * i.qty), 0);
    const orderData = {
      no_pesanan: orderNo,
      items: cart.map(i => `${i.name} x${i.qty}`).join(", "),
      total: total,
      method: payMethod,
      kasir: currentUser.username,
      cart: cart.map(i => ({ id: i.id, quantity: i.qty }))
    };

    const res = await saveOrderToSheet(orderData);
    if (res.status === "OK") {
      cetakStruk(orderData, cart);
      setShowReceipt(orderData);
      setCart([]); setOrderNo(""); initData();
    } else { alert("Gagal Simpan ke Cloud!"); }
    setIsSync(false);
  };

  if (isLoading) return <div className="h-screen flex items-center justify-center font-black text-amber-500 animate-pulse italic text-2xl uppercase">Menyiapkan Soto...</div>;
  if (!currentUser) return <Login users={users} onLogin={setCurrentUser} />;

  return (
    <div className="h-screen w-full bg-slate-50 flex overflow-hidden select-none font-sans">
      {/* SIDEBAR */}
      <nav className="w-20 bg-white border-r flex flex-col items-center py-8 justify-between shadow-sm z-30">
        <div className="flex flex-col gap-6">
          <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-white font-black italic shadow-lg shadow-amber-200">R</div>
          <button onClick={() => setView('pos')} className={`p-4 rounded-2xl transition-all ${view === 'pos' ? 'bg-amber-100 text-amber-600' : 'text-slate-300 hover:text-amber-400'}`}><LayoutGrid/></button>
          {currentUser.role === 'admin' && <button onClick={() => setView('admin')} className={`p-4 rounded-2xl transition-all ${view === 'admin' ? 'bg-slate-100 text-slate-900' : 'text-slate-300 hover:text-slate-600'}`}><Settings/></button>}
        </div>
        <button onClick={() => setCurrentUser(null)} className="text-slate-200 hover:text-red-500 transition-colors"><LogOut/></button>
      </nav>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex overflow-hidden">
        {view === 'admin' ? (
          <div className="p-12 w-full max-w-4xl mx-auto">
            <h1 className="text-4xl font-black italic mb-8 border-b-4 border-amber-500 pb-2 inline-block uppercase">Admin Control</h1>
            <div className="bg-white p-8 rounded-[3rem] border shadow-sm flex flex-col items-center">
              <p className="font-black text-xs text-slate-400 mb-4 uppercase tracking-widest">Status Shift: {config.shiftStatus}</p>
              <button 
                onClick={async () => { await updateShiftCloud(config.shiftStatus === 'OPEN' ? 'CLOSED' : 'OPEN'); initData(); }} 
                className={`w-full max-w-xs py-6 rounded-[2rem] font-black uppercase text-white shadow-xl transition-all active:scale-95 ${config.shiftStatus === 'OPEN' ? 'bg-red-500' : 'bg-green-500'}`}
              >
                {config.shiftStatus === 'OPEN' ? 'Tutup Shift' : 'Buka Shift'}
              </button>
            </div>
          </div>
        ) : (
          <>
            <main className="flex-1 p-8 overflow-y-auto">
              <div className="flex justify-between items-center mb-10">
                <h1 className="text-3xl font-black uppercase italic border-l-[12px] border-amber-500 pl-4 leading-none tracking-tighter">Menu Utama</h1>
                <button onClick={initData} className="p-2 text-slate-300 hover:text-amber-500"><RefreshCw size={24}/></button>
              </div>
              
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {menu.map(m => (
                  <div 
                    key={m.id} 
                    onClick={() => m.options ? setAddonModal(m) : handleAddToCart(m)} 
                    className="bg-white p-8 rounded-[3rem] border border-slate-100 hover:shadow-2xl hover:shadow-amber-100 cursor-pointer active:scale-95 transition-all text-center group"
                  >
                    <div className="text-6xl mb-4 group-hover:scale-110 transition-transform">{m.img}</div>
                    <p className="font-black text-[10px] uppercase text-slate-400 h-8 flex items-center justify-center mb-1">{m.name}</p>
                    <p className="text-amber-600 font-black text-xl italic">Rp {Number(m.price).toLocaleString()}</p>
                    <div className="mt-2 text-[9px] font-bold text-slate-300 uppercase tracking-widest">Stok: {m.stock}</div>
                  </div>
                ))}
              </div>
            </main>

            {/* KERANJANG */}
            <aside className="w-[400px] bg-white border-l p-8 flex flex-col shadow-2xl z-20">
              <div className="flex-1 overflow-y-auto space-y-3 mb-6 pr-2">
                {cart.length === 0 && <div className="h-full flex items-center justify-center opacity-10 italic font-black text-slate-900 text-3xl rotate-[-10deg]">KOSONG</div>}
                {cart.map(i => (
                  <div key={i.key} className="bg-slate-50 p-5 rounded-[2rem] flex justify-between items-center border border-slate-100 shadow-sm">
                    <div className="flex-1">
                      <p className="font-black text-[10px] uppercase text-slate-500 leading-none mb-1">{i.name}</p>
                      <p className="text-lg font-black text-slate-800 italic leading-none">Rp {(i.price*i.qty).toLocaleString()}</p>
                      <p className="text-[10px] font-bold text-amber-500 mt-1 uppercase">{i.qty} Porsi</p>
                    </div>
                    <button onClick={() => setCart(cart.filter(x => x.key !== i.key))} className="text-slate-200 hover:text-red-500 p-2 transition-colors"><Trash2 size={20}/></button>
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <div className={`p-5 rounded-[2.5rem] border-4 transition-all ${usedNumbers.includes(String(orderNo)) ? 'bg-red-50 border-red-500 animate-shake' : 'bg-slate-900 border-slate-900 shadow-lg'}`}>
                  <p className="text-[10px] text-center text-slate-500 font-black uppercase mb-1">Nomor Antrean</p>
                  <input type="number" value={orderNo} onChange={(e) => setOrderNo(e.target.value)} className="w-full bg-transparent text-center text-5xl font-black outline-none text-white" placeholder="00" />
                  {usedNumbers.includes(String(orderNo)) && <p className="text-[9px] text-red-500 font-black text-center mt-2 uppercase italic">Nomor Sudah Terpakai!</p>}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {['Tunai', 'QRIS'].map(m => (
                    <button key={m} onClick={() => setPayMethod(m)} className={`py-4 rounded-2xl border-2 font-black text-xs uppercase transition-all ${payMethod === m ? 'bg-amber-500 text-white border-amber-500 shadow-lg' : 'bg-white text-slate-400 border-slate-100'}`}>{m}</button>
                  ))}
                </div>

                <div className="pt-4 border-t-4 border-dashed border-slate-100 space-y-4">
                  <div className="flex justify-between items-center px-2">
                    <p className="font-black text-xs text-slate-400 uppercase italic">Total Tagihan</p>
                    <p className="font-black text-4xl text-slate-900 italic tracking-tighter leading-none">Rp {cart.reduce((s,i) => s+(i.price*i.qty), 0).toLocaleString()}</p>
                  </div>
                  <button 
                    onClick={handleCheckout} 
                    disabled={cart.length === 0 || !orderNo || usedNumbers.includes(String(orderNo)) || isSync} 
                    className="w-full py-7 bg-amber-500 hover:bg-amber-600 text-white rounded-[2.5rem] font-black uppercase text-xl shadow-2xl shadow-amber-200 transition-all active:scale-95 disabled:bg-slate-100 disabled:text-slate-300 disabled:shadow-none"
                  >
                    {isSync ? 'MENYIMPAN...' : 'KONFIRMASI'}
                  </button>
                </div>
              </div>
            </aside>
          </>
        )}
      </div>

      {/* MODAL KARBO */}
      {addonModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[4rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="bg-amber-500 p-10 text-center text-white relative">
              <button onClick={() => setAddonModal(null)} className="absolute top-8 right-8 text-white/50 hover:text-white"><X size={28}/></button>
              <h2 className="text-3xl font-black uppercase italic tracking-tighter leading-none mb-1">{addonModal.name}</h2>
              <p className="text-[10px] uppercase font-black tracking-[0.2em] opacity-70">Pilih Karbohidrat</p>
            </div>
            <div className="p-10 space-y-3">
              {['Nasi', 'Lontong', 'Singkong'].map(type => {
                const isSmall = addonModal.id === "M3" || addonModal.id === "M4";
                let badge = "Harga Tetap";
                let bCol = "bg-slate-100 text-slate-400";
                if (!isSmall) {
                  if (type === 'Nasi') { badge = "+1.000"; bCol = "bg-red-100 text-red-500"; }
                  if (type === 'Singkong') { badge = "-1.000"; bCol = "bg-green-100 text-green-500"; }
                }
                return (
                  <button key={type} onClick={() => handleAddToCart(addonModal, type)} className="w-full flex items-center justify-between p-6 bg-slate-50 hover:bg-amber-50 border-2 border-transparent hover:border-amber-200 rounded-3xl transition-all group">
                    <div className="flex items-center gap-4">
                      <span className="text-3xl group-hover:scale-125 transition-transform">{type === 'Nasi' ? '🍚' : type === 'Lontong' ? '📦' : '🍠'}</span>
                      <span className="font-black uppercase text-slate-700 tracking-tight">{type}</span>
                    </div>
                    <span className={`text-[10px] font-black px-4 py-1.5 rounded-full uppercase italic ${bCol}`}>{badge}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS MODAL */}
      {showReceipt && (
        <div className="fixed inset-0 z-[110] bg-slate-900/95 backdrop-blur-2xl flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[4rem] p-12 text-center shadow-2xl border-t-[16px] border-green-500">
            <div className="w-24 h-24 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner"><CheckCircle2 size={56} /></div>
            <h2 className="text-3xl font-black uppercase italic mb-2 tracking-tighter">Berhasil Simpan!</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">Nomor Antrean Anda:</p>
            <p className="text-8xl font-black text-slate-900 mb-10 tracking-tighter italic">#{showReceipt.no_pesanan}</p>
            <div className="flex flex-col gap-3">
               <button onClick={() => cetakStruk(showReceipt, cart)} className="w-full py-5 bg-amber-500 text-white rounded-3xl font-black uppercase flex items-center justify-center gap-3 shadow-lg shadow-amber-200"><Printer size={24}/> Cetak Ulang</button>
               <button onClick={() => setShowReceipt(null)} className="w-full py-6 bg-slate-900 text-white rounded-[2.5rem] font-black uppercase tracking-widest text-sm">Selesai</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Login({ users, onLogin }) {
  const [pin, setPin] = useState('');
  return (
    <div className="h-screen w-screen flex items-center justify-center bg-amber-500 p-6 overflow-hidden">
      <div className="bg-white p-16 rounded-[5rem] shadow-2xl w-full max-w-sm text-center border-b-[15px] border-slate-900 relative">
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-xl text-5xl">🍲</div>
        <h2 className="text-4xl font-black mb-12 uppercase italic tracking-tighter leading-none text-slate-900 mt-4">Soto Ra-Me23</h2>
        <input 
          type="password" 
          value={pin} 
          onChange={(e) => setPin(e.target.value)} 
          className="w-full bg-slate-100 py-7 rounded-[2.5rem] text-center text-6xl font-black outline-none border-4 border-transparent focus:border-amber-500 mb-8 transition-all tracking-widest" 
          placeholder="••••" 
        />
        <button 
          onClick={() => {
            const u = users.find(x => String(x.pin) === String(pin));
            if (u) onLogin(u); else { alert("PIN SALAH!"); setPin(''); }
          }} 
          className="w-full py-7 bg-slate-900 text-white rounded-[2.5rem] font-black uppercase text-xl shadow-2xl active:scale-95 transition-all"
        >
          Masuk Kasir
        </button>
      </div>
    </div>
  );
}
