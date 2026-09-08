#!/usr/bin/env bash
set -e

# ==============================================================================
# TicketOps Instant Rollback Script
# Mengembalikan aplikasi ke kondisi stabil dalam 1 detik
# ==============================================================================

SCRIPT_PATH="$(readlink -f "${BASH_SOURCE[0]}")"
ROOT_DIR="$(cd "$(dirname "$SCRIPT_PATH")/.." && pwd)"
cd "$ROOT_DIR"

TARGET="$1"

echo "================================================================="
echo "🔄 TICKETOP'S INSTANT ROLLBACK SYSTEM"
echo "================================================================="

# Jika target diberikan langsung sebagai argumen (misal: ./rollback.sh v1.0.0-stable)
if [ -n "$TARGET" ]; then
  echo "🎯 Melakukan rollback langsung ke target: $TARGET"
  git reset --hard "$TARGET"
  echo "🧹 Membersihkan file temporary / untracked..."
  git clean -fd -e node_modules/ -e dist/ -e .env
  echo "✅ Berhasil rollback ke $TARGET!"
  echo "🔨 Menjalankan verifikasi build..."
  npm run build
  echo "🎉 Aplikasi siap dan berjalan stabil!"
  exit 0
fi

# Cek apakah ada uncommitted changes
UNCOMMITTED=$(git status --porcelain)

if [ -n "$UNCOMMITTED" ]; then
  echo "⚠️  Perhatian: Terdapat perubahan berkas yang belum di-commit:"
  git status --short
  echo ""
fi

# Tampilkan menu pilihan rollback
echo "Pilih opsi rollback yang Anda inginkan:"
echo "  1) [Rekomendasi] Rollback ke Baseline Stabil Asli (v1.0.0-stable)"
echo "  2) Rollback ke Checkpoint / Commit Sebelumnya (HEAD~1)"
echo "  3) Batalkan Semua Perubahan Berkas Saat Ini (Discard Working Changes)"
echo "  4) Tampilkan Riwayat Checkpoint & Tag"
echo "  5) Batal (Keluar)"
echo ""

# Periksa apakah terminal interaktif
if [ -t 0 ]; then
  read -p "Masukkan pilihan [1-5]: " CHOICE
else
  # Default jika dijalankan non-interaktif
  CHOICE="1"
  echo "Mode non-interaktif terdeteksi. Memilih opsi 1 (Rollback ke v1.0.0-stable)."
fi

case "$CHOICE" in
  1)
    echo "🔄 Melakukan rollback ke Baseline Stabil (v1.0.0-stable)..."
    git reset --hard v1.0.0-stable
    git clean -fd -e node_modules/ -e dist/ -e .env
    echo "✅ Berhasil rollback ke v1.0.0-stable!"
    npm run build
    ;;
  2)
    echo "🔄 Melakukan rollback ke 1 commit sebelumnya..."
    git reset --hard HEAD~1
    git clean -fd -e node_modules/ -e dist/ -e .env
    echo "✅ Berhasil rollback ke commit sebelumnya!"
    npm run build
    ;;
  3)
    echo "🔄 Membatalkan seluruh perubahan yang belum tersimpan..."
    git reset --hard HEAD
    git clean -fd -e node_modules/ -e dist/ -e .env
    echo "✅ Seluruh perubahan berkas telah dibatalkan!"
    npm run build
    ;;
  4)
    echo ""
    echo "📜 Riwayat Checkpoint & Commit Terakhir:"
    git log --oneline -n 10
    echo ""
    echo "🏷️  Daftar Tag:"
    git tag -l -n1
    echo ""
    echo "Gunakan: ./scripts/rollback.sh <nama-tag/commit-id> untuk rollback ke salah satunya."
    exit 0
    ;;
  5)
    echo "Operasi rollback dibatalkan."
    exit 0
    ;;
  *)
    echo "❌ Pilihan tidak valid."
    exit 1
    ;;
esac

echo ""
echo "================================================================="
echo "🎉 ROLLBACK BERHASIL!"
echo "   Status Git saat ini:"
git log -n 1 --oneline
echo "================================================================="
