#!/usr/bin/env node

/**
 * Test script for the enhanced postal code lookup using OpenStreetMap Nominatim
 * Run with: node test-postal-lookup.js
 */

// Since this is a simple test, we'll implement the core logic here
const USER_AGENT = "RepFinder/2.1.0 (contact@example.com)";

function normalizePostalCode(postal) {
  return postal.toUpperCase().replace(/\s+/g, "");
}

async function fetchJSON(url) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        "Accept": "application/json",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} for ${url}`);
    }
    return res.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout after 10 seconds');
    }
    throw error;
  }
}

async function geocodePostalCodeOSM(postal) {
  const cleanPostal = normalizePostalCode(postal);

  // Strategy 1: Structured query with explicit country and postal code
  const structuredUrl = `https://nominatim.openstreetmap.org/search?format=jsonv2&country=Canada&postalcode=${encodeURIComponent(cleanPostal)}&limit=1&addressdetails=1`;

  try {
    console.log(`Attempting structured query for ${cleanPostal}`);
    const data = await fetchJSON(structuredUrl);

    if (Array.isArray(data) && data.length > 0) {
      const result = data[0];
      const coordinates = {
        lat: parseFloat(result.lat),
        lon: parseFloat(result.lon),
        source: "osm_nominatim",
        urls: { nominatim: structuredUrl }
      };

      console.log(`✓ Found coordinates for ${cleanPostal}: [${coordinates.lat}, ${coordinates.lon}]`);
      return coordinates;
    }

    console.log(`Structured query returned no results, trying spaced format`);

  } catch (error) {
    console.log(`Structured query failed, trying alternatives:`, error.message);
  }

  // Strategy 2: Try with space in postal code format (FSA + space + LDU)
  const spacedPostal = cleanPostal.slice(0, 3) + " " + cleanPostal.slice(3);
  const spacedUrl = `https://nominatim.openstreetmap.org/search?format=jsonv2&country=Canada&postalcode=${encodeURIComponent(spacedPostal)}&limit=1&addressdetails=1`;

  try {
    console.log(`Trying spaced format: ${spacedPostal}`);
    const spacedData = await fetchJSON(spacedUrl);

    if (Array.isArray(spacedData) && spacedData.length > 0) {
      const result = spacedData[0];
      const coordinates = {
        lat: parseFloat(result.lat),
        lon: parseFloat(result.lon),
        source: "osm_nominatim",
        urls: { nominatim: spacedUrl }
      };

      console.log(`✓ Spaced format found coordinates for ${cleanPostal}: [${coordinates.lat}, ${coordinates.lon}]`);
      return coordinates;
    }
  } catch (error) {
    console.log(`Spaced format failed:`, error.message);
  }

  // Strategy 3: Try free-form query with country restriction
  const fallbackUrl = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(spacedPostal + ", Canada")}&limit=1&addressdetails=1&countrycodes=ca`;

  try {
    console.log(`Trying free-form query with country restriction`);
    const fallbackData = await fetchJSON(fallbackUrl);

    if (Array.isArray(fallbackData) && fallbackData.length > 0) {
      const result = fallbackData[0];

      // Verify the result is actually in Canada
      if (result.address?.country_code === 'ca' || result.display_name?.toLowerCase().includes('canada')) {
        const coordinates = {
          lat: parseFloat(result.lat),
          lon: parseFloat(result.lon),
          source: "osm_nominatim",
          urls: { nominatim: fallbackUrl }
        };

        console.log(`✓ Free-form query found coordinates for ${cleanPostal}: [${coordinates.lat}, ${coordinates.lon}]`);
        return coordinates;
      } else {
        console.log(`Free-form query returned non-Canadian result: ${result.display_name}`);
      }
    }
  } catch (error) {
    console.log(`Free-form query failed:`, error.message);
  }

  // Strategy 4: Try Forward Sortation Area (FSA) only
  const fsa = cleanPostal.slice(0, 3);
  const fsaUrl = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(fsa + ", Canada")}&limit=3&addressdetails=1&countrycodes=ca`;

  try {
    console.log(`Trying FSA-only lookup: ${fsa}`);
    const fsaData = await fetchJSON(fsaUrl);

    if (Array.isArray(fsaData) && fsaData.length > 0) {
      // Find the first result that's actually in Canada and matches our FSA
      const canadianResult = fsaData.find(result =>
        result.address?.country_code === 'ca' || result.display_name?.toLowerCase().includes('canada')
      );

      if (canadianResult) {
        const coordinates = {
          lat: parseFloat(canadianResult.lat),
          lon: parseFloat(canadianResult.lon),
          source: "osm_nominatim",
          urls: { nominatim: fsaUrl }
        };

        console.log(`✓ FSA lookup found coordinates for ${cleanPostal}: [${coordinates.lat}, ${coordinates.lon}]`);
        return coordinates;
      }
    }
  } catch (error) {
    console.log(`FSA lookup failed:`, error.message);
  }

  throw new Error(`Postal code "${cleanPostal}" not found via any OpenStreetMap Nominatim strategy`);
}

async function getMPByPoint(lat, lon) {
  const repsUrl = `https://represent.opennorth.ca/representatives/house-of-commons/?point=${lat},${lon}&pretty=1`;
  const reps = await fetchJSON(repsUrl);

  const mp = (reps.objects || []).find(o => o.elected_office === "MP");

  const bdyUrl = `https://represent.opennorth.ca/boundaries/?contains=${lat},${lon}&sets=federal-electoral-districts&pretty=1`;
  const bdys = await fetchJSON(bdyUrl);
  const b = (bdys.objects || [])[0];

  return {
    mp,
    riding_name: b?.name || null,
    riding_slug: b?.slug || null,
    urls: { reps_point: repsUrl, boundaries_point: bdyUrl }
  };
}

async function lookupPostal(postalInput) {
  const postal = normalizePostalCode(postalInput);

  try {
    const coords = await geocodePostalCodeOSM(postal);
    const { mp, riding_name, riding_slug, urls } = await getMPByPoint(coords.lat, coords.lon);

    const result = {
      postal_code: postal,
      coordinates: { lat: coords.lat, lon: coords.lon, source: "osm_nominatim" },
      federal: mp ? {
        riding_name,
        riding_slug,
        mp: {
          name: [mp.first_name, mp.last_name].filter(Boolean).join(" ") || mp.name,
          party_name: mp.party_name || null,
          email: mp.email || null,
          photo_url: mp.photo_url || null
        }
      } : null,
      debug: {
        urls: { ...coords.urls, ...urls },
        notes: []
      },
      approximate: false
    };

    const mpName = result.federal?.mp?.name ?? "Not found";
    const party = result.federal?.mp?.party_name ?? "-";
    const riding = riding_name ?? "-";

    console.log(`\n📋 MP for ${postal}: ${mpName} (${party}) — Riding: ${riding}`);
    return result;
  } catch (error) {
    console.error(`✗ Failed to lookup ${postal}:`, error.message);
    return null;
  }
}

// Test with several postal codes
async function runTests() {
  console.log("🧪 Testing Enhanced Postal Code Lookup\n");
  console.log("=" .repeat(60));

  const testPostalCodes = [
    "M1C 5E9", // Scarborough, Toronto
    "K1A 0A6", // Parliament Hill, Ottawa
    "V6B 2L9", // Downtown Vancouver
    "T2P 3M4", // Calgary
    "H3A 1C2", // Montreal
    "A1A 1A1", // St. John's, NL
  ];

  const results = [];

  for (const postal of testPostalCodes) {
    console.log(`\n🔍 Testing: ${postal}`);
    console.log("-".repeat(40));

    const result = await lookupPostal(postal);
    if (result) {
      results.push(result);
    }

    // Rate limiting - wait between requests
    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  console.log("\n" + "=".repeat(60));
  console.log(`📊 Summary: Successfully processed ${results.length}/${testPostalCodes.length} postal codes`);

  if (results.length > 0) {
    console.log("\n📄 Full Results:");
    console.log(JSON.stringify(results, null, 2));
  }
}

// Run the tests
runTests().catch(console.error);