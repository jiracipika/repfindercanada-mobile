# Public release prep — 3.3.4 (versionCode 503004 / iOS build 50)

> Staged 2026-10-14. Play side is DONE (see below). iOS App Store page needs
> the user to sign into App Store Connect (session expired, 2FA) — everything
> below is ready to paste.

## Google Play — DONE

- **Main store listing** (en-CA): 6 new phone screenshots (1080×1914) uploaded
  (`play/` in this folder), app icon restored (512×512 from `resources/icon.png`),
  feature graphic replaced (1024×500, icon on brand navy — placeholder quality,
  swap for real art whenever). 3 changes **submitted for review** via Publishing
  overview ("Changes in review"). These update the LIVE 3.2.0 listing once approved.
- **Production release 3.3.4 (503004) STAGED AS DRAFT** on the Production track:
  bundle 503004 from library + release name "3.3.4 (503004)" + en-CA release
  notes (below). NOT sent for review, NOT rolled out. When ready: Publishing
  overview → the production change joins the submission → or Production track →
  the draft → Preview and confirm → Start rollout.

### Production release notes (en-CA, 445 chars)

```
<en-CA>
Your complete civic toolkit, rebuilt.

• New design: find your MP, MPP and city councillors with a clean, native-style interface
• Swipe between Find, Saved, History and Profile like a native app
• Light & dark themes, rep profiles with map and contacts, offline results, back-button support
• Works with brand-new postal codes, even ones missing from official databases

Private by design: postal codes never leave your device.
</en-CA>
```

## App Store Connect — DONE (2026-10-14, user logged in)

All filled on the version page and **saved** (left at Prepare for Submission —
NOT submitted for review):

1. Version **3.3.4** ✓ (was 3.3.1)
2. **Build 53** attached (the picker showed ground truth: 3.3.4 = build 53,
   NOT 50 — 50 is 3.3.2's upload; earlier doc was wrong)
3. Screenshots: "App Previews and Screenshots" tab → iPhone with Dynamic Island
   (medium display) slot ← 6 × **1206×2622** (the `ios/` folder was re-exported
   at this size — the slot REJECTS 1320×2868; original 6.9" captures resized).
   In the new ASC layout the device slots live under the version page's
   "App Previews and Screenshots" TAB (not the Header/Search results tab).
4. What's New:
5. Promotional text updated (113 chars), Description fully rewritten (1,730
   chars — new branding, correct sole credit, new-features list), Copyright
   "2026 Gajadhar".
5. What's New:

```
Rebuilt from the ground up.

• Clean, native-style design for finding your MP, MPP and city councillors
• Swipe between Find, Saved, History and Profile
• Light & dark themes
• Representative profiles with map and contact actions
• Offline results and back-button support
• Supports brand-new postal codes

Private by design: postal codes never leave your device.
```

5. Promotional text can stay as-is from 3.3.1.
6. Leave at **Prepare for Submission** (or submit for App Store review when the
   user says go — that is the step that starts public release).
