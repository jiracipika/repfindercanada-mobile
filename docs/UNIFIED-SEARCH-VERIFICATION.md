# Unified mobile search verification

## Scope and behavior

Only this mobile repository was changed. One labelled input accepts postal codes, representative names, cities, areas and ridings. Valid Canadian postal codes normalize to uppercase with a space and retain the local postal/geocoding lookup. Clearly postal-looking incomplete/invalid input gets inline validation, not a broad text request. Other text is trimmed with repeated whitespace collapsed; matching is case-insensitive. Numbered wards remain text.

Text search combines name and district substring filters with locally matched representative-set names and their scoped member endpoints. This includes city council ward members whose district names do not contain their city's name. Pagination is followed, origins validated and records deduplicated. Requests are sequential so an HTTP 429 stops further text requests. Failures remain errors, not false empty results.

Postal storage keys remain unchanged. Text searches have an isolated, case/whitespace-normalized cache namespace. Both retain offline saved-result notices. Editing clears stale result context. Legacy `/name-search?q=...` links submit through the same shared search state. Existing representative cards, profiles, save and email handlers are reused.

## Diagnosed root causes (live evidence, not fixtures)

- The old name-search UI relied on the hosted backend. Its search endpoint returned HTTP 503 during diagnosis.
- Represent's `name=Carney` is exact matching and returned zero representatives. `name__icontains=carney` returned Mark Carney.
- Generic `search=` and `representative_set_name__icontains=` are unsupported representative filters and were silently ignored, returning unrelated nationwide results. City coverage instead requires district matching plus representative-set catalogue matching/scoped membership.
- A representative's `url` is often an official HTML website, not an API detail endpoint. Transformation no longer fetches those external sites as JSON details.

Raw diagnostic request/response JSON is local under `design-evidence/unified-search/`, including `backend-carney.json`, `represent-carney-name.json`, `carney-icontains.json`, `represent-carney-search.json`, `represent-ottawa.json`, `ottawa-district.json`, and `ottawa-set.json`.

## Executed checks

- `npm run typecheck`: passed, no TypeScript errors.
- `npm run test:unit`: 37 passed, zero failed/skipped. Includes postal spacing/case, invalid/partial codes, Carney filter semantics and transformation, cities/council membership, areas/ridings, blank/no-results, pagination, foreign-origin rejection, and synthetic 429 stopping subsequent requests.
- `npm run test:e2e`: production build passed; 26 Playwright tests passed, one intentionally skipped tablet-only phone-drag test, zero failures. Projects: touch phone, tablet and reduced-motion phone. New tests exercise one accessible input, Carney to details/save, intercepted mailto handoff (no message sent), legacy links, city/area/ward search, postal local geocoding, offline postal/text recovery after reload, errors vs no-results, and 320/390/768/1440px layouts. Existing profile/drag/modal tests also pass.
- `git diff --check`: passed.
- `node scripts/verify-unified-search-live.mjs`: passed against the production build in a 390x844 touch Chromium viewport, using real HTTPS Represent responses, no API fixtures. Mixed-case/trimmed Carney returned Mark Carney; mixed-case Ottawa returned 33 representatives; lowercase unspaced K1A0A9 returned four. Live Carney details opened. Eight Represent responses were HTTP 200; no page errors or HTTP 429 occurred. These are upstream results at capture time, not a guarantee that every upstream officeholder/contact record is current.
- Visually inspected the narrow 320px layout and actual dark-theme live Carney results/details screenshots. Existing mobile theme and components are preserved; no redesign was introduced.

## Evidence and reproduction

Evidence is intentionally ignored, not committed:

- `design-evidence/unified-search/live-browser.json`: capture timestamp, query results, full actual API responses and page errors.
- `design-evidence/unified-search/live-carney.png` and `live-carney-details.png`: actual dark-theme phone-browser screenshots.
- `design-evidence/unified-search/live-ottawa.png` and `live-k1a0a9.png`: actual city/postal results.
- `design-evidence/unified-search/fixture-<project>-<width>.png`: explicitly synthetic regression screenshots.

Run `npm run typecheck && npm run test:unit && npm run test:e2e`; opt into live network verification separately with `node scripts/verify-unified-search-live.mjs`. The live verifier records evidence even on failure and stops if it sees 429.

## Limitations and release safety

These are mobile-browser tests, not an installed native-app test. Full Xcode is unavailable (`xcodebuild` reports the active developer directory is CommandLineTools); neither adb nor an Android emulator is on PATH, and the inspected Android SDK directory contains no SDK files. No native build/install, real soft keyboard, OS mail client, native location permission dialog, or device safe-area behavior was verified. Email handoff was intercepted in fixtures; no email was sent. No location-permission or GPS behavior was changed.

Production build warnings remain for stale Browserslist data, pre-existing browser crypto externalization and mixed static/dynamic imports; build exits successfully.

No store API or release workflow was invoked. No versions, signing configuration, native projects, pending release 3.3.5 (54)/503005 or Codemagic configuration were changed. The commit uses `[skip ci]` to avoid triggering release automation from the requested source push. Untracked `data-refresh-2025-12/` was left untouched. No excluded project or web repository was changed.
