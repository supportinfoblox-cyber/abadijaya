#!/bin/sh
set -e

echo "===================================================="
echo "🚀 Memulai TicketOps Enterprise Container..."
echo "===================================================="

# Buat direktori log jika belum ada
mkdir -p /var/log /app/scripts

# Cek apakah daemon sync diaktifkan (default: true)
ENABLE_SYNC_DAEMON="${ENABLE_SYNC_DAEMON:-true}"

if [ "$ENABLE_SYNC_DAEMON" = "true" ] || [ "$ENABLE_SYNC_DAEMON" = "1" ]; then
  echo "📡 [AUTO-SYNC] Mengaktifkan iCare OTRS Background Sync Daemon..."
  echo "⏱️  [AUTO-SYNC] Interval sinkronisasi: 180 detik (3 menit)"
  
  # Jalankan daemon sinkronisasi ke Supabase di background
  node scripts/sync_otrs_to_supabase.mjs --daemon --interval 180 >> /var/log/sync_daemon.log 2>&1 &
  SYNC_PID=$!
  echo "$SYNC_PID" > /app/scripts/.sync_daemon.pid
  echo "✅ [AUTO-SYNC] Daemon aktif dengan PID: $SYNC_PID (Log: /var/log/sync_daemon.log)"
else
  echo "ℹ️  [AUTO-SYNC] Background sync dinonaktifkan (ENABLE_SYNC_DAEMON=$ENABLE_SYNC_DAEMON)"
fi

TARGET_PORT="${PORT:-8080}"
echo "🌐 [WEB] Menjalankan Server Web Produksi pada port: $TARGET_PORT"
echo "===================================================="

# Jalankan Vite preview server sebagai foreground process
exec npx vite preview --host 0.0.0.0 --port "$TARGET_PORT"
