# 3.3.5 — representative profile fix

## Tester-facing update

Fixed an intermittent issue where tapping **View Full Profile** could open an
invisible details sheet and prevent further taps. The profile sheet now starts
with the correct phone/tablet layout and keeps explicit visibility targets when
switching layouts.

Regression coverage includes closing and reopening, phone drag-to-dismiss,
responsive breakpoint changes, and reduced-motion settings.

## Completed changes

- Initialize mobile viewport state from the current viewport on the first
  render, rather than starting with the desktop state and correcting it later.
- Set opacity and scale explicitly in both responsive animation branches so
  interrupted or changing entrance animations cannot leave the sheet invisible.
- Add six initial-render hook tests and browser regression tests covering the
  representative sheet and related Profile interactions.

Source fix: `136aefa`. Store-build source:
`5491bdf66d0963c8d264fa27e69267f3782c6473`.

## Testing distribution verified in consoles

- Android: **3.3.5 / 503005** is available to selected testers on closed testing
  (Alpha) and unlimited testers on open testing. Both expanded summaries show
  versionCode 503005. Open testing is at 100% rollout in the existing two
  countries/regions. No countries or tester lists were changed.
- iOS: **3.3.5 (54)** is assigned to private internal groups
  **RepFinderCanadaiOS** and **Testers**.
- Added iOS **3.3.5 (54)** to the existing external **Public Testing** group and
  read it back in that group's Builds table. Its status is **Waiting for
  Review**; public testers cannot be promised access until Apple approves the
  beta. Existing public build 3.3.1 (47) remains assigned.
- Existing public TestFlight enrollment link:
  https://testflight.apple.com/join/UcX3VcxK
- iOS uses TestFlight groups rather than Android-style closed/open tracks.
  No new invite-only external group was created.
- Production stays at **3.3.4** on both platforms. No production release was
  submitted or promoted.

## What to test on installed builds

1. Open View Full Profile from search results and Saved representatives.
2. Confirm the details are immediately visible and controls respond to taps.
3. Close/reopen with X, backdrop, and phone swipe-to-dismiss.
4. Rotate a phone or resize on iPad and repeat.
5. Repeat with Reduce Motion enabled.
6. Report failures with device model, OS version, app version, and entry point.

Local validation passed: typecheck, check, production build, six unit cases,
and eight browser cases; tablet drag was intentionally skipped. These are
browser regression results, not installed-native runtime verification.

The Android localized changelog files already contain the profile fix summary;
live Play release-note text has not been independently read back. iOS What to
Test notes were successfully saved for build 54 and verified verbatim after
fresh page navigation. They include the invisible-sheet / blocked-taps fix and
the search, Saved, reopen, swipe-dismiss, iPad, and Reduce Motion checklist.
