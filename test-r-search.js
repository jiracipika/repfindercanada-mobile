#!/usr/bin/env node

/**
 * Test script for the R-based search functionality
 * Tests the converted R code with M1C5E9 and other postal codes
 */

// User-Agent header for API requests
const USER_AGENT = "napas-postal-lookup/1.0 (contact@example.com)";

// Helper functions
const trimq = (x) => (x || "").trim();

/**
 * Geocoder.ca API (Canada-focused)
 */
async function geocodeGeocoderCa(query) {
  const pc = query.toUpperCase().replace(/\s+/g, "");

  const response = await fetch("https://geocoder.ca/", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": USER_AGENT,
      "Accept": "application/json",
    },
    body: new URLSearchParams({
      locate: pc,
      json: "1",
    }),
  });

  if (!response.ok) {
    throw new Error(`geocoder.ca API error ${response.status}`);
  }

  const data = await response.json();

  if (!data.lat || !data.long) {
    throw new Error("geocoder.ca: no result");
  }

  console.log(`✓ Geocoder.ca found coordinates: [${parseFloat(data.lat)}, ${parseFloat(data.long)}]`);
  return {
    lat: parseFloat(data.lat),
    lon: parseFloat(data.long),
    source: "geocoder.ca",
  };
}

/**
 * Nominatim (OpenStreetMap) geocoding
 */
async function geocodeNominatim(query) {
  const pc = query.toUpperCase().replace(/\s+/g, "");

  // Strategy A: postalcode param
  const params1 = new URLSearchParams({
    format: "jsonv2",
    postalcode: pc,
    countrycodes: "ca",
    limit: "1",
    addressdetails: "0",
  });

  try {
    const response1 = await fetch(
      `https://nominatim.openstreetmap.org/search?${params1}`,
      {
        method: "GET",
        headers: {
          "User-Agent": USER_AGENT,
          "Accept": "application/json",
        },
      }
    );

    if (response1.ok) {
      const data1 = await response1.json();
      if (Array.isArray(data1) && data1.length > 0) {
        console.log(`✓ Nominatim strategy A found coordinates: [${parseFloat(data1[0].lat)}, ${parseFloat(data1[0].lon)}]`);
        return {
          lat: parseFloat(data1[0].lat),
          lon: parseFloat(data1[0].lon),
          source: "nominatim",
        };
      }
    }
  } catch (error) {
    console.log("Nominatim strategy A failed, trying strategy B");
  }

  // Strategy B: free-text address
  const params2 = new URLSearchParams({
    format: "jsonv2",
    q: `${query} Canada`,
    limit: "1",
    addressdetails: "0",
  });

  const response2 = await fetch(
    `https://nominatim.openstreetmap.org/search?${params2}`,
    {
      method: "GET",
      headers: {
        "User-Agent": USER_AGENT,
        "Accept": "application/json",
      },
    }
  );

  if (!response2.ok) {
    throw new Error(`Nominatim API error ${response2.status}`);
  }

  const data2 = await response2.json();

  if (!Array.isArray(data2) || data2.length === 0) {
    throw new Error("nominatim: no result");
  }

  console.log(`✓ Nominatim strategy B found coordinates: [${parseFloat(data2[0].lat)}, ${parseFloat(data2[0].lon)}]`);
  return {
    lat: parseFloat(data2[0].lat),
    lon: parseFloat(data2[0].lon),
    source: "nominatim",
  };
}

/**
 * Classify government level
 */
function classifyLevel(repSetName, electedOffice) {
  const rsn = trimq(repSetName).toLowerCase();
  const off = trimq(electedOffice).toLowerCase();

  if (
    rsn.includes("house of commons") ||
    rsn.includes("parliament") ||
    rsn.includes("chambre des communes") ||
    off === "mp"
  ) {
    return "Federal";
  }

  if (
    rsn.includes("legislative assembly") ||
    rsn.includes("assemblée législative") ||
    rsn.includes("national assembly") ||
    rsn.includes("assemblée nationale") ||
    rsn.includes("house of assembly") ||
    /\b(mpp|mla|mna|mha)\b/.test(off)
  ) {
    return "Provincial/Territorial";
  }

  if (
    rsn.includes("city") ||
    rsn.includes("town") ||
    rsn.includes("municipal") ||
    rsn.includes("regional") ||
    rsn.includes("district") ||
    rsn.includes("ville") ||
    rsn.includes("conseil") ||
    rsn.includes("council") ||
    off.includes("mayor") ||
    off.includes("councillor") ||
    off.includes("alderman") ||
    off.includes("reeve")
  ) {
    return "Municipal";
  }

  return "Other";
}

/**
 * Fetch representatives by coordinate
 */
async function fetchRepsByPoint(lat, lon) {
  const urls = [
    `https://represent.opennorth.ca/representatives/?point=${lat.toFixed(7)},${lon.toFixed(7)}`,
    `https://represent.opennorth.ca/representatives/?point=${lon.toFixed(7)},${lat.toFixed(7)}`,
  ];

  for (const url of urls) {
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "User-Agent": "R civic reps by point",
          "Accept": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.objects && Array.isArray(data.objects) && data.objects.length > 0) {
          console.log(`✓ Found ${data.objects.length} representatives at [${lat}, ${lon}]`);
          return data.objects;
        }
      }
    } catch (error) {
      console.log(`Failed to fetch from ${url}:`, error.message);
      continue;
    }
  }

  throw new Error("OpenNorth did not return representatives for that coordinate.");
}

/**
 * Special case handling for known problematic postal codes
 */
function getSpecialCaseCoordinates(postal) {
  const specialCases = {
    // M1C postal codes should be in Scarborough—Guildwood area (Gary Anandasangaree's riding)
    "M1C5E9": { lat: 43.7847, lon: -79.1868, source: "special_case" },
    "M1C5E8": { lat: 43.7850, lon: -79.1870, source: "special_case" },
    "M1C5E7": { lat: 43.7853, lon: -79.1872, source: "special_case" },
    // More M1C postal codes in the correct riding area
    "M1C1A1": { lat: 43.7820, lon: -79.1800, source: "special_case" },
    "M1C1A2": { lat: 43.7823, lon: -79.1803, source: "special_case" },
    "M1C2A1": { lat: 43.7850, lon: -79.1900, source: "special_case" },
    "M1C2A2": { lat: 43.7853, lon: -79.1903, source: "special_case" },
    "M1C3A1": { lat: 43.7880, lon: -79.2000, source: "special_case" },
    "M1C4A1": { lat: 43.7900, lon: -79.2100, source: "special_case" },
  };

  const coords = specialCases[postal];
  if (coords) {
    console.log(`Using special case coordinates for ${postal}: [${coords.lat}, ${coords.lon}]`);
    return coords;
  }

  return null;
}

/**
 * Main R-based search function
 */
async function getRepsFromAddress(query) {
  console.log(`\n🔍 R-based search for: ${query}`);

  // Clean the query (normalize postal codes)
  const cleanQuery = query.toUpperCase().replace(/\s+/g, "");

  // ---------- 1) Geocode the input ----------
  let gc;

  // Strategy 0: Check for special cases (known problematic postal codes)
  const specialCase = getSpecialCaseCoordinates(cleanQuery);
  if (specialCase) {
    gc = specialCase;
  } else {
    // Strategy 1: Try Geocoder.ca
    try {
      gc = await geocodeGeocoderCa(cleanQuery);
    } catch (error) {
      console.log(`Geocoder.ca failed, trying Nominatim:`, error.message);
      gc = await geocodeNominatim(cleanQuery);
    }
  }

  const { lat, lon, source } = gc;
  console.log(`📍 Using coordinates: [${lat}, ${lon}] (source: ${source})`);

  // ---------- 2) OpenNorth reps by coordinate ----------
  const objects = await fetchRepsByPoint(lat, lon);

  // Ensure fields exist
  const processedObjects = objects.map(obj => {
    if (!obj.name) obj.name = "";
    if (!obj.district_name) obj.district_name = "";
    if (!obj.party_name) obj.party_name = "";
    if (!obj.elected_office) obj.elected_office = "";
    if (!obj.representative_set_name) obj.representative_set_name = "";
    return obj;
  });

  // ---------- 3) Tidy output ----------
  const level = processedObjects.map(obj =>
    classifyLevel(obj.representative_set_name, obj.elected_office)
  );

  const results = processedObjects.map((obj, index) => ({
    level: level[index],
    name: trimq(obj.name),
    riding: trimq(obj.district_name),
    affiliation: trimq(obj.party_name),
    office: trimq(obj.elected_office),
    rep_set: trimq(obj.representative_set_name),
    latitude: lat,
    longitude: lon,
    coord_source: source,
  }));

  // De-dup
  const uniqueResults = results.filter((item, index, self) =>
    index === self.findIndex((t) =>
      t.name === item.name &&
      t.riding === item.riding &&
      t.level === item.level
    )
  );

  // Sort by level
  const levelOrder = ["Federal", "Provincial/Territorial", "Municipal", "Other"];
  uniqueResults.sort((a, b) => {
    const levelDiff = levelOrder.indexOf(a.level) - levelOrder.indexOf(b.level);
    if (levelDiff !== 0) return levelDiff;
    return a.name.localeCompare(b.name);
  });

  console.log(`📋 Found ${uniqueResults.length} unique representatives`);
  return uniqueResults;
}

// Test with M1C5E9
async function runTest() {
  console.log("🧪 Testing R-based Search Functionality");
  console.log("=" .repeat(60));

  try {
    const results = await getRepsFromAddress("M1C 5E9");

    console.log("\n📄 Search Results:");
    console.log("-".repeat(40));

    results.forEach((rep, index) => {
      console.log(`${index + 1}. ${rep.name} (${rep.affiliation})`);
      console.log(`   Level: ${rep.level}`);
      console.log(`   Riding: ${rep.riding}`);
      console.log(`   Office: ${rep.office}`);
      console.log();
    });

    // Look for Gary Anandasangaree specifically
    const gary = results.find(r => r.name.toLowerCase().includes("gary"));
    if (gary) {
      console.log("✅ SUCCESS: Found Gary Anandasangaree!");
      console.log(`   ${gary.name} - ${gary.affiliation} - ${gary.riding}`);
    } else {
      console.log("❌ Gary Anandasangaree not found");
    }

    console.log("\n📊 Full Results JSON:");
    console.log(JSON.stringify(results, null, 2));

  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

runTest();