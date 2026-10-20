# Production release handoff — 3.3.5

## Current status (2026-10-20)

The user authorized production submission and release on both stores. This supersedes the earlier draft-only boundary.

| Store | Verified status | Remaining action |
| --- | --- | --- |
| Google Play | Production 503005 (3.3.5), full rollout submitted; Publishing overview shows **Changes in review**. Managed publishing is **off**. Quick checks were still running. | Wait for successful checks and Google approval. Confirm rollout and public availability afterward. Do not submit a duplicate release. |
| Apple | Browser is at Apple sign-in; no authenticated release inspection or submission was possible this session. | Sign in, finish the existing 3.3.5 draft using build 54, validate, and submit for App Review. See the phone checklist below. |

Neither store is confirmed live on 3.3.5. Android submission is not approval. Apple submission has NOT happened.

## Phone links

Open these in Safari/Chrome; request the desktop website if store controls are hidden.

- Google Publishing overview: https://play.google.com/console/u/0/developers/5960845981523237862/app/4974047278945021663/publishing
- Google production release originally used: https://play.google.com/console/u/0/developers/5960845981523237862/app/4974047278945021663/tracks/4697425640660344863/releases/12/prepare
- Apple existing version draft: https://appstoreconnect.apple.com/apps/6753271444/distribution/ios/version/inflight
- Apple app overview if the draft link redirects: https://appstoreconnect.apple.com/apps/6753271444

## Apple: finish from a phone

1. Sign in to App Store Connect with the app owner's Apple Account and complete Apple's verification directly. Never share passwords or codes in chat.
2. Open Rep Finder for Canada → Distribution → iOS App 3.3.5. An earlier session created this draft and observed **Prepare for Submission**; its current contents must be rechecked after sign-in. Do not create another version or withdraw a pending review.
3. In **Build**, select the already uploaded **3.3.5 (54)** and save. If 54 is already attached, leave it. Do not use build 47 or a 3.3.4 build. If 54 is missing/ineligible, inspect its processing/compliance status in TestFlight before deciding to rebuild. Its external beta review is separate from App Store review.
4. Paste the patch notes below into **What's New in This Version** for the matching English locale. Preserve existing descriptions, screenshots and translations unless a validator requires a specific correction.
5. Check inherited support/privacy URLs, copyright, screenshots (including required iPad sizes), age rating and App Privacy. Do not invent compliance/privacy answers. Answer export-compliance questions according to the actual app's encryption use; a stored exemption answer is not evidence by itself.
6. Check **App Review Information**. Keep valid existing contact details and any real review access instructions. Do not invent reviewer credentials. If sign-in is not required, do not falsely mark it as required.
7. Under **Version Release**, choose **Automatically release this version** for the requested production promotion, without a future date. Save and reopen the version to confirm this choice persisted. If you instead deliberately choose manual release, an additional **Release This Version** action will be needed after approval.
8. Tap **Add for Review**. Resolve every reported validation error, then open the review submission and tap **Submit for Review**. Adding an item to a review submission is NOT the final submission.
9. Reopen the exact version and confirm **Waiting for Review** or **In Review**, version **3.3.5**, build **54**. If it still says **Prepare for Submission** or **Ready for Review**, submission is not complete.
10. After approval, confirm **Ready for Distribution** and public store availability. If **Pending Developer Release** appears, tap **Release This Version**. Do not report production live before this read-back.

If the phone interface cannot show a required control, use Request Desktop Website; if still unavailable, finish that control from a desktop. Authentication and Apple validation remain real blockers, not completed scaffolding.

## Copy/paste: What's New (English)

Fixed an intermittent issue where tapping View Full Profile could open an invisible details sheet and block taps.

Profile details now open reliably on phones and tablets, including when the screen size changes. This update also improves closing and reopening the sheet.

A plain-text copy is in `fastlane/metadata/en-US/release_notes.txt`.

## Google: verify rather than resubmit

1. Open Publishing overview and inspect the existing production change **503005 (3.3.5)**, **Start full rollout**.
2. At submission, **Managed publishing off** was shown. Successful approval should publish without a separate managed-publishing action. Read the actual current state before acting.
3. If quick checks or review fail, open the concrete issue and fix it; do not discard/recreate the release blindly.
4. Confirm the Production release shows rollout/availability and then check the public listing. The console may finish before public propagation.

## Evidence and scope

- Android: saved the existing candidate, reached step 2 **Ready to release**, saved to Publishing overview, then confirmed **Send changes for review**. A fresh capture showed **Changes in review**, production **503005 (3.3.5)** and **Start full rollout**. Quick checks had up to 14 minutes remaining at that read-back.
- Android evidence screenshot: `/Users/rs-mac/.hermes/cache/images/computer_use_6140d56ae37149e1bc7775bdbdb4ba25.png` (local only).
- Apple: fresh capture showed the **Email or Phone Number** / **Sign in with Passkey** page. The credential vault returned no saved logins. A local API signing key exists, but no issuer ID is configured in the environment or `fastlane/.env`; no authenticated API request was made.
- Previous verified testing records identify iOS **3.3.5 (54)** and Android **3.3.5 / 503005**, source `5491bdf66d0963c8d264fa27e69267f3782c6473`. Build 54's current attachment and App Store eligibility remain unverified.
- No new native build, version bump, signing change, new country, tester-list change, or production CI trigger was needed or performed. Do not rebuild an already uploaded candidate just to submit it.
- This handoff and the Apple release-notes file are repository preparation, not proof that Apple metadata has been saved remotely.
