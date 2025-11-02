// Simple test script to verify our fixes work with M1C5E9
import { searchWithOfficialData } from './client/src/lib/houseOfCommonsApi.ts';

async function testM1C5E9() {
  console.log('Testing M1C5E9 postal code search...');

  try {
    const results = await searchWithOfficialData('M1C5E9');

    console.log(`\n✅ Search successful! Found ${results.length} representatives:`);

    results.forEach((rep, index) => {
      console.log(`\n${index + 1}. ${rep.name} (${rep.electedOffice})`);
      console.log(`   Party: ${rep.party}`);
      console.log(`   Constituency: ${rep.constituency}`);
      console.log(`   Email: ${rep.email || 'Not available'}`);
      console.log(`   Phone: ${rep.phone || 'Not available'}`);
    });

    // Check for expected representative types
    const types = results.map(r => r.electedOffice);
    console.log(`\n📊 Representative types found: ${types.join(', ')}`);

    const hasMP = types.includes('MP');
    const hasMPP = types.includes('MPP');
    const hasMayor = types.includes('Mayor');
    const hasCouncillor = types.includes('Councillor');

    console.log(`\n✅ Expected representatives:`);
    console.log(`   MP: ${hasMP ? '✅ Found' : '❌ Missing'}`);
    console.log(`   MPP: ${hasMPP ? '✅ Found' : '❌ Missing'}`);
    console.log(`   Mayor: ${hasMayor ? '✅ Found' : '❌ Missing'}`);
    console.log(`   Councillor: ${hasCouncillor ? '✅ Found' : '❌ Missing'}`);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
  }
}

testM1C5E9();