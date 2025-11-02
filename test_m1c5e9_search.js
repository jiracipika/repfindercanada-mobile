#!/usr/bin/env node

// Test script to verify the M1C5E9 postal code search functionality
import { searchWithOfficialData } from './client/src/lib/houseOfCommonsApi.js';

async function testM1C5E9Search() {
  console.log('🔍 Testing M1C5E9 postal code search...');

  try {
    const results = await searchWithOfficialData('M1C5E9');

    console.log(`✅ Found ${results.length} representatives:`);

    results.forEach((rep, index) => {
      console.log(`\n${index + 1}. ${rep.name} - ${rep.electedOffice}`);
      console.log(`   Party: ${rep.party}`);
      console.log(`   Constituency: ${rep.constituency}`);
      console.log(`   Province: ${rep.province}`);
      console.log(`   Email: ${rep.email || 'N/A'}`);
      console.log(`   Phone: ${rep.phone || 'N/A'}`);
    });

    // Check for expected representatives
    const expectedReps = ['MP', 'MPP', 'Mayor', 'Councillor'];
    const foundTypes = results.map(rep => rep.electedOffice);

    console.log('\n📊 Representative types found:');
    expectedReps.forEach(type => {
      const found = foundTypes.includes(type);
      console.log(`   ${type}: ${found ? '✅' : '❌'}`);
    });

    // Check specifically for Michael Coteau (MP for Scarborough—Woburn)
    const mpCoteau = results.find(rep =>
      rep.name === 'Michael Coteau' && rep.electedOffice === 'MP'
    );

    if (mpCoteau) {
      console.log('\n✅ SUCCESS: Found Michael Coteau (MP) for Scarborough—Woburn');
    } else {
      console.log('\n❌ ISSUE: Michael Coteau (MP) not found');
      console.log('Found MPs:', results.filter(rep => rep.electedOffice === 'MP').map(rep => rep.name));
    }

  } catch (error) {
    console.error('❌ Search failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testM1C5E9Search();