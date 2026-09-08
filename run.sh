#!/usr/bin/env bash
# ==============================================================================
# Script Menjalankan TicketOps - BSI Infoblox & iCare OTRS Management System
# ==============================================================================

set -e
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

echo "========================================================"
echo "🚀 Memulai TicketOps Portal (BSI Infoblox & iCare OTRS)"
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

# Jalankan server
echo "🌐 Menjalankan server aplikasi di http://localhost:3000..."
echo "👤 Akun Login: ismailak / ismailak1234 (Administrator)"
echo "========================================================"
npm run dev
