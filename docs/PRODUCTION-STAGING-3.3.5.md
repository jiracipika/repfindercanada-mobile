# Production release handoff — 3.3.5

## Current status (2026-10-20)

The user authorized production submission and release on both stores. This supersedes the earlier draft-only boundary.

| Store | Verified status | Remaining action |
| --- | --- | --- |
| Google Play | Prior verified state: production 503005 (3.3.5), full rollout submitted; Publishing overview showed **Changes in review**. Managed publishing was **off**. Quick checks were still running at that read-back. Not freshly checked for this documentation update. | Wait for successful checks and Google approval. Confirm rollout and public availability afterward. Do not submit a duplicate release. |
| Apple | Parent personally verified the Safari App Store Connect iOS Submission page: **Waiting for Review**, item **iOS App 3.3.5**, build **3.3.5 (54)**, submitted **Oct 20 2026 at 8:54 AM**, submission ID `06b6393b-3813-4007-86ae-605ceff956cd`. **Automatically release this version** was confirmed selected before submission. | Wait for Apple review and approval; automatic release is pending approval. Monitor the existing submission and confirm distribution status and public availability afterward. Do not submit again. |

Neither store is confirmed live on 3.3.5. Both production review submissions are recorded; submission is not approval or public availability.

## Phone links

Open these in Safari/Chrome; request the desktop website if store controls are hidden.

- Google Publishing overview: https://play.google.com/console/u/0/developers/5960845981523237862/app/4974047278945021663/publishing
- Google production release originally used (reference only; do not recreate/resubmit): https://play.google.com/console/u/0/developers/5960845981523237862/app/4974047278945021663/tracks/4697425640660344863/releases/12/prepare
- Apple existing version / in-flight submission entry: https://appstoreconnect.apple.com/apps/6753271444/distribution/ios/version/inflight
- Apple app overview if the version link redirects: https://appstoreconnect.apple.com/apps/6753271444

## Apple: completed preparation and submission

The parent completed these steps before the verified production review submission:

- Saved **What's New in This Version** for **English (Canada)** with the patch notes below, matching `fastlane/metadata/en-US/release_notes.txt`.
- Attached the existing **3.3.5 (54)** build; no replacement build was needed.
- Confirmed **Automatically release this version** was selected.
- Completed final submission. Confirmation showed **1 Item Submitted**, followed by the exact **Waiting for Review** submission page recorded above.
- No compliance answers or credentials were changed.

These are completed steps, not a checklist to repeat. Do not create another version, attach a different build, withdraw the pending review, or submit a duplicate review request.

## Apple: follow up from a phone (monitor only)

1. Sign in to App Store Connect with the app owner's Apple Account and complete Apple's verification directly if needed. Never share passwords or codes in chat. The earlier sign-in blocker is historical, not a current submission blocker.
2. Open Rep Finder for Canada → Distribution → iOS App 3.3.5 and inspect the existing iOS Submission. Match submission ID `06b6393b-3813-4007-86ae-605ceff956cd`, version **3.3.5**, and build **54**. The verified state is **Waiting for Review**; monitor for **In Review** or a review outcome. Do not repeat **Add for Review** or **Submit for Review**.
3. If Apple requests information or rejects the submission, inspect the specific issue and respond through the existing review workflow. Preserve valid metadata and review contact/access details; do not invent compliance/privacy answers or reviewer credentials. TestFlight beta review is separate from this production App Store review.
4. After approval, automatic release is expected from the selected release setting. Confirm **Ready for Distribution** and public store availability before reporting production live. If **Pending Developer Release** unexpectedly appears, inspect the actual release setting and resolve that state before claiming availability; it is not evidence that a duplicate submission is needed.

If phone controls are hidden, use Request Desktop Website or inspect from a desktop. Follow-up is review monitoring and availability verification, not unfinished submission preparation.

## Saved What's New (English Canada)

Fixed an intermittent issue where tapping View Full Profile could open an invisible details sheet and block taps.

Profile details now open reliably on phones and tablets, including when the screen size changes. This update also improves closing and reopening the sheet.

The saved English Canada text matches the plain-text copy in `fastlane/metadata/en-US/release_notes.txt`.

## Google: verify rather than resubmit

The following instructions use the prior verified state; Google Play was not freshly checked for this documentation update.

1. Open Publishing overview and inspect the existing production change **503005 (3.3.5)**, **Start full rollout**.
2. At submission, **Managed publishing off** was shown. Successful approval should publish without a separate managed-publishing action. Read the actual current state before acting.
3. If quick checks or review fail, open the concrete issue and fix it; do not discard/recreate the release blindly.
4. Confirm the Production release shows rollout/availability and then check the public listing. The console may finish before public propagation.

## Evidence and scope

- Apple: parent personally verified the Safari App Store Connect iOS Submission page after **1 Item Submitted**: **Waiting for Review**, **iOS App 3.3.5**, **3.3.5 (54)**, submitted **Oct 20 2026 at 8:54 AM**, submission ID `06b6393b-3813-4007-86ae-605ceff956cd`.
- Apple evidence screenshot: `/Users/rs-mac/.hermes/cache/images/computer_use_ffa295633e54403ba184d13e751ca451.png` (local only; supplied parent evidence, not a fresh store inspection by this documentation update).
- Apple preparation: English Canada patch notes saved matching fastlane metadata, build 54 attached, automatic release selected. No compliance answers or credentials changed.
- Android prior verification: saved the existing candidate, reached step 2 **Ready to release**, saved to Publishing overview, then confirmed **Send changes for review**. The prior capture showed **Changes in review**, production **503005 (3.3.5)** and **Start full rollout**, with managed publishing off. Quick checks had up to 14 minutes remaining at that read-back. This is not a fresh check or proof of live availability.
- Android evidence screenshot: `/Users/rs-mac/.hermes/cache/images/computer_use_6140d56ae37149e1bc7775bdbdb4ba25.png` (local only; prior verification).
- Previous verified testing records identify iOS **3.3.5 (54)** and Android **3.3.5 / 503005**, source `5491bdf66d0963c8d264fa27e69267f3782c6473`. The later Apple submission verification above confirms build 54 is attached to the production review item.
- No new native build, version bump, signing change, new country, tester-list change, or production CI trigger was needed for submission. Do not rebuild an already uploaded candidate merely to repeat submission.
- This update changes release handoff documentation only. No browser/store actions or app-code changes were performed for this update; store states are attributed to the supplied parent verification and prior Android evidence.

## Historical blocker (superseded)

Before the successful Apple submission, an earlier session stopped at the **Email or Phone Number** / **Sign in with Passkey** page and could not inspect the authenticated draft. The credential vault returned no saved logins; a local API signing key existed without a configured issuer ID, and no authenticated API request was made. At that earlier point, draft attachment, metadata persistence and submission were unverified. Those limitations describe history only: the parent's later preparation and verified production submission supersede them.
