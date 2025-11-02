#!/usr/bin/env node

// Test script to verify the search API endpoint directly
const http = require('http');

function testSearchAPI() {
  console.log('🔍 Testing M1C5E9 postal code search via API...');

  const postData = JSON.stringify({
    query: 'M1C5E9',
    type: 'postal_code'
  });

  const options = {
    hostname: 'localhost',
    port: 5001,
    path: '/api/representatives/search',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = http.request(options, (res) => {
    console.log(`📡 Status Code: ${res.statusCode}`);
    console.log(`📡 Headers:`, res.headers);

    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      try {
        const response = JSON.parse(data);
        console.log('\n✅ API Response received:');
        console.log(JSON.stringify(response, null, 2));

        if (response.representatives) {
          const results = response.representatives;
          console.log(`\n📊 Found ${results.length} representatives:`);

          results.forEach((rep, index) => {
            console.log(`\n${index + 1}. ${rep.name} - ${rep.electedOffice}`);
            console.log(`   Party: ${rep.party}`);
            console.log(`   Constituency: ${rep.constituency}`);
            console.log(`   Province: ${rep.province}`);
            console.log(`   Email: ${rep.email || 'N/A'}`);
            console.log(`   Phone: ${rep.phone || 'N/A'}`);
          });

          // Check for expected representative types
          const expectedReps = ['MP', 'MPP', 'Mayor', 'Councillor'];
          const foundTypes = results.map(rep => rep.electedOffice);

          console.log('\n📊 Representative types found:');
          expectedReps.forEach(type => {
            const found = foundTypes.includes(type);
            console.log(`   ${type}: ${found ? '✅' : '❌'}`);
          });

          // Check specifically for Michael Coteau
          const mpCoteau = results.find(rep =>
            rep.name === 'Michael Coteau' && rep.electedOffice === 'MP'
          );

          if (mpCoteau) {
            console.log('\n✅ SUCCESS: Found Michael Coteau (MP) for Scarborough—Woburn');
          } else {
            console.log('\n❌ ISSUE: Michael Coteau (MP) not found');
            console.log('Found MPs:', results.filter(rep => rep.electedOffice === 'MP').map(rep => rep.name));
          }

        } else {
          console.log('❌ API returned error:', response);
        }
      } catch (parseError) {
        console.error('❌ Failed to parse JSON response:', parseError);
        console.log('Raw response:', data);
      }
    });
  });

  req.on('error', (error) => {
    console.error('❌ Request error:', error);
  });

  req.write(postData);
  req.end();
}

testSearchAPI();