# Postal code dataset — provenance + refresh recipe

`client/public/data/postal_index.json` + `postal_data.bin` (and the server's
root-level copies) are generated from a merged postal-code → coordinate table.
Format: index = code → float-offset (`i*2`) into a little-endian Float32 array
of lat/lng pairs (see `server/compressPostalData.ts`).

## Current dataset (2026-10-14, shipped in 3.3.4)

- **893,457 unique codes** = 890,796 from the 2021 PCCF (base, untouched) +
  2,661 post-2021 codes overlaid from the StatCan National Address Register
  (NAR) **December 2025 snapshot** (`46-26-0002`, StatCan Open Licence).
- Merge: NAR wins only for codes absent from the base. Every base coordinate
  is byte-identical to the previous release (verified before shipping).
- L6E0W3-class codes (newer than every official dataset — absent from 2021
  PCCF, NAR 2025-12, Represent, the House of Commons search, and Nominatim)
  are handled at runtime: longest-prefix fallback (`localPostalLookup`) and
  the geocoder.ca rescue (`freshPostalLookup`), mirrored on the website
  (repo `canadarepfinder`, FSA-centroid + geocoder.ca → Represent point query).

## Refresh recipe (rerun when NAR publishes a new snapshot, ~every 6 months)

1. Download `https://www150.statcan.gc.ca/n1/pub/46-26-0002/2022001/<YYYYMM>.zip`
   (the product page: https://www150.statcan.gc.ca/n1/en/catalogue/46-26-0002).
   Addresses CSVs carry `MAIL_POSTAL_CODE` + `LOC_GUID`; coordinates live in
   the Location CSVs (`BG_LATITUDE`/`BG_LONGITUDE`) — join on `LOC_GUID`.
   ~9% of location rows have no coordinates; skip them.
2. Dedupe first-occurrence per 6-char code into the `"Postal_codeOM","LAT","LONG"`
   CSV format (header included, quoted, sorted).
3. Merge over the CURRENT csv (don't replace the base — NAR alone LOSES
   ~50K PO-box/rural-route codes and some established codes like M5V2T6).
4. Regenerate index/bin with the `compressPostalData.ts` algorithm; verify:
   0 codes lost vs live, new-code delta present, spot-check round-trips
   (L6E0W2 → 43.8870506, -79.2842789; K1A0A1 → 45.4465675, -75.6862259).
5. Copy into `client/public/data/` AND the repo root (server copies), then
   release. The 2026-10-14 pipeline scripts are preserved in
   `data-refresh-2025-12/` (gitignored).

Caveat: NAR is civic-address only and its newest codes often lack coordinates
until StatCan geocodes them (L6E0W2 had none in 2025-12) — the runtime
fallbacks stay necessary regardless of refresh cadence.
