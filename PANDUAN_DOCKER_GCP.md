# Panduan Lengkap: Menjalankan Aplikasi TicketOps di Docker & Google Cloud Platform (GCP)

Dokumen ini memandu Anda langkah demi langkah untuk menjalankan aplikasi **TicketOps (BSI Infoblox & iCare OTRS)** di dalam container Docker serta mendeploy-nya ke **Google Cloud Platform (GCP)**.

---

## 📌 Jawaban: Apakah GCP / Cloud Run Ini Gratis?

> **YA, BISA GRATIS (Rp 0,- / $0)** jika menggunakan **Google Cloud Run** dalam batas Free Tier.

### 1. Kuota Gratis Selamanya (GCP Free Tier Tiap Bulan)
Google Cloud menyediakan kuota gratis setiap bulan untuk Cloud Run yang selalu diperbarui:
- **2.000.000 (2 Juta) Request per bulan**: GRATIS.
- **360.000 GB-detik Memori & 180.000 vCPU-detik per bulan**: GRATIS.
- **Egress (Data Transfer Keluar) 1 GB per bulan**: GRATIS.
- **Sertifikat SSL / HTTPS Otomatis**: GRATIS.

Karena TicketOps adalah aplikasi operasional internal (digunakan oleh tim DNS/DHCP dengan ratusan atau ribuan request per bulan), pemakaian sistem Anda **jauh di bawah batas 2 juta request**, sehingga **tagihan bulanannya Rp 0**.

### 2. Kredit $300 untuk Akun Baru
Jika Anda mendaftar akun Google Cloud baru, Google memberikan saldo gratis **$300 (sekitar Rp 4,5 – 5 Juta)** yang dapat digunakan selama 90 hari pertama.

### 3. Tips Aman Bebas Tagihan
Di Google Cloud Console, buka menu **Billing** ➔ **Budgets & alerts**, lalu buat budget alert sebesar **Rp 10.000** atau **$1**. Google akan mengirim email otomatis jika ada indikasi biaya mendekati batas tersebut.

---

## 🛠️ Bagian 1: Uji Coba Docker di Komputer Lokal

Sebelum mendeploy ke cloud, Anda dapat menguji container Docker di laptop/komputer Anda:

### Opsi A: Menggunakan Docker Compose (Paling Mudah)
Buka terminal di folder project:
```bash
docker compose up --build
```
Aplikasi akan otomatis dibuild dan berjalan di:
👉 **http://localhost:8080**

Untuk mematikan container:
```bash
docker compose down
```

### Opsi B: Menggunakan Perintah Docker Manual
```bash
# 1. Build image Docker
docker build -t ticketops-app .

# 2. Jalankan container pada port 8080
docker run -d -p 8080:8080 --name ticketops-container ticketops-app

# 3. Cek log container
docker logs -f ticketops-container
```

---

## ☁️ Bagian 2: Deployment ke Google Cloud Run (Rekomendasi Terbaik)

Google Cloud Run adalah layanan *serverless container* yang secara otomatis mengelola server, scaling, dan HTTPS.

### Langkah 1: Pasang Google Cloud SDK (`gcloud`)
Jika di komputer Anda belum ada `gcloud CLI`:
- **Ubuntu/Debian**:
  ```bash
  sudo apt-get install apt-transport-https ca-certificates gnupg curl
  curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | sudo gpg --dearmor -o /usr/share/keyrings/cloud.google.gpg
  echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" | sudo tee -a /etc/apt/sources.list.d/google-cloud-sdk.list
  sudo apt-get update && sudo apt-get install google-cloud-cli
  ```
- Atau unduh installer dari: https://cloud.google.com/sdk/docs/install

### Langkah 2: Login & Tentukan Project GCP
1. Login ke akun Google Anda:
   ```bash
   gcloud auth login
   ```
2. Buat Project baru di GCP Console (misalnya `bsi-ticketops-prod`) atau gunakan yang sudah ada:
   ```bash
   # Lihat daftar project Anda
   gcloud projects list

   # Atur project aktif
   gcloud config set project ID_PROJECT_ANDA
   ```

### Langkah 3: Aktifkan Layanan GCP yang Diperlukan
Jalankan perintah ini sekali saja untuk mengaktifkan Cloud Build, Artifact Registry, dan Cloud Run:
```bash
gcloud services enable run.googleapis.com \
                       cloudbuild.googleapis.com \
                       artifactregistry.googleapis.com
```

### Langkah 4: Build & Deploy Langsung dari Source Code (1 Perintah)
Masuk ke folder project, lalu jalankan perintah berikut:
```bash
gcloud run deploy ticketops \
  --source . \
  --region asia-southeast2 \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 2
```

> 💡 **Keterangan Parameter:**
> - `--region asia-southeast2`: Lokasi data center Jakarta (Indonesia), akses paling cepat dengan latensi rendah.
> - `--min-instances 0`: **PENTING agar gratis!** Saat tidak ada staf yang membuka web, container tidur (*scale to zero*) sehingga vCPU & RAM tidak memakan kuota tagihan.
> - `--allow-unauthenticated`: Mengizinkan akses browser ke web tanpa harus login IAM Google (login tetap melalui portal TicketOps).

### Langkah 5: Atur Environment Variables (Koneksi Supabase)
Jika Anda menggunakan database cloud Supabase, masukkan kredensial URL & Key ke Cloud Run:
```bash
gcloud run services update ticketops \
  --region asia-southeast2 \
  --set-env-vars "VITE_SUPABASE_URL=https://swetbrajtwfworcvgssh.supabase.co,VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Langkah 6: Selesai & Dapatkan Link Publik
Setelah proses deploy selesai (sekitar 1–2 menit), Cloud Run akan menampilkan URL publik ber-HTTPS:
```
Service [ticketops] revision [ticketops-00001-xxx] has been deployed and is serving 100 percent of traffic.
Service URL: https://ticketops-xxxxxxxx-as.a.run.app
```
Buka URL tersebut di browser mana saja (Chrome, Edge, HP, dsb). Sistem sudah aktif di Google Cloud!

---

## 🖥️ Bagian 3: Alternatif Deployment ke Google Compute Engine (VM GCP)

Jika Anda lebih memilih menggunakan Server Virtual Machine (VM) konvensional di GCP:

1. Di GCP Console, buka **Compute Engine** ➔ **VM Instances** ➔ **Create Instance**.
2. Pilih OS: **Ubuntu 22.04 LTS / 24.04 LTS**.
3. Centang opsi firewall: **"Allow HTTP traffic"** dan **"Allow HTTPS traffic"**.
4. Klik **SSH** ke VM Anda, lalu install Docker:
   ```bash
   sudo apt-get update
   sudo apt-get install -y docker.io docker-compose
   sudo usermod -aG docker $USER
   ```
5. Clone repository project atau upload folder ke VM:
   ```bash
   cd /home/$USER/project
   docker compose up -d --build
   ```
6. Akses via IP Eksternal VM Anda: `http://<EXTERNAL_IP_VM>:8080`.

---

## 💾 Bagian 4: Cara Memindahkan Data Menggunakan Fitur Backup JSON

Dengan fitur **Backup JSON** baru yang sudah dipasang:

1. **Di Komputer Lokal (Sebelum Pindah ke GCP)**:
   - Buka menu **Settings** di web lokal (`http://localhost:3000`).
   - Pada panel **"Fitur Backup & Restore Data (Format JSON)"**, klik tombol:
     👉 **"Download Full Backup (.json)"**.
   - File `ticketops_full_backup_YYYYMMDD_HHmmss.json` berisi seluruh ratusan tiket operasional BSI, worklog, dan catatan resolusi akan tersimpan di laptop Anda.

2. **Di Web Cloud Run GCP (Setelah Selesai Deploy)**:
   - Buka URL Cloud Run Anda (`https://ticketops-xxx.a.run.app`).
   - Login sebagai admin (`ismailak` / `ismailak1234`).
   - Masuk ke menu **Settings**.
   - Pada bagian **Restore Data dari File JSON**, pilih file backup JSON yang tadi diunduh.
   - Klik tombol biru **"Pulihkan X Tiket Sekarang"**.
   - Seluruh data operasional Anda akan langsung sinkron dan aktif di cloud Google!

---

## 📞 Troubleshooting

| Kendala | Solusi |
| :--- | :--- |
| **Error `gcloud: command not found`** | Pastikan Google Cloud SDK sudah terinstall atau gunakan Cloud Shell di https://shell.cloud.google.com |
| **Port mismatch di Cloud Run** | Cloud Run secara default menyuntikkan `$PORT=8080`. Dockerfile dan `vite.config.ts` sudah dikonfigurasi membaca port ini secara otomatis. |
| **Skrip iCare OTRS memerlukan koneksi internet** | Container Dockerfile sudah dilengkapi pustaka Python 3 (`requests`, `urllib3`) dan sertifikat CA TLS (`ca-certificates`). |
