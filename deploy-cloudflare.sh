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
# Deploy ke Cloudflare Pages dengan target project ticketops
npx -y wrangler pages deploy dist --project-name ticketops --branch master --commit-dirty=true


echo ""
echo "========================================="
echo "Deploy Selesai! 🎉"
echo "========================================="
