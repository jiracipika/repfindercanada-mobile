const postalCodes = [
  "V2H1L5", "E6G0B1", "T6T0Y4", "L3M0B4", "V3T1N2", "V2M6K8",
  "J6S2M3", "J1M2A2", "K1J7R8", "V2A1N6", "N0M2N0", "L2E0A3",
  "V7K2H9", "N6J3P4", "K6J3M7", "J1L2X5", "J9A1N7", "J1J3P1",
  "J0G1A0", "E2A2S7", "G8B3R4", "L5R1S4", "M1C3X2", "B3Z0A4",
  "H9R3E4", "N3S6E9", "N5H3E5", "P5A1T3", "L4E3Y8", "J3P6G1",
  "P6B2B2", "T1Y6V8", "G3G2M1", "G8B3J2", "E7L4G4", "P7G0B2",
  "L8G3K8", "G0L4E0", "J1T1E4", "V9L2Y9", "J7M2B2", "K9J7K4",
  "K8V5P4", "E4M0A3", "L6H3J3", "M8Y1Z2", "J6Z3K5", "V1B3V7",
  "N5R3H8", "T0G1Y0", "M1C5E9"
];

async function testPostalCodes() {
  console.log("Testing postal codes with coordinate-based Represent API search...\n");

  for (const code of postalCodes) {
    try {
      console.log(`🔍 Testing ${code}:`);

      // Test geocoding first
      const geoResponse = await fetch('http://localhost:5001/api/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postalCode: code })
      });

      if (geoResponse.ok) {
        const geoData = await geoResponse.json();
        console.log(`   📍 Coordinates: ${geoData.latitude}, ${geoData.longitude} (${geoData.source})`);

        // Test representative search
        const repResponse = await fetch('http://localhost:5001/api/representatives/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: code, type: 'postal_code' })
        });

        if (repResponse.ok) {
          const repData = await repResponse.json();
          if (repData.representatives.length > 0) {
            const rep = repData.representatives[0];
            console.log(`   ✅ ${rep.name} - ${rep.party} - ${rep.constituency}`);
          } else {
            console.log(`   ❌ No representatives found`);
          }
        } else {
          const errorData = await repResponse.json();
          console.log(`   ❌ Search failed: ${errorData.message}`);
        }
      } else {
        const errorData = await geoResponse.json();
        console.log(`   ❌ Geocoding failed: ${errorData.message}`);
      }

    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }

    console.log("");
  }
}

testPostalCodes().catch(console.error);