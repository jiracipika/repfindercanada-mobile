# Release notes — 3.3.1 (503001 / iOS build 47)

Store-facing copy for the 3.3.1 release. The Play changelog also lives at
`fastlane/metadata/android/en-CA|en-US/changelogs/503001.txt`.

## Google Play — Internal testing "What's new" (≤500 chars)

```text
Smoother navigation — swipe between tabs.

• New swipe gestures: glide between Find, Saved, Activity and Profile like a native app

Everything from 3.3.0: clean redesign, light & dark themes, rep details with map and contacts, offline results, back-button support, faster searches.

Private by design: postal codes never leave your device.
```

Paste into: Play Console → Testing → Internal testing → Releases → 3.3.1 → Release notes (fill for en-CA and en-US) → Save release. Codemagic's bundle upload does not carry metadata, so this is a manual paste.

## TestFlight — "What to Test" for build 47

```text
Smoother navigation — swipe between tabs.

• Swipe left or right anywhere to glide between Find, Saved, Activity and Profile. Pages track your finger and settle with a spring, like a native iOS app.
• Tapping a tab still jumps straight to it. Short accidental drags snap back instead of switching pages.
• Also in this build: everything from the 3.3.0 redesign — fresh look, light & dark themes, tap any representative for contacts, map and more, offline results.

Focus: does swiping feel smooth? Watch for any spot where a horizontal swipe fights a list, card or map that should scroll.
```

Paste into: App Store Connect → TestFlight → build 47 → Test Details → What to Test (default locale en-CA). Required before testers receive the build.

## App Store — "What's New" (for the production 3.3.1 release)

```text
Smoother navigation — swipe between tabs.

• Swipe left or right to glide between Find, Saved, Activity and Profile, with pages that follow your finger and settle like a native app
• Fresh, clean redesign with light & dark themes
• Tap any representative for contacts, map and more
• Your last results stay available even without a connection
• Faster searches and many fixes

Private by design: your postal code never leaves your device.
```

Paste into: App Store Connect → App Store → version 3.3.1 → What's New, when promoting beyond TestFlight.
