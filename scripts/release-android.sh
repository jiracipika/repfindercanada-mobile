#!/usr/bin/env bash
# Local signed Android release build — mirrors codemagic.yaml's android-play-store workflow.
# Produces a Play-ready signed AAB; upload with: AAB_PATH=<path> fastlane android deploy
set -euo pipefail
cd "$(dirname "$0")/.."

PROPS="android/keystore.properties"
if [ ! -f "$PROPS" ]; then
  echo "Missing $PROPS — copy android/keystore.properties.example to android/keystore.properties and fill it in."
  exit 1
fi

get_prop() { grep "^$1=" "$PROPS" | head -1 | cut -d= -f2-; }
STORE_FILE=$(get_prop storeFile)
STORE_PASSWORD=$(get_prop storePassword)
KEY_ALIAS=$(get_prop keyAlias)
KEY_PASSWORD=$(get_prop keyPassword)

for var in "$STORE_FILE" "$STORE_PASSWORD" "$KEY_ALIAS" "$KEY_PASSWORD"; do
  if [ -z "$var" ]; then echo "keystore.properties has an empty value — fill every field."; exit 1; fi
done
[ -f "$STORE_FILE" ] || { echo "storeFile not found: $STORE_FILE"; exit 1; }

# Gradle 8.x needs JDK 17 (system default is 25)
export JAVA_HOME="${JAVA_HOME:-$(/usr/libexec/java_home -v 17)}"
echo "Using JAVA_HOME=$JAVA_HOME"

echo "==> build web + cap sync"
npm run build
npx cap sync android

echo "==> bundleRelease (signed)"
cd android
./gradlew bundleRelease \
  -Pandroid.injected.signing.store.file="$STORE_FILE" \
  -Pandroid.injected.signing.store.password="$STORE_PASSWORD" \
  -Pandroid.injected.signing.key.alias="$KEY_ALIAS" \
  -Pandroid.injected.signing.key.password="$KEY_PASSWORD"

AAB="$(pwd)/app/build/outputs/bundle/release/app-release.aab"
echo ""
echo "AAB: $AAB"
echo "Upload to Play:  AAB_PATH=\"$AAB\" fastlane android deploy"
echo "REMINDER: bump versionCode in android/app/build.gradle before uploading — Play rejects duplicate versionCodes."
