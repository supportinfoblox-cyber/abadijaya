# Panduan Menjalankan Aplikasi TicketOps (BSI Infoblox & iCare OTRS)

Aplikasi **TicketOps** adalah sistem operasional tiket terintegrasi langsung dengan portal **iCare OTRS** untuk antrean:
- **OP0899 - BSI DNS & DHCP Infoblox**
- **OP0968 - BSI - Infoblox DNS & DHCP DC2 Cibitung**

---

## 1. Prasyarat Sistem

Sebelum menjalankan aplikasi, pastikan komputer Anda memiliki:
1. **Node.js** (Versi 18 atau lebih baru) & **npm**
2. **Python 3** beserta pustaka `requests`:
   ```bash
   pip install requests urllib3
   ```

---

## 2. Cara Menjalankan Aplikasi

Buka Terminal di folder project:
```bash
cd "/home/ismail/Downloads/Project Lainnya/Project Lain 1"
```

Jalankan perintah:
```bash
npm run dev
```
*(Atau Anda juga dapat menjalankan skrip sekali-klik `./run.sh`)*

Aplikasi akan berjalan pada alamat:
👉 **http://localhost:3000**

Buka browser Anda (Google Chrome, Microsoft Edge, atau Firefox) dan akses link di atas.

---

## 3. Akun Login Administrator

Saat pertama kali membuka web, Anda akan disambut oleh halaman **Home Login**:

| Informasi | Kredensial |
| :--- | :--- |
| **Username** | `ismailak` *(atau `ismailak@lt-integra.com`)* |
| **Password** | `ismailak1234` |
| **Role** | **Administrator** (Pemegang Hak Penuh) |

> 💡 *Tersedia tombol **"Auto-Fill Ismail"** pada halaman login untuk mengisi username & password secara instan.*

---

## 4. Panduan Fitur Utama

### A. Tarik Data iCare OTRS (Pilihan 1 Tahun, 6 Bulan, & Antrean Aktif)
1. Buka menu **Ticket Management** di Sidebar.
2. Klik tombol ungu **"Tarik Data iCare"** di pojok kanan atas tabel.
3. Pilih mode penarikan:
   - **Riwayat Arsip & Filter Waktu**: Menarik arsip tiket masa lalu dengan filter rentang waktu:
     - 📅 **1 Tahun Terakhir (Populer)**: Menarik arsip tiket 12 bulan terakhir (~898 tiket terdaftar di OP0899 & OP0968).
     - 📅 **6 Bulan Terakhir**
     - 📅 **3 Bulan Terakhir**
     - 📅 **1 Bulan Terakhir**
     - 📂 **Semua Riwayat (Tanpa Batas Tanggal)**
   - **Antrean Aktif Saat Ini**: Menarik tiket terkini yang sedang berjalan di iCare.
4. Tentukan batas kuota tiket: **100, 250, 500, 1.000, atau 1.500 tiket** *(pilih 1.000 untuk menarik seluruh riwayat 1 tahun)*.
5. Klik **"Mulai Tarik Data"**.
6. Sistem secara otomatis mengklasifikasikan seluruh tiket ke dalam 4 kriteria:
   - 🏢 **IPAM**: Jika mengandung kata IPAM.
   - 📌 **Reserve IP**: Jika mengandung Reserve IP, Reserved IP, Fixed Address, Reservasi IP.
   - 🌐 **DNS Request**: Penambahan DNS dengan sub-kategori otomatis (*A Record, CNAME, TXT, PTR, MX*).
   - 🛡️ **DRP**: Permohonan standby engineer onsite atau kegiatan DRP.

---

### B. Export CSV yang Rapih (Kompatibel Microsoft Excel)
1. **Export Seluruh Hasil Filter**: Klik tombol hijau **"Export CSV (Jumlah Tiket)"** pada toolbar tiket.
2. **Export Tiket Tertentu (Satuan / Banyak)**:
   - Centang checkbox pada tiket yang Anda inginkan.
   - Pada bar mengambang di atas, klik tombol **"Export Terpilih (X)"**.
3. File CSV langsung terunduh dengan format UTF-8 BOM (`\uFEFF`) sehingga teks dan karakter Bahasa Indonesia langsung rapi saat dibuka di Microsoft Excel tanpa font rusak.

---

### C. Diagram Tiket Terbanyak Setiap Bulan (Peak Month)
1. Buka menu **Dashboard** atau **Reports & Analytics**.
2. Anda akan melihat widget visual **Diagram Tiket Terbanyak Setiap Bulannya**.
3. Menampilkan highlight otomatis:
   > 🏆 **Bulan Dengan Tiket Terbanyak (Peak Month)** beserta jumlah tiket dan rata-ratanya.
4. Grafik batang interaktif dilengkapi warna per kriteria (DNS, Reserve IP, IPAM, DRP) dan tooltip saat kursor diarahkan ke batang bulan tersebut.

---

### D. Tutup Tiket & Sinkronisasi ke Portal iCare OTRS
1. **Tutup Satuan**: Klik tombol hijau **"Tutup"** di kolom Actions pada baris tiket mana pun.
2. **Tutup Banyak Sekaligus (Bulk Close)**:
   - Centang checkbox tiket-tiket yang ingin ditutup.
   - Klik tombol hijau **"Tutup X Tiket ke iCare"** pada bar melayang di atas.
3. Masukkan Catatan Resolusi dan konfirmasi. Status tiket akan berubah menjadi `Berhasil ditutup` di portal https://icare.lt-integra.com/otrs/.

---

### E. Manajemen Pengguna (Hak Eksklusif Administrator Ismail)
1. Buka menu **User Management** di Sidebar (Hanya bisa diakses oleh role Admin).
2. Klik tombol **"Provision User"** untuk mendaftarkan rekan tim baru:
   - Masukkan Nama, Username, Email, Password awal, dan Role (*Engineer, Supervisor, Viewer*).
3. Anda dapat menonaktifkan (*Disable*) atau menghapus (*Hapus*) pengguna lain kapan pun.
4. Akun utama Anda (**Ismail Akbar**) terproteksi permanen dan tidak dapat dihapus.

---

### F. Backup & Restore Data (Format JSON)
1. **Backup Tiket dari Tabel**:
   - Klik tombol ungu **"Backup JSON"** pada toolbar tiket untuk mengunduh seluruh tiket hasil filter saat ini dalam format `.json`.
   - Atau centang beberapa tiket tertentu dan klik tombol **"JSON Terpilih"** pada floating toolbar.
2. **Full System Backup & Restore**:
   - Buka menu **Settings**.
   - Klik **"Download Full Backup (.json)"** untuk mengunduh snapshot komplit (tiket, worklog, audit, pengaturan antrean).
   - Gunakan form **"Restore Data dari File JSON"** untuk memulihkan seluruh data operasional kapan saja.

---

### G. Menjalankan di Docker & Google Cloud Platform (GCP)
Aplikasi sudah siap dijalankan via container Docker maupun dideploy gratis ke **Google Cloud Run**:
- Panduan terperinci dapat dibaca di: [PANDUAN_DOCKER_GCP.md](file:///home/ismail/Downloads/Project%20Lainnya/Project%20Lain%201/PANDUAN_DOCKER_GCP.md).

---

## 5. Keluar dari Akun (Logout)
- Klik tombol merah **"Keluar"** di pojok kanan atas Navbar untuk mengakhiri sesi login dan kembali ke halaman Home Login.

---

## 6. Prosedur Rollback Cepat (Membatalkan Perubahan)

Jika sewaktu-waktu ada perubahan kode atau fitur yang ingin dibatalkan secara instan:
- Jalankan di terminal:
  ```bash
  ./rollback.sh
  ```
- Atau langsung kembali ke versi stabil awal:
  ```bash
  npm run rollback:stable
  ```
- Untuk panduan lengkap sistem checkpoint dan rollback, silakan baca [PANDUAN_ROLLBACK.md](file:///home/ismail/Downloads/Project%20Lainnya/Project%20Lain%201/PANDUAN_ROLLBACK.md).
