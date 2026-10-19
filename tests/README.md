# Profile sheet regression checks

Run from the repository root with Node 20 or newer:

    npm ci
    npx playwright install chromium
    npm run test:unit
    npm run test:e2e

`test:e2e` builds the production client, starts its own Vite preview on
127.0.0.1:4173, runs the checks, and stops the server. Do not start a second
preview on that port. No live API, database, login, or personal data is needed.
The saved representative is explicitly synthetic and only stored in isolated
browser contexts.

Coverage:

- Initial mobile/desktop hook value before React passive effects, including
  both sides of the 768px breakpoint.
- Touch-open from a saved representative; actual opacity and hit testing,
  not only DOM presence.
- Repeated close/reopen, Escape, and body pointer-event cleanup.
- Phone drag-dismiss and reopen.
- Tablet-to-phone and phone-to-tablet changes while the dialog is open.
- Reduced-motion behavior.
- Profile tab interaction after dismissal, including reaching Clear all caches
  in the page's nested scroller and saving the local profile.

The tablet drag case is intentionally skipped: tablets use a centered modal
without a grabber. Failure screenshots/traces are saved to ignored test-results/.

These are Chromium touch-emulation tests of the Capacitor web content. They do
not validate a native iOS/Android build, hardware-back dispatch, or a store upload.
Install and exercise a fresh native build before claiming those are verified.
