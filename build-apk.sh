#!/usr/bin/env bash
set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

echo "========================================================"
echo "📱 Membangun Aplikasi Android APK (TicketOps)"
echo "========================================================"

# 1. Pastikan environment Java dan Android SDK terkonfigurasi
export JAVA_HOME="${JAVA_HOME:-/home/ismail/jdk-21}"
export PATH="$JAVA_HOME/bin:$PATH"
export ANDROID_HOME="${ANDROID_HOME:-/home/ismail/Android/Sdk}"
export ANDROID_SDK_ROOT="$ANDROID_HOME"

echo "☕ Menggunakan Java: $($JAVA_HOME/bin/java -version 2>&1 | head -n 1)"
echo "🤖 Menggunakan Android SDK: $ANDROID_HOME"

# 2. Build Web Production
echo ""
echo "📦 1/3 Membangun aset web produksi (Vite)..."
npm run build

# 3. Sinkronisasi aset ke proyek native Android (Capacitor)
echo ""
echo "🔄 2/3 Menyinkronkan aset web ke platform Android..."
npx cap sync android

# 4. Kompilasi APK dengan Gradle
echo ""
echo "⚙️  3/3 Mengompilasi file APK dengan Gradle..."
cd "$PROJECT_DIR/android"
./gradlew assembleDebug

# 5. Salin hasil APK
cd "$PROJECT_DIR"
cp android/app/build/outputs/apk/debug/app-debug.apk "$PROJECT_DIR/TicketOps-v1.0.apk"
mkdir -p "$PROJECT_DIR/public"
cp android/app/build/outputs/apk/debug/app-debug.apk "$PROJECT_DIR/public/TicketOps-v1.0.apk"

echo ""
echo "========================================================"
echo "✅ SUKSES! File APK Android berhasil dibuat:"
echo "📁 Lokasi file: $PROJECT_DIR/TicketOps-v1.0.apk"
ls -lh "$PROJECT_DIR/TicketOps-v1.0.apk"
echo "========================================================"
echo "💡 Anda dapat langsung mentransfer file TicketOps-v1.0.apk"
echo "   ke HP Android Anda untuk diinstal."
echo "========================================================"
