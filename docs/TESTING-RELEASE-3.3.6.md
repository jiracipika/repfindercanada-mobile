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

## Delivery evidence (in progress)

No new CI build has been triggered yet. No 3.3.6 upload, tester availability or live metadata persistence is claimed at this preparation checkpoint. Replace this section with exact source SHA, CI URL/build ID, artifact identifiers, track/version/status/notes readbacks, TestFlight group/status and saved notes evidence.

Native validation: Android SDK/ADB/emulator are available; emulator-5554 is connected. Install the exact CI APK after download, verify version/source manifest and exercise search/details. This machine has no full Xcode, so iOS native execution remains unavailable locally.
