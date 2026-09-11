#!/usr/bin/env bash
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"
PID_FILE="$PROJECT_DIR/scripts/.sync_daemon.pid"

if [ ! -f "$PID_FILE" ]; then
    echo "ℹ️  Tidak ada sync daemon yang tercatat berjalan."
    exit 0
fi

PID=$(cat "$PID_FILE")
if ps -p "$PID" > /dev/null 2>&1; then
    echo "🛑 Menghentikan sync daemon (PID: $PID)..."
    kill "$PID" 2>/dev/null || true
    rm -f "$PID_FILE"
    echo "✅ Sync daemon berhasil dihentikan."
else
    echo "ℹ️  Proses daemon (PID: $PID) sudah tidak aktif."
    rm -f "$PID_FILE"
fi
