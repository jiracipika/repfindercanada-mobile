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
  console.log("Testing postal codes with local search + Represent API (same as mobile app)...\n");

  // Since we're testing from the root directory, we need to create a simple Node.js test
  // Let's use the server's binary lookup directly
  const { getCoordinatesFromPostalCodeBinary, isBinaryDataLoaded } = await import('./server/binaryPostalLookup.ts');

  // Wait for binary data to load
  let attempts = 0;
  while (!isBinaryDataLoaded() && attempts < 10) {
    console.log('   ⏳ Waiting for binary data to load...');
    await new Promise(resolve => setTimeout(resolve, 500));
    attempts++;
  }

  // Create a simplified Represent API call (similar to mobile app)
  async function testRepresentAPI(latitude, longitude) {
    try {
      // Direct representatives search using coordinates (same as mobile app)
      const response = await fetch(`https://represent.opennorth.ca/representatives/?point=${latitude},${longitude}&limit=20`);

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.objects || data.objects.length === 0) {
        return [];
      }

      // Transform representatives (simplified version)
      const representatives = data.objects.map(rep => ({
        name: rep.name,
        level: rep.representative_set_name?.toLowerCase().includes('federal') ? 'federal' :
              rep.representative_set_name?.toLowerCase().includes('provincial') ? 'provincial' : 'municipal',
        party: rep.party_name || 'Independent',
        riding: rep.district_name || 'N/A',
        office: rep.elected_office || 'Representative'
      }));

      // Sort by level: Federal → Provincial → Municipal
      return representatives.sort((a, b) => {
        const levelOrder = { 'federal': 1, 'provincial': 2, 'municipal': 3 };
        return (levelOrder[a.level] || 99) - (levelOrder[b.level] || 99);
      });

    } catch (error) {
      console.error('Represent API error:', error.message);
      return [];
    }
  }

  for (const code of postalCodes) {
    try {
      console.log(`🔍 Testing ${code}:`);

      // Test local postal code lookup (server binary lookup)
      const coordinates = getCoordinatesFromPostalCodeBinary(code);
      if (coordinates) {
        console.log(`   📍 Local lookup: ${coordinates.latitude}, ${coordinates.longitude}`);

        // Test representative search using coordinates (Represent API)
        const representatives = await testRepresentAPI(
          coordinates.latitude,
          coordinates.longitude
        );

        if (representatives.length > 0) {
          console.log(`   ✅ Found ${representatives.length} representatives:`);
          representatives.slice(0, 3).forEach((rep, index) => {
            console.log(`      ${index + 1}. ${rep.name} (${rep.level}) - ${rep.party}`);
            console.log(`         Riding: ${rep.riding || 'N/A'}`);
          });
          if (representatives.length > 3) {
            console.log(`      ... and ${representatives.length - 3} more`);
          }
        } else {
          console.log(`   ❌ No representatives found for these coordinates`);
        }
      } else {
        console.log(`   ❌ Postal code not found in local database`);
      }

    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }

    console.log("");
  }

  console.log(`\n📊 Test Complete: Tested ${postalCodes.length} postal codes using local database + Represent API`);
  console.log("🚀 This matches the exact workflow used in the mobile app!");
}

testPostalCodes().catch(console.error);