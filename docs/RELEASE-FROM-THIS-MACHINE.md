# Pushing store updates from this machine (Mac Pro)

Set up 2026-10-07. One-time secrets you must paste are marked **[USER]** — everything else is wired.

## What's already in place

| Piece | Location |
|---|---|
| Android upload keystore | `~/.android-keys/crfkey.jks` (copied from iCloud "Key Store path"; original stays in iCloud) |
| App Store Connect API key | `~/.appstoreconnect/private_keys/AuthKey_5647QV7H92.p8` (key id `5647QV7H92`) |
| fastlane config | `fastlane/Fastfile` (lanes: `android deploy`, `ios metadata`), `fastlane/Appfile` |
| Local signed build script | `scripts/release-android.sh` |
| Store metadata (text) | `fastlane/metadata/android/en-CA`, `fastlane/metadata/en-US` |
| Remote CI fallback | `codemagic.yaml` (iOS builds — this machine has NO Xcode) |

## The 3 secrets only you can supply

1. **[USER] Keystore passwords** — Codemagic → your app → Environment variables (signing/`akey` group):
   `CM_KEYSTORE_PASSWORD`, `CM_KEY_ALIAS`, `CM_KEY_PASSWORD`
   → put them in `android/keystore.properties` (copy from `android/keystore.properties.example`).
2. **[USER] Google Play service account JSON** — Codemagic env group `google_play` → `GCLOUD_SERVICE_ACCOUNT_CREDENTIALS` (copy the JSON value into a file, e.g. `~/.android-keys/play-sa.json`), or download fresh from Play Console → Setup → API access.
   → set its path as `PLAY_SERVICE_ACCOUNT_JSON` in `fastlane/.env` (copy from `fastlane/.env.example`).
3. **[USER] App Store Connect Issuer ID** — App Store Connect → Users and Access → Integrations → App Store Connect API.
   → set `ASC_ISSUER_ID` in `fastlane/.env`.

## Toolchain on this machine (proven)

- **Source `/Volumes/ADATA/Android/env.sh` before any Android work** — it wires ANDROID_HOME (SDK on ADATA),
  JDK 21 from `/Volumes/HARD/dev-cache/jdks` (system JDK 25 breaks Gradle/AGP), and the pre-warmed 10GB
  Gradle cache. `scripts/release-android.sh` sources it automatically.
- **fastlane is NOT installed yet** — brew is blocked by a `/usr/local/share/man/man8` permissions issue
  (needs sudo) and the system Ruby (2.6) is too old for the gem. When at the keyboard:
  `sudo chown -R $(whoami) /usr/local/share/man/man8 && brew install fastlane`
  Until then the flow still works: `scripts/release-android.sh` produces the signed AAB, then either
  drag-drop it in Play Console (choose the internal track) or run the `fastlane android deploy` lane after install.

## Android release flow (fully local)

```bash
# 1. bump versionName + versionCode in android/app/build.gradle (Play rejects duplicate versionCodes)
#    current: versionCode 502003 / versionName 3.2.0  → Phase 4 unifies at 3.3.0 / 503000
scripts/release-android.sh                      # web build → cap sync → signed AAB (JDK 17 pinned)
AAB_PATH=android/app/build/outputs/bundle/release/app-release.aab fastlane android deploy
#    …or upload the AAB manually at play.google.com/console (track: internal)
```

## iOS from here (no Xcode installed)

- **Builds**: stay on Codemagic (`release-both` workflow, manual trigger) — it signs with the uploaded
  cert/profile and submits to TestFlight automatically.
- **Metadata**: `fastlane ios metadata` pushes name/subtitle/description straight to App Store Connect.
- **Optional**: install Xcode (~12 GB) for fully-local iOS builds — decide later; Android is unaffected.

## Hard rules

- `applicationId` stays `com.marcelsabas.canadarepfinder` — Play Store identity, NEVER change.
- Keystore, `.jks`, `keystore.properties`, `fastlane/.env`, service-account JSONs are gitignored — never commit them.
- Verify gate before any release commit: `npm run typecheck && npm run build`.
