#!/bin/bash

# Pastikan proses berhenti jika ada error
set -e

echo "========================================="
echo "Memulai proses build aplikasi..."
echo "========================================="
npm run build

echo ""
echo "========================================="
echo "Mendeploy ke Cloudflare Pages..."
echo "========================================="
# Ganti 'ticketops' dengan nama proyek Cloudflare yang Anda inginkan
npx --yes wrangler pages deploy dist --project-name ticketops

echo ""
echo "========================================="
echo "Deploy Selesai! 🎉"
echo "========================================="
