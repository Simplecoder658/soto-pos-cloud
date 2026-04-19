import React, { useState, useEffect } from 'react';
// ... import lainnya tetap sama ...

export default function App() {
  // ... state lainnya ...
  const [addonModal, setAddonModal] = useState(null); // State untuk kontrol pop-up addon

  // LOGIKA BARU: Saat menu diklik
  const handleMenuClick = (m) => {
    // Daftar menu yang butuh pilihan Karbo sesuai PDF
    const sotoMenu = [
      'Soto Ayam Kampung "Resep Ibu"', 
      'Soto Daging "Andalan Bapak"',
      'Soto Ayam Kampung "Porsi Adik"',
      'Soto Daging "Porsi Adik"',
      'Kalsot "Favorit Warga 23"'
    ];

    if (sotoMenu.includes(m.name)) {
      setAddonModal(m); // Munculkan pop-up pilihan
    } else {
      addToCart(m); // Menu biasa langsung masuk keranjang
    }
  };

  const addToCart = (item, addon = "") => {
    // Gabungkan nama menu dengan addonnya biar jelas di struk
    const displayName = addon ? `${item.name} (${addon})` : item.name;
    
    // Logika penyesuaian harga otomatis sesuai PDF (Jika perlu)
    let finalPrice = item.price;
    // Contoh: Jika Singkong 15rb, Nasi 14rb (-1000), Lontong 13rb (-2000)
    if (addon === 'Nasi') finalPrice -= 1000;
    if (addon === 'Lontong') finalPrice -= 2000;

    const inCart = cart.find(x => x.combinedId === displayName);
    if (inCart) {
      setCart(cart.map(x => x.combinedId === displayName ? {...x, quantity: x.quantity + 1} : x));
    } else {
      setCart([...cart, { ...item, displayName, price: finalPrice, quantity: 1, combinedId: displayName }]);
    }
    setAddonModal(null); // Tutup modal setelah pilih
  };

  return (
    <div className="h-screen bg-slate-50 flex overflow-hidden font-sans">
      {/* ... bagian sidebar & main ... */}
      
      {/* GRID MENU - Menggunakan handleMenuClick baru */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {menu.map(m => (
          <div key={m.id} onClick={() => handleMenuClick(m)} className="bg-white p-4 rounded-[2.5rem] border hover:shadow-xl cursor-pointer">
             <div className="text-4xl mb-2">{m.img || '🍲'}</div>
             <p className="font-black text-[10px] uppercase">{m.name}</p>
             <p className="text-amber-600 font-black text-xs">Rp {m.price.toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* POP-UP ADDON (MODAL) */}
      {addonModal && (
        <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[3rem] p-8 shadow-2xl border-t-[12px] border-amber-500 text-center">
            <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Pilih Pendamping (Karbo)</p>
            <h2 className="text-xl font-black mb-6 uppercase italic">{addonModal.name}</h2>
            
            <div className="grid gap-3">
              {['Singkong', 'Nasi', 'Lontong'].map(addon => (
                <button 
                  key={addon}
                  onClick={() => addToCart(addonModal, addon)}
                  className="w-full py-5 bg-slate-50 hover:bg-amber-500 hover:text-white rounded-2xl font-black uppercase transition-all border-2 border-slate-100 flex justify-between px-6"
                >
                  <span>{addon}</span>
                  <span className="opacity-50 text-[10px]">Pilih +</span>
                </button>
              ))}
            </div>
            
            <button 
              onClick={() => setAddonModal(null)} 
              className="mt-6 text-slate-300 font-black uppercase text-[10px] hover:text-red-500"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* ... sisa kode lainnya ... */}
    </div>
  );
}
