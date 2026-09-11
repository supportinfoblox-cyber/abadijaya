#!/usr/bin/env bash
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"
PID_FILE="$PROJECT_DIR/scripts/.sync_daemon.pid"

if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if ps -p "$PID" > /dev/null 2>&1; then
        echo "⚠️  Sync daemon sudah berjalan (PID: $PID)"
        exit 0
    fi
fi

echo "🚀 Menjalankan iCare Background Sync Daemon (tiap 3 menit)..."
node scripts/sync_otrs_to_supabase.mjs --daemon --interval 180 >> "$PROJECT_DIR/scripts/sync_daemon.log" 2>&1 &
NEW_PID=$!
disown $NEW_PID
echo "$NEW_PID" > "$PID_FILE"
echo "✅ Daemon berhasil dijalankan di background dengan PID: $NEW_PID"
echo "📄 Log tersimpan di: scripts/sync_daemon.log"

