#!/usr/bin/env bash
# ==============================================================================
# Script Menjalankan Portal Abadi Jaya - BSI Infoblox & iCare OTRS Management System
# ==============================================================================

set -e
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

echo "========================================================"
echo "🚀 Memulai Portal Abadi Jaya (BSI Infoblox & iCare OTRS)"
echo "========================================================"
echo "📁 Direktori: $PROJECT_DIR"

# Periksa Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js tidak ditemukan. Silakan pasang Node.js (v18+) terlebih dahulu."
    exit 1
fi

# Periksa Python3 & modul requests
if command -v python3 &> /dev/null; then
    if ! python3 -c "import requests" &> /dev/null; then
        echo "⚠️  Modul python 'requests' belum terpasang. Menginstall via pip..."
        pip3 install --user requests urllib3 || pip install requests urllib3
    fi
else
    echo "⚠️  Peringatan: python3 tidak ditemukan. Fitur sinkronisasi iCare OTRS membutuhkan python3."
fi

# Jalankan auto-sync daemon iCare OTRS di background (tiap 3 menit)
SYNC_PID=""
if command -v python3 &> /dev/null; then
    echo "🔄 Menjalankan auto-sync background iCare -> Supabase (setiap 3 menit)..."
    node scripts/sync_otrs_to_supabase.mjs --daemon --interval 180 > /dev/null 2>&1 &
    SYNC_PID=$!
    echo "   [Daemon PID: $SYNC_PID aktif]"
fi

cleanup() {
    if [ -n "$SYNC_PID" ]; then
        echo ""
        echo "🛑 Menghentikan background syncer iCare (PID: $SYNC_PID)..."
        kill "$SYNC_PID" 2>/dev/null || true
    fi
}
trap cleanup EXIT INT TERM

# Jalankan server
echo "🌐 Menjalankan server aplikasi di http://localhost:3000..."
echo "👤 Akun Login: admin (Administrator)"
echo "========================================================"
npm run dev

