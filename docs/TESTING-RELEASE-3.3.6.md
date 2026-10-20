# Unified search — testing release 3.3.6

## Scope and immutable baseline

This task is testing-only. Never withdraw, replace, edit or resubmit the existing production candidates. Do not touch automated-newsletter, pitchforge or pitch-therapy. Leave untracked data-refresh-2025-12/ untouched.

- Required feature commit: 13578c843e998ec8f2cc388c830c9d9dfba3342e.
- New candidate: Android 3.3.6 / 503006; iOS marketing 3.3.6 (actual build to be read back).
- Destinations: existing Play alpha (closed), internal, beta (open); Apple TestFlight existing groups only.
- Fresh baseline on 2026-10-20: Apple Distribution 3.3.5 (54) Waiting for Review, automatic release inherited from its existing submission. Apple TestFlight 3.3.5 (54) Testing. Google production 503005 (3.3.5) Available on Google Play, released Oct 20 at 8:49 AM; this independent approval supersedes the earlier in-review handoff. Managed publishing off; no unpublished changes at baseline. No production controls used.
- Latest existing Codemagic build: #53 / 6ad668657550aed810903f93, source 5491bdf66d0963c8d264fa27e69267f3782c6473. Read access confirmed for build status/logs and IPA/AAB artifacts; no APK in that build. No newer build in the app's recent build list. No scheduled builds. YAML has no automatic triggers.
- Existing production submission: Apple 06b6393b-3813-4007-86ae-605ceff956cd (do not modify).

## Local gate

npm ci passed after removing Finder .DS_Store files from ignored node_modules (initial npm cleanup failed ENOTEMPTY). npm run check, typecheck, all 37 unit cases, production build and browser regressions passed. Browser result: 26 passed, 1 intentionally skipped tablet phone-drag case. Live external API verification is separate from fixture-based browser tests. Existing build warnings remain (Browserslist age, crypto browser externalization, static/dynamic import overlap).

YAML parsed and assertions passed: manual-only, submit_to_testflight true, submit_to_app_store false, explicit alpha/internal/beta only, signed APK and AAB build. The release workflow stops on upload failure (no silent duplicate recovery). The AAB uploads once to alpha, then the same versionCode is promoted. No shared public-listing metadata lane is invoked.

Both native payloads receive release-manifest.json with source SHA, required feature SHA, native counters, Codemagic build identity and testing destinations. Build logs print the same manifest before Capacitor sync.

## Tester-facing copy

Play en-CA and en-US, 241 characters each:

One search bar now finds representatives by Canadian postal code, name, city, area or riding. Fixed name searches such as Carney and normalized postal-code entry. Previously saved searches and representative details remain available offline.

TestFlight What to Test (to save and read back on the exact new build):

One search bar now finds representatives by Canadian postal code, name, city, area or riding. Fixed name searches such as Carney and normalized postal-code entry. Previously saved searches and representative details remain available offline.

Please test Carney and Mark Carney; Toronto; Nepean and Ottawa Centre; postal entries K1A 0A9, K1A0A9 and k1a0a9; opening and closing full representative details; Saved and History replay; and reopening previously cached searches and details offline. Report the query, device and iOS version with any issue. Initial searches require connectivity.

Do not copy obsolete claims that postal codes never leave the device. Preserve existing valid reviewer/contact/access/compliance information. No invented credentials or export/privacy answers.

## Delivery evidence — verified 2026-10-20

- Source: d1dd78cdfc4e7294b6bbc8ec364b251bd86963f3, containing required feature 13578c843e998ec8f2cc388c830c9d9dfba3342e.
- Codemagic check completed successfully: https://codemagic.io/app/68dcb0f5de98085078c068f2/build/6ad78cf4454d2506f7ab7f79 . Workflow: Testing only: iOS TestFlight + Play internal/closed/open.
- Downloaded APK release-manifest.json identifies that CI build and source, Android 503006, iOS 55, marketing 3.3.6, alpha/internal/beta/TestFlight destinations, productionSubmission false.
- Play internal testing: Active, latest release 3.3.6 (direct console read-back).
- Play closed Alpha: Active, latest release 3.3.6, available to selected testers, released Oct 20 at 12:33 PM, two countries/regions (direct console read-back).
- Play open testing: Active, 3.3.6 available to unlimited testers, released Oct 20 at 12:33 PM, 100%, two of two countries/regions. Console also reported available to zero users; enrollment/install success is not claimed.
- Play production remained 503005 (3.3.5), Active. No production candidate was replaced by this testing release.
- Play localized release-note persistence and per-track versionCode read-backs remain unverified; intended copy above is not evidence of saved store metadata.
- Apple TestFlight: 3.3.6 (55), uploaded Oct 20 at 11:56 AM, Waiting for Review for external Beta App Review. Build showed two associated groups; exact identities/internal install availability remain unverified. Public Testing selector also showed build 55 Waiting for Review. Do not claim external/public tester availability yet.
- TestFlight What to Test was saved with both paragraphs above and independently persisted after refresh (3,411 characters remaining).
- Separate Apple production 3.3.5 (54) submission was not modified; last verified Waiting for Review. No newer production approval is claimed.
- Remaining Apple app-level testing/review metadata has not been fully audited. Foreground Safari scrolling was blocked by the tool approval gate; it was not retried or bypassed.

## Native validation and production blockers

Installed the downloaded app-release.apk using adb install -r: Success. Android package read-back confirmed versionName 3.3.6 and versionCode 503006. MainActivity cold launch succeeded. On emulator-5554, unified Carney search returned Mark Carney; View Full Profile opened the native WebView profile sheet with Nepean and contact/source controls. Lowercase k1a0a9 normalized to K1A0A9 and returned four representatives. Screenshots are retained locally under ~/.hermes/cache/scratch/repfinder-native-*.png.

The first search showed Search unavailable because the emulator had no active network. After reconnecting its saved AndroidWifi network, the same candidate returned live results. This was not established as an app regression. Native saved/history/offline replay, mail handoff, and the complete browser regression matrix have not been repeated on Android. This machine has no full Xcode; iOS native runtime validation remains unavailable.

PRODUCTION BLOCKER: the installed candidate's privacy onboarding still claims postal code/location is never transmitted off-device. That statement conflicts with the network lookup design and must be corrected before promoting 3.3.6 to production. This testing-delivery handoff does not silently change the uploaded binaries or withdraw Apple's pending review.
