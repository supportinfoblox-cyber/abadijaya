#!/usr/bin/env bash
set -e

# ==============================================================================
# TicketOps Automated Checkpoint Script
# Simpan kondisi kerja aplikasi sebelum melakukan perubahan baru
# ==============================================================================

MSG="${1:-Checkpoint Otomatis $(date '+%Y-%m-%d %H:%M:%S')}"
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
TAG_NAME="checkpoint_${TIMESTAMP}"

# Pastikan berada di root directory project
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$DIR"

# Cek apakah ada perubahan
if [ -z "$(git status --porcelain)" ]; then
  echo "ℹ️  Tidak ada perubahan berkas yang terdeteksi. Membuat tag checkpoint pada HEAD..."
  git tag -a "$TAG_NAME" -m "$MSG"
  echo "✅ Checkpoint berhasil dibuat: $TAG_NAME"
  exit 0
fi

# Stage semua perubahan
git add -A

# Commit perubahan
git commit -m "checkpoint: $MSG"

# Buat tag
git tag -a "$TAG_NAME" -m "$MSG"

echo "================================================================="
echo "✅ Checkpoint Sukses Disimpan!"
echo "   Tag     : $TAG_NAME"
echo "   Pesan   : $MSG"
echo "   Commit  : $(git rev-parse --short HEAD)"
echo "-----------------------------------------------------------------"
echo "💡 Untuk rollback ke checkpoint ini sewaktu-waktu:"
echo "   ./scripts/rollback.sh $TAG_NAME"
echo "   atau: npm run rollback"
echo "================================================================="
