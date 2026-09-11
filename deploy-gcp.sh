#!/bin/bash
# =============================================================================
# deploy-gcp.sh — Deploy TicketOps ke Google Cloud Run
# Jalankan: bash deploy-gcp.sh
# =============================================================================
set -e

# ── Konfigurasi ──────────────────────────────────────────────────────────────
GCP_PROJECT_ID="ticketops-bsi-45612"   # Project aktif
GCP_REGION="asia-southeast2" # Jakarta
SERVICE_NAME="ticketops"
IMAGE_NAME="ticketops-app"

# Load env vars dari .env.local
if [ -f .env.local ]; then
  export $(cat .env.local | grep -v '^#' | xargs)
  echo "✅ .env.local dimuat"
fi

GCLOUD="$HOME/google-cloud-sdk/google-cloud-sdk/bin/gcloud"

# ── Step 1: Cek login ─────────────────────────────────────────────────────────
echo ""
echo "🔑 Step 1: Login ke Google Cloud..."
CURRENT_ACCOUNT=$($GCLOUD auth list --filter=status:ACTIVE --format="value(account)" 2>/dev/null || echo "")
if [ -z "$CURRENT_ACCOUNT" ]; then
  $GCLOUD auth login --account=supportinfoblox@gmail.com
else
  echo "   Sudah login sebagai: $CURRENT_ACCOUNT"
fi

# ── Step 2: Set / Buat project ────────────────────────────────────────────────
echo ""
echo "📁 Step 2: Set project GCP..."
EXISTING_PROJECT=$($GCLOUD projects list --filter="name:ticketops" --format="value(projectId)" 2>/dev/null | head -1 || echo "")

if [ -z "$EXISTING_PROJECT" ]; then
  echo "   Membuat project baru: ticketops-prod..."
  # Generate unique project ID
  TIMESTAMP=$(date +%Y%m%d%H%M)
  GCP_PROJECT_ID="ticketops-${TIMESTAMP}"
  $GCLOUD projects create "$GCP_PROJECT_ID" --name="TicketOps" 2>/dev/null || true
  echo "   ✅ Project dibuat: $GCP_PROJECT_ID"
else
  GCP_PROJECT_ID="$EXISTING_PROJECT"
  echo "   ✅ Menggunakan project yang ada: $GCP_PROJECT_ID"
fi

$GCLOUD config set project "$GCP_PROJECT_ID"
echo "   Project aktif: $GCP_PROJECT_ID"

# ── Step 3: Enable APIs ───────────────────────────────────────────────────────
echo ""
echo "🔧 Step 3: Mengaktifkan Google Cloud APIs..."
$GCLOUD services enable \
  run.googleapis.com \
  containerregistry.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  --quiet
echo "   ✅ APIs aktif"

# ── Step 4: Setup Artifact Registry ──────────────────────────────────────────
echo ""
echo "📦 Step 4: Setup Artifact Registry..."
$GCLOUD artifacts repositories create "$SERVICE_NAME" \
  --repository-format=docker \
  --location="$GCP_REGION" \
  --description="TicketOps Docker Images" \
  --quiet 2>/dev/null || echo "   Repository sudah ada, lanjutkan..."

$GCLOUD auth configure-docker "${GCP_REGION}-docker.pkg.dev" --quiet
echo "   ✅ Docker registry siap"

# ── Step 5: Build & Push image ke GCP ────────────────────────────────────────
IMAGE_URI="${GCP_REGION}-docker.pkg.dev/${GCP_PROJECT_ID}/${SERVICE_NAME}/${IMAGE_NAME}:latest"
echo ""
echo "🏗️  Step 5: Build & Push Docker image ke GCP..."
echo "   Image: $IMAGE_URI"

docker build --no-cache \
  --build-arg VITE_SUPABASE_URL="$VITE_SUPABASE_URL" \
  --build-arg VITE_SUPABASE_ANON_KEY="$VITE_SUPABASE_ANON_KEY" \
  -t "$IMAGE_URI" .

docker push "$IMAGE_URI"
echo "   ✅ Image berhasil di-push ke GCP"

# ── Step 6: Deploy ke Cloud Run ───────────────────────────────────────────────
echo ""
echo "🚀 Step 6: Deploy ke Cloud Run..."
$GCLOUD run deploy "$SERVICE_NAME" \
  --image="$IMAGE_URI" \
  --platform=managed \
  --region="$GCP_REGION" \
  --port=8080 \
  --memory=512Mi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=5 \
  --allow-unauthenticated \
  --set-env-vars="NODE_ENV=production,VITE_SUPABASE_URL=$VITE_SUPABASE_URL,VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY" \
  --quiet

# ── Hasil Deployment ──────────────────────────────────────────────────────────
echo ""
echo "✅ =============================================="
echo "   DEPLOYMENT BERHASIL!"
echo "================================================"
SERVICE_URL=$($GCLOUD run services describe "$SERVICE_NAME" \
  --platform=managed \
  --region="$GCP_REGION" \
  --format="value(status.url)" 2>/dev/null || echo "Cek di: https://console.cloud.google.com/run")

echo "   🌐 URL Aplikasi: $SERVICE_URL"
echo "   📊 Project: $GCP_PROJECT_ID"
echo "   📍 Region: $GCP_REGION (Jakarta)"
echo "   💰 Biaya: GRATIS (dalam Free Tier)"
echo ""
echo "   Buka: $SERVICE_URL"
