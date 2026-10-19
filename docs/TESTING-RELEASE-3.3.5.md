# 3.3.5 — testing-only profile-sheet fix

## Scope

- Source fix: 136aefa (invisible representative details / blocked taps).
- Android candidate: versionName 3.3.5, versionCode 503005.
- iOS candidate: marketing version 3.3.5; the existing Codemagic workflow
  assigns BUILD_NUMBER + 1. Read the actual resulting build number from CI/ASC.
- Play targets ONLY: internal, alpha (closed testing), beta (open testing).
- Apple target ONLY: TestFlight. submit_to_app_store remains false.
- Do not change production tracks, submit the existing 3.3.4 production draft,
  attach this candidate to an App Store release, or publish unrelated pending
  listing changes.

## Local preparation

Version and release notes are prepared. Codemagic release workflows remain
manual (no push triggers). Dependency installation uses npm ci.

Local verification passed: npm ci, typecheck, check, six hook unit cases,
production build, and eight browser cases (tablet drag intentionally skipped).
The YAML safety gate confirmed manual-only workflows, Play testing-track
publishing, and submit_to_app_store: false. The first browser rerun exposed an
ambiguous toast selector (visual copy plus live-region announcement); it was
made exact and the complete browser suite passed again.

## Access / external state

NOT uploaded or remotely staged by this work. Computer-use session setup
failed; fallback browser is logged out of Codemagic; no saved vault login or
Codemagic API token was available. Previous releases are documented in
PUBLIC-RELEASE-PREP-3.3.4.md but must be checked against live consoles.

## Before triggering

1. Restore desktop control / sign in securely to Codemagic, Play Console, and
   App Store Connect. Never put passwords or verification codes in chat.
2. Check recent Codemagic builds for the source SHA and artifacts: don't mistake
   an earlier 3.3.4 upload for the profile fix.
3. Confirm Play has not already used versionCode 503005; increase if it has.
4. Confirm the selected source includes 136aefa and this testing preparation.
5. Run npm run typecheck, npm run check, npm run test:unit, npm run test:e2e.
6. Manually trigger release-both after inspecting its publishing destinations.

## After the build

- Record the Codemagic build URL, source SHA, AAB/IPA artifacts, and exact
  Android/iOS build numbers. A successful job alone is not store verification.
- Read Play internal, closed, and open testing separately. Verify 503005 (or
  the reconciled replacement) on each; handle testing review requirements only.
  Do not use Publishing overview's global submit/publish action if unrelated
  production/listing changes are bundled with it.
- Read ASC TestFlight, wait for processing, resolve any test compliance prompts,
  and configure the appropriate existing testing group. External testing may
  require beta review; do not submit to App Store review.
- Download the exact CI APK if available and install/run it on an Android
  emulator/device. release-both currently builds AAB + IPA, not an APK; use
  an APK-producing workflow or bundletool/device route for runtime evidence.
- Test View Full Profile, close/reopen, drag dismiss, rotation, and Saved entry.
- Recheck production state remains unchanged.
