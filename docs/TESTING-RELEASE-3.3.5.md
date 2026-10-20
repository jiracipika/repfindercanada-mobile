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

Codemagic build completed successfully:
https://codemagic.io/app/68dcb0f5de98085078c068f2/build/6ad668657550aed810903f93

- Source SHA verified through the GitHub check:
  5491bdf66d0963c8d264fa27e69267f3782c6473.
- Manual release-both build, using main, not the earlier 47569fd commit.
- Play internal testing read-back: 3.3.5 available to internal testers.
- Play closed testing / Alpha read-back: 3.3.5 in review.
- Play open testing read-back: 3.3.5 in review; expanded summary confirms 503005.
- Codemagic publishing log confirms alpha upload and internal promotion of
  503005; the actual store-console read-back is authoritative for review state.
- Production read-back before and after this build: 3.3.4 at 100% rollout.
  It was already published before this work, despite older prep docs describing
  a draft. No production controls or global Publishing overview actions used.
- ASC read-back after secure sign-in confirms 3.3.5 (54), processed and
  Waiting for Review in TestFlight. No additional version bump is needed.
- Build 54 is assigned to internal groups RepFinderCanadaiOS (one tester)
  and Testers. Installation/tester receipt remains unverified.
- The build detail exposes Remove from Review; leave the pending beta review
  intact. App Store Distribution remains 3.3.4 Ready for Distribution.
- Attempted to add profile-regression What to Test notes, but AXValue did not
  confirm an update and foreground input approval timed out. Notes were NOT
  verified saved; do not claim they were. No review was cancelled.
- A subsequent desktop scroll action timed out awaiting approval. Do not retry
  that blocked action or route around it; wait for renewed user interaction.

Desktop transport was repaired by stopping the incompatible system daemon and
launching Hermes' PM-pinned CuaDriver.app through LaunchServices. Existing
Accessibility and Screen Recording grants remained valid.

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
