# Panduan Sistem Rollback Instan (TicketOps)

Sistem ini dirancang agar setiap perubahan pada aplikasi TicketOps dapat dibatalkan (**rollback**) secara instan hanya dengan **satu perintah**, tanpa proses manual yang rumit dan tanpa risiko merusak konfigurasi sistem.

---

## 🚀 Cara Cepat Rollback (1 Perintah)

Jika ada perubahan atau pembaruan yang tidak Anda sukai, cukup jalankan perintah ini di Terminal project:

```bash
./rollback.sh
```
*(atau bisa juga dengan: `npm run rollback`)*

Skrip interaktif akan menyajikan menu:
1. **[Rekomendasi] Rollback ke Baseline Stabil Asli (`v1.0.0-stable`)**: Mengembalikan aplikasi 100% persis ke kondisi awal yang sudah terverifikasi stabil.
2. **Rollback ke Checkpoint Sebelumnya (`HEAD~1`)**: Mengembalikan kode ke 1 commit/checkpoint sebelum perubahan terakhir.
3. **Batalkan Semua Perubahan Berkas Saat Ini**: Membuang perubahan uncommitted dan mengembalikan berkas ke kondisi commit terakhir.
4. **Tampilkan Riwayat Checkpoint & Tag**: Menampilkan daftar versi dan tanggal snapshot yang pernah dibuat.

---

## ⚡ Rollback Langsung ke Versi Stabil Bawaan (Tanpa Pertanyaan)

Jika Anda ingin langsung kembali ke kondisi stabil awal yang paling aman tanpa konfirmasi:

```bash
npm run rollback:stable
```
*(atau: `./rollback.sh v1.0.0-stable`)*

Perintah ini akan:
1. Mereset seluruh kode sumber ke tag **`v1.0.0-stable`**.
2. Membersihkan berkas-berkas sementara.
3. Menjalankan `npm run build` otomatis untuk memverifikasi bahwa aplikasi kembali dalam kondisi 100% normal.

---

## 📸 Membuat Checkpoint (Snapshot) Sebelum Perubahan Baru

Sebelum Anda meminta AI atau melakukan eksperimen fitur/desain baru, Anda dapat menyimpan kondisi saat ini sebagai checkpoint:

```bash
./checkpoint.sh "Catatan singkat perubahan, misal: Sebelum ubah filter tiket"
```
*(atau: `npm run checkpoint "Sebelum ubah filter tiket"`)*

Sistem akan secara otomatis:
- Menyimpan semua berkas ke repositori lokal.
- Memberi label timestamp (contoh: `checkpoint_20260908_193000`).
- Menyediakan tag yang bisa dijadikan tujuan rollback sewaktu-waktu.

---

## 📋 Ringkasan Perintah Penting

| Perintah | Fungsi | Kapan Digunakan |
| :--- | :--- | :--- |
| `./rollback.sh` | Menu pilihan rollback interaktif | Saat ingin memilih opsi rollback yang fleksibel |
| `npm run rollback:stable` | Rollback instan ke baseline stabil | Saat perubahan saat ini gagal dan ingin langsung kembali ke kondisi awal yang bagus |
| `./checkpoint.sh "pesan"` | Buat checkpoint snapshot baru | Sebelum memulai penyesuaian atau eksperimen baru |
| `git status` | Cek berkas apa saja yang sedang berubah | Untuk melihat apakah ada berkas yang dimodifikasi |
| `git log --oneline -n 5` | Melihat riwayat 5 checkpoint terakhir | Untuk melihat riwayat perubahan |

---

## 🔒 Keamanan Data
- Repositori Git ini **100% lokal** di komputer Anda (tidak di-upload ke publik).
- Cache tiket lokal dan sesi login Anda tetap terjaga dengan aman.
