# Postal Code Corrections

This document explains how to add manual corrections for postal codes that are incorrectly mapped to ridings by the Represent API.

## Problem

Some postal codes near riding boundaries may be incorrectly mapped by the Represent API. This happens because:
1. Electoral boundaries changed in the 2023 Representation Order
2. Postal code areas can overlap multiple ridings
3. Some databases haven't been updated to reflect recent redistricting

## Solution

The app uses a manual correction system on the server side to override incorrect mappings. When users report an incorrect postal code, we can add it to the correction list.

## How to Add a Correction

### Step 1: Verify the Correct Riding

Before adding a correction, verify the correct riding using:
- [Elections Canada Voter Information Service](https://www.elections.ca/Scripts/vis/FindED?L=e&QID=-1&PAGEID=20)
- Enter the full address to get the official riding
- Note: Postal codes alone can be ambiguous for addresses near boundaries

### Step 2: Add to Server Corrections

Edit `server/hybridPostalCodeService.ts` and add the correction to the `KNOWN_CORRECTIONS` array:

```typescript
const KNOWN_CORRECTIONS: Array<{
  postalCode: string;
  ridingName: string;
  province: string;
  notes: string;
}> = [
  {
    postalCode: 'M1C5E9',
    ridingName: 'Scarborough—Guildwood—Rouge Park',
    province: 'Ontario',
    notes: 'User reported - was incorrectly mapped to Scarborough—Woburn by Represent API'
  },
  // Add new corrections here:
  {
    postalCode: 'YOUR_POSTAL_CODE',  // Format: A1A1A1 (no spaces)
    ridingName: 'Correct Riding Name',
    province: 'Province Name',
    notes: 'Brief explanation of the issue'
  },
];
```

**Important:**
- Postal code must be uppercase with NO spaces (e.g., `M1C5E9` not `M1C 5E9`)
- Riding name must match EXACTLY as it appears in House of Commons XML
- Use em-dashes (—) not hyphens (-) in riding names
- Check existing MP names at: https://www.ourcommons.ca/Members/en/search/xml

### Step 3: Restart the Server

The corrections are loaded at server startup, so you need to restart:

```bash
npm run dev
```

### Step 4: Verify the Fix

Test the correction:

```bash
curl -X POST http://localhost:5000/api/v2/representatives/postal-code \
  -H "Content-Type: application/json" \
  -d '{"postalCode":"YOUR_POSTAL_CODE"}'
```

Check that:
- `"confidence": "high"`
- `"source": "cache_manual"`
- `"constituency"` matches the correct riding

## Current Known Corrections

| Postal Code | Correct Riding | Incorrect Mapping |
|-------------|----------------|-------------------|
| M1C5E9 | Scarborough—Guildwood—Rouge Park | Scarborough—Woburn |

## Reporting Issues

When users report incorrect postal codes:
1. Ask for their full address (for verification)
2. Verify the correct riding with Elections Canada
3. Add the correction following the steps above
4. Update this table with the new correction
5. Commit the changes with a descriptive message

## Technical Details

### How Corrections Work

1. **Server Startup**: Corrections are loaded from `KNOWN_CORRECTIONS` array
2. **User Search**: When a postal code is entered, the server checks:
   - Manual corrections first (highest priority)
   - Cached lookups
   - Represent API (with House of Commons verification)
3. **Source Tracking**: Each result includes:
   - `source`: Where the data came from
   - `confidence`: How reliable the result is
   - `warnings`: Any issues found

### Data Flow

```
User enters postal code
    ↓
Client → POST /api/v2/representatives/postal-code
    ↓
Server checks KNOWN_CORRECTIONS
    ↓ (if not found)
Server calls Represent API
    ↓
Server verifies with House of Commons XML
    ↓
Server returns MP details with confidence score
```

### Confidence Levels

- **High**: Manual correction or verified with House of Commons
- **Medium**: Found in Represent API and verified
- **Low**: Found in Represent API but NOT verified with House of Commons (shows warning to user)

## Future Improvements

- [ ] Admin UI for adding corrections without code changes
- [ ] Database storage for corrections (currently in-memory)
- [ ] Automatic detection of mismatches
- [ ] User reporting system with verification workflow
- [ ] Bulk import from Elections Canada data
