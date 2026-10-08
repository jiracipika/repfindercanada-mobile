# NEXT SLICE — RepFinder Canada UI overhaul (handoff, 2026-10-07)

Repo: `jiracipika/repfindercanada-mobile` (private). Old full-stack repo kept as remote `original` (`jiracipika/repfinderforcanadadev`) — do not delete.
Local: `/Users/rs/Documents/projects in progress/repfindercanada-mobile` (MacBook Air). Path has spaces — quote it.

## State

- `main` == `origin/main`, HEAD = `58d9495` "chore: hygiene pass — remove dead design layer, unify brand to RepFinder Canada, fix meta/version/log hygiene" (+97/−616 across 40 files).
- Phase 1 (hygiene) is DONE and verified: dead design layer deleted (layouts/, header.tsx, boundary-info, tabs-nav, not-found, About.test, legacy storage.ts), 115 console.log removed, brand unified to **"RepFinder Canada"**, index.html fixed (title/description/viewport/theme-color, Replit banner removed, zoom allowed), `client/src/version.ts` = single APP_VERSION source, deps `next-themes` + `react-icons` removed.
- Baseline is green: `npm run typecheck` exit 0, `npm run build` ~3.3s, JS ≈ 430KB raw / ~128KB gzip across 3 chunks (135 + 145 + 150).
- Phase 2a was **started and cancelled before any file changed** — working tree was verified clean. Nothing partial landed.

## DESIGN LANGUAGE UPDATE (2026-10-08, supersedes the 2a visual brief)

User verdict mid-Phase-2a: the maple/glass/gradient look was too "AI-looking". The app is now **iOS-native (Apple HIG)** — implemented in `cc171f7`, keep it EXACTLY for 2b/3/4:

- **Tokens (both themes, verbatim):** light bg `#F2F2F7` / card `#FFFFFF` / label `#000` / secondary `rgba(60,60,67,.6)` / separator `rgba(60,60,67,.29)` / tint `#007AFF` / destructive `#FF3B30`; dark bg `#000` / card `#1C1C1E` / elevated `#2C2C2E` / label `#FFF` / secondary `rgba(235,235,245,.6)` / separator `rgba(84,84,88,.6)` / tint `#0A84FF` / destructive `#FF453A`. Level colors: Federal blue / Provincial purple `#AF52DE`·`#BF5AF2` / Municipal mint `#30D158`. **Single accent rule: tint is iOS blue; NO red UI tint** (red = destructive + party data only).
- **Type:** system stack (`-apple-system` → bundled InterVariable fallback), iOS scale LargeTitle 34/700/−0.02em → Caption2 11/600, body 17.
- **Surfaces:** cards 12px radius, NO shadows/borders (bg contrast separates), 16px insets, 8pt grid, hairline separators inset 16px in lists.
- **Chrome:** translucent nav/tab bars (`blur(20px) saturate(180%)` + ~72% card), hairline edge, real iOS tab bar (NO sliding pill/layoutId, selection = 150ms color cross-fade), large title on Home.
- **Controls:** solid-tint primary button (50px/14px radius/white 17px/600, whileTap scale 0.97), tinted secondary (tint 12% bg), iOS search field (`rgba(118,118,128,.12)`, inline 13px validation — no floating card).
- **Motion:** default spring `bounce: 0, duration: 0.4` (critically damped, zero overshoot); bounce ≤0.2 ONLY on drag release; entrances = one fade + 8px rise 0.25s, stagger ≤0.03s/item capped 6.
- **Still dead, keep dead:** gradients, glow shadows, conic, glass pills, shine sweeps, icon pop springs.
- Phase 2b sheets = iOS sheet: grabber, drag-to-dismiss with velocity handoff, bounce ≤0.2 on release only.

Ops notes: commits `4903f3e` + `eba5dc9` (fastlane/release lane) came from a PARALLEL session working in this same clone — `git pull` before slicing and commit only your own files. Playwright/CUA clicks time out in the ZCode in-app browser on this app because occluded tabs never fire rAF (framer entrances sit at ~0.5 opacity, stability check never settles) — **automation artifact, not an app bug**; hit-testing is clean, drive flows via `locator.evaluate(el => el.click())` and judge with screenshots.

## Take it to the server PC

```bash
# auth: private repo — use a PAT with repo scope over https, or your SSH key
git clone https://github.com/jiracipika/repfindercanada-mobile.git
cd repfindercanada-mobile
npm install                      # node >= 20 (built with 22.17)
npm run typecheck && npm run build   # verify gate before any work
npm run dev                      # full stack (express serves vite); app calls Represent API live
```

Android shell: Capacitor 7, `npx cap sync android` after builds; CI = Codemagic (`codemagic.yaml`, workflows `release-both` / `android-play-store` / `ios-app-store`). NOTE: `applicationId` is `com.marcelsabas.canadarepfinder` (differs from capacitor appId — **never change it**, Play Store identity). `.env.production` holds only the public Render API URL.

## Multi-agent convention (GLM 5.3 + GLM-5.3-Flash)

- **GLM 5.3 (planner/architect):** owns slice contracts, reviews diffs, integrates, runs verify gates, writes commits. In ZCode: the main session does this.
- **GLM-5.3-Flash (executors):** one subagent per lane, sequential (no parallel lanes on the same tree), each given one phase contract verbatim, each must pass the verify gate, each commits but **never pushes**. In ZCode: Agent-tool subagents inherit the session model; with dynamic workflows set `subagent_model` to the flash model explicitly. Keep ≤2 concurrent subagents (Z.AI plan rate-limit history: ~2 concurrent is safe).
- Push rule: verify → commit → push, per user's standard git workflow (always `git pull` first).

## Remaining phases (contracts ready to dispatch verbatim)

### Phase 2a — design tokens + core shell (next up)
Full brief as written 2026-10-07: rewrite `client/src/index.css` tokens — dark `#0a0a0f` bg / `#1c1c2e` cards / white fg / maple `#ff4d63` primary / civic blue `#4fb3ff` / mint `#3ddc97`; complete light theme (warm paper `#f7f6f3`, deeper maple `#e63950`, ALL civic-* redefined — currently missing); zero `!important`; add `@fontsource-variable/inter` (import in main.tsx — fixes "Inter never loaded"); blocking inline theme script in index.html (kills dark flash); new `client/src/components/civic/` primitives (`motion.ts` shared variants stiffness 300–380/damping 28–34, `PartyBadge` one source of truth, `LevelChip` Federal blue/Provincial purple/Municipal mint, `SectionHeader` for grouped results, `EmptyState`/`ErrorState` with Retry, shimmer `Skeleton`, rebuilt `RepCard` — keep page prop contracts); restyle app-header (glass, 44px theme toggle with Sun/Moon morph), bottom-nav (glass pill + `layoutId` sliding active indicator + icon pop), loading-screen (breathing mark + conic glow), SwipePager (directional slide ±24px + fade, spring, keep drag logic exact), Home hero (staggered entrance) + search-form (focus glow ring, floating validation card, shine-sweep primary button — LOGIC untouched) + results (grouped Federal/Provincial/Municipal via existing sort + level field, staggered cards, shimmer skeletons). Rules: framer-motion only, transform/opacity only, 0.2–0.45s, reduced-motion respected, ≥44px targets. Verify: typecheck 0, build ok, `grep -rn "!important" client/src/index.css` → 0, `--civic-mint` defined in both themes. Commit `feat(design): token system 2.0 …`, no push.

### Phase 2b — modal sheet + remaining pages
RepresentativeModal → reusable `BottomSheet` (Radix Dialog a11y + framer-motion drag-to-dismiss, grabber, bottom sheet on mobile / centered ≥768px); lazy-load RidingMap (`React.lazy`); fix RidingMap double-marker bug (`riding-map.tsx:116-208` — stray else geocodes after successful shape). Restyle saved/activity/profile/name-search/sources/terms + terms/non-affiliation modals (same token system, staggered lists, AnimatePresence removal, skeletons). Kill `alert()` usages (representative-card missing phone/email → disabled/toast; modal clipboard confirm → toast). Touch targets ≥44px (modal header buttons are 32px now). Fabricated About bio → "Biography not available" + source link. Federal fallback office card (hardcoded Parliament address) → only when level==federal, labelled as default. Verify: typecheck, build, no `alert(` in client/src outside libs, screenshots.

### Phase 3 — state, flows, data
Lift search state so results survive tab swipes (context/store; SwipePager currently unmounts pages — `SwipePager.tsx:129`); history taps re-run the search (feed SearchForm's existing `initialQuery`/`shouldAutoSearch`, `activity.tsx:39-48`); single inline error + Retry instead of toast+alert double-report (`home.tsx:75-83`, `search-form.tsx:144-148`); disclaimer once-per-version not every-launch (`App.tsx:152-154`); populate `province` in transform (`representApiService.ts:252` — fixes "Riding, " + Maps links); React Query for searches (installed, zero useQuery) + batch the N+1 detail fetches (`representApiService.ts:34-42` serial loop); wire the unused `searchCacheRepository` (serve cached results with "last updated" banner when API fails); "Use my location" button (permission flow already written, unused: `lib/geolocation.ts` — Android needs ACCESS_COARSE_LOCATION in manifest when enabling); input UX (`inputMode`, `autoCapitalize`, `enterKeyHint`); consolidate 3 postal validators + dual saved-reps stores (`use-user-data.tsx` parseInt-on-URL bug); add "clear history" (repo method exists).

### Phase 4 — native shell, PWA, packaging
Android back button (close sheet → back tab → exit; no `backButton` listener today); StatusBar synced to theme toggle (set once `Style.Light` today, wrong for dark); splash via `@capacitor/splash-screen` (kill white flash vs dark bg), Keyboard plugin insets, Haptics on save, Capacitor Share with real URL (current share includes `https://localhost/…` from webview); PWA: `<link rel="manifest">` + icons (manifest name/theme/icons are stale "Find My Rep" #1976D2), register or delete `sw.js`; prune stale `allowNavigation` domains (postalcodecsv.com, opencagedata, geocoder.ca); version unification → **3.3.0** across package.json + android versionName/versionCode (503000) + codemagic iOS marketing version (stuck at 3.0.0) + web fallbacks (all read `version.ts`); move the 7-tap dev auto-tester behind `import.meta.env.DEV`.

### Deferred (user approved deferral)
- EN/FR i18n (extract strings, fr-CA legal copy) — table stakes eventually, big lift.
- 18MB postal_index.json startup cost (compact FSA-level index) — biggest perf win available after phases above.
- Prune unused shadcn ui/* + recharts/embla/cmdk/react-hook-form (their ui components still import them).

## Definition of done (user bar)
Amazing on mobile, very usable, soft smooth animations, feels complete. Iterate with mobile-viewport screenshots (390×844) until it passes that bar; verify (typecheck+build+flows) before every push.
