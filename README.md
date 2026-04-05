# 🥣 Soto Cloud POS
**Sistem Kasir (Point of Sales) Modern, Ringan, dan Berbasis Cloud Google Sheets.**

Soto Cloud adalah aplikasi kasir berbasis web yang dirancang khusus untuk operasional warung soto modern. Menggunakan **React.js** untuk antarmuka yang responsif dan **Google Sheets** sebagai database gratis namun powerful.

![Versi](https://img.shields.io/badge/version-2.0.0-amber)
![License](https://img.shields.io/badge/license-MIT-slate)

---

## ✨ Fitur Utama
* **🛒 POS Interface:** Antarmuka kasir yang intuitif dengan kategori Makanan, Minuman, dan Jajanan.
* **📊 Cloud Database:** Sinkronisasi real-time dengan Google Sheets (Tanpa biaya server).
* **📸 Dual-Mode QRIS:** Upload QRIS langsung dari galeri atau via link URL di panel Admin.
* **🧾 Digital Receipt:** Munculkan struk belanja otomatis setelah transaksi dengan opsi cetak (Print).
* **🔐 Shift Control:** Fitur Buka/Tutup shift untuk keamanan operasional kasir.
* **📱 Mobile Ready:** Optimal digunakan di Tablet, HP, maupun Laptop/PC.

---

## 🛠️ Teknologi
* **Frontend:** React.js + Tailwind CSS
* **Icons:** Lucide React
* **Database:** Google Sheets API (via Google Apps Script)
* **Deployment:** Vercel / Netlify / GitHub Pages

---

## 🚀 Panduan Instalasi

### 1. Persiapan Database (Google Sheets)
Buat Google Sheets dengan 3 tab berikut:
* **Tab `Menu`:** Kolom: `id`, `name`, `price`, `img`, `category`, `stock`.
* **Tab `Users`:** Kolom: `username`, `pin`, `role`.
* **Tab `Config`:** Sel **A2** untuk `shiftStatus`, Sel **B2** untuk `qrisUrl`.
* **Tab `Orders`:** Untuk menampung riwayat transaksi.

### 2. Google Apps Script
Buka *Extensions > Apps Script* di Google Sheets, tempelkan kode backend `.gs`, lalu deploy sebagai **Web App** (Akses: Anyone).

### 3. Setup Project
```bash
# Clone repository
git clone [https://github.com/username/soto-cloud-pos.git](https://github.com/username/soto-cloud-pos.git)

# Masuk ke folder
cd soto-cloud-pos

# Install dependencies
npm install

# Jalankan lokal
npm run dev
