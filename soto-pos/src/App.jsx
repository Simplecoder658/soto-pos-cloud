import React, { useState, useEffect } from 'react';
import { LayoutGrid, Settings, Trash2, LogOut, RefreshCw, X, CheckCircle2, Printer } from 'lucide-react';
import { fetchCloudData, saveOrderToSheet, updateShiftCloud } from './db';

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [view, setView] = useState('pos');
  const [menu, setMenu] = useState([]);
  const [users, setUsers] = useState([]);
  const [config, setConfig] = useState({ shiftStatus: "CLOSED" });
  const [usedNumbers, setUsedNumbers] = useState([]);
  const [cart, setCart] = useState([]);
  const [orderNo, setOrderNo] = useState("");
  const [payMethod, setPayMethod] = useState('Tunai');
  const [isSync, setIsSync] = useState(false);
  const [addonModal, setAddonModal] = useState(null); 
  const [showReceipt, setShowReceipt] = useState(null); 

  const initData = async () => {
    const data = await fetchCloudData();
    if (data) {
      setMenu(data.menu || []);
      setUsers(data.users || []);
      setUsedNumbers(data.usedOrders || []);
      setConfig({ shiftStatus: data.shiftStatus });
    }
    setIsLoading(false);
  };

  useEffect(() => { initData(); }, []);

  const cetakStruk = (data, items) => {
    const isAndroid = /Android/i.test(navigator.userAgent);
    if (isAndroid) {
      // JALUR RAWBT (HUAWEI/ANDROID)
      let t = `SOTO RA-ME23\n#${data.no_pesanan}\n--------------------------------\n`;
      t += `Kasir: ${data.kasir}\n--------------------------------\n`;
      items.forEach(i => { t += `${i.name}\n${i.qty}x @${i.price} = ${i.price*i.qty}\n`; });
      t += `--------------------------------\nTOTAL: Rp ${data.total.toLocaleString()}\n\n\n\n`;
      window.location.href = "rawbt:base64," + btoa(unescape(encodeURIComponent(t)));
    } else {
      // JALUR LAPTOP (CHROME DEFAULT)
      const p = window.open('', '_blank', 'width=300');
      p.document.write(`<html><body style="font-family:monospace;width:58mm;padding:3mm;font-size:12px;">
        <center><b>SOTO RA-ME23</b><br><b style="font-size:20px;">#${data.no_pesanan}</b></center><hr>
        ${items.map(i => `<div>${i.name}<br>${i.qty}x @${i.price} = ${i.price*i.qty}</div>`).join('<br>')}
        <hr><b>TOTAL: Rp ${data.total.toLocaleString()}</b><br>Kasir: ${data.kasir}<br><center>TERIMA KASIH</center>
        <script>window.onload=function(){window.print();setTimeout(()=>{window.close()},500)}</script></body></html>`);
      p.document.close();
    }
  };

  const handleAddToCart = (item, type = "") => {
    let finalName = item.name;
    let finalPrice = Number(item.price);
    const isAdik = item.id === "M3" || item.id === "M4";

    if (type === "Lontong") finalName += " (Ori)";
    else if (type === "Nasi") { finalName += " (Nasi)"; if (!isAdik) finalPrice += 1000; }
    else if (type === "Singkong") { finalName += " (Singkong)"; if (!isAdik) finalPrice -= 1000; }
    else if (type === "STK") { finalName += " (STK)"; if (!isAdik) finalPrice -= 1000; }

    const key = finalName;
    setCart(prev => {
      const ex = prev.find(x => x.key === key);
      if (ex) return prev.map(x => x.key === key ? { ...x, qty: x.qty + 1 } : x);
      return [...prev, { ...item, name: finalName, price: finalPrice, qty: 1, key }];
    });
    setAddonModal(null);
  };

  const handleCheckout = async () => {
    if (cart.length === 0 || !orderNo || usedNumbers.includes(String(orderNo)) || isSync) return;
    setIsSync(true);
    const orderData = {
      no_pesanan: orderNo,
      items: cart.map(i => `${i.name} x${i.qty}`).join(", "),
      total: cart.reduce((s, i) => s + (i.price * i.qty), 0),
      method: payMethod,
      kasir: currentUser.username,
      cart: cart.map(i => ({ id: i.id, quantity: i.qty }))
    };
    const res = await saveOrderToSheet(orderData);
    if (res.status === "OK") {
      cetakStruk(orderData, cart);
      setShowReceipt(orderData);
      setCart([]); setOrderNo(""); initData();
    }
    setIsSync(false);
  };

  if (isLoading) return <div className="h-screen flex items-center justify-center font-black text-amber-500">SOTO RA-ME...</div>;
  if (!currentUser) return <Login users={users} onLogin={setCurrentUser} />;

  return (
    <div className="h-screen w-full bg-slate-50 flex overflow-hidden font-sans select-none">
      <nav className="w-16 bg-white border-r flex flex-col items-center py-6 justify-between shadow-sm">
        <div className="flex flex-col gap-6">
          <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-white font-black italic shadow-lg shadow-amber-200">R</div>
          <button onClick={() => setView('pos')} className={`p-2 ${view === 'pos' ? 'text-amber-500' : 'text-slate-300'}`}><LayoutGrid/></button>
          {currentUser.role === 'admin' && <button onClick={() => setView('admin')} className={`p-2 ${view === 'admin' ? 'text-slate-900' : 'text-slate-300'}`}><Settings/></button>}
        </div>
        <button onClick={() => setCurrentUser(null)} className="text-slate-200 p-2"><LogOut/></button>
      </nav>

      <div className="flex-1 flex overflow-hidden">
        {view === 'admin' ? (
          <div className="p-8 w-full"><h1 className="text-2xl font-black italic mb-6">ADMIN</h1>
            <button onClick={async () => { await updateShiftCloud(config.shiftStatus === 'OPEN' ? 'CLOSED' : 'OPEN'); initData(); }} 
                    className={`w-full py-6 rounded-2xl font-black text-white ${config.shiftStatus === 'OPEN' ? 'bg-red-500' : 'bg-green-500'}`}>
              {config.shiftStatus === 'OPEN' ? 'TUTUP SHIFT' : 'BUKA SHIFT'}
            </button>
          </div>
        ) : (
          <>
            <main className="flex-1 p-6 overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-xl font-black uppercase italic border-l-4 border-amber-500 pl-3 leading-none">Menu</h1>
                <button onClick={initData} className="text-slate-200"><RefreshCw size={20}/></button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {menu.map(m => (
                  <div key={m.id} onClick={() => m.options ? setAddonModal(m) : handleAddToCart(m)} className="bg-white p-6 rounded-[2rem] border shadow-sm active:scale-95 transition-all text-center">
                    <div className="text-4xl mb-2">{m.img}</div>
                    <p className="font-bold text-[9px] uppercase text-slate-400 h-8 flex items-center justify-center leading-tight">{m.name}</p>
                    <p className="text-amber-600 font-black italic text-lg">Rp {Number(m.price).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </main>

            <aside className="w-[320px] bg-white border-l p-6 flex flex-col shadow-xl z-20">
              <div className="flex-1 overflow-y-auto space-y-2 mb-4">
                {cart.map(i => (
                  <div key={i.key} className="bg-slate-50 p-4 rounded-2xl flex justify-between items-center border">
                    <div className="flex-1 text-left"><p className="font-black text-[9px] uppercase text-slate-500">{i.name}</p><p className="text-sm font-black">Rp {(i.price*i.qty).toLocaleString()}</p></div>
                    <button onClick={() => setCart(cart.filter(x => x.key !== i.key))} className="text-slate-200 p-1"><Trash2 size={16}/></button>
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                <div className={`p-4 rounded-3xl border-2 ${usedNumbers.includes(String(orderNo)) ? 'border-red-500 bg-red-50' : 'bg-slate-900 border-slate-900'}`}>
                  <input type="number" value={orderNo} onChange={(e) => setOrderNo(e.target.value)} className="w-full bg-transparent text-center text-4xl font-black outline-none text-white" placeholder="00" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {['Tunai', 'QRIS'].map(m => (
                    <button key={m} onClick={() => setPayMethod(m)} className={`py-3 rounded-xl border font-bold text-[10px] uppercase ${payMethod === m ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-slate-400 border-slate-100'}`}>{m}</button>
                  ))}
                </div>
                <button onClick={handleCheckout} disabled={cart.length === 0 || !orderNo || usedNumbers.includes(String(orderNo)) || isSync} 
                        className="w-full py-5 bg-amber-500 text-white rounded-2xl font-black uppercase shadow-lg active:scale-95 disabled:bg-slate-100 disabled:text-slate-300">
                  {isSync ? 'MENYIMPAN...' : 'KONFIRMASI'}
                </button>
              </div>
            </aside>
          </>
        )}
      </div>

      {addonModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xs rounded-[2.5rem] p-6 shadow-2xl overflow-hidden">
            <h2 className="text-lg font-black uppercase italic mb-4 text-center">{addonModal.name}</h2>
            <div className="grid grid-cols-1 gap-2">
              {['Nasi', 'Lontong', 'Singkong', 'STK'].map(type => (
                <button key={type} onClick={() => handleAddToCart(addonModal, type)} className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${type==='STK'?'bg-slate-900 text-white border-slate-900':'bg-slate-50 border-transparent'}`}>
                  <span className="font-bold uppercase text-xs">{type}</span>
                  <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-white border text-slate-900">
                    {addonModal.id === "M3" || addonModal.id === "M4" ? 'Tetap' : (type === 'Nasi' ? '+1k' : type === 'Lontong' ? 'Ori' : '-1k')}
                  </span>
                </button>
              ))}
              <button onClick={() => setAddonModal(null)} className="w-full py-2 text-slate-300 font-bold text-[9px] uppercase mt-2">Batal</button>
            </div>
          </div>
        </div>
      )}

      {showReceipt && (
        <div className="fixed inset-0 z-[60] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xs rounded-[3rem] p-8 text-center border-t-8 border-green-500">
            <CheckCircle2 size={48} className="mx-auto text-green-500 mb-4" />
            <p className="text-6xl font-black text-slate-900 mb-6 italic">#{showReceipt.no_pesanan}</p>
            <button onClick={() => cetakStruk(showReceipt, cart)} className="w-full py-4 bg-amber-500 text-white rounded-2xl font-black uppercase mb-2 flex items-center justify-center gap-2 text-xs"><Printer size={16}/> Cetak Ulang</button>
            <button onClick={() => setShowReceipt(null)} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs">Tutup</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Login({ users, onLogin }) {
  const [pin, setPin] = useState('');
  return (
    <div className="h-screen w-screen flex items-center justify-center bg-amber-500 p-6">
      <div className="bg-white p-10 rounded-[3rem] shadow-2xl w-full max-w-xs text-center border-b-8 border-slate-900">
        <h2 className="text-2xl font-black uppercase italic mb-8">Soto Ra-Me</h2>
        <input type="password" value={pin} onChange={(e) => setPin(e.target.value)} className="w-full bg-slate-100 py-5 rounded-2xl text-center text-4xl font-black outline-none border-2 border-transparent focus:border-amber-500 mb-6" placeholder="••••" />
        <button onClick={() => {
          const u = users.find(x => String(x.pin) === String(pin));
          if (u) onLogin(u); else { alert("PIN SALAH!"); setPin(''); }
        }} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase shadow-lg">Masuk</button>
      </div>
    </div>
  );
}
