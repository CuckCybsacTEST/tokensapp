// test-music-order.js
const http = require('http');

const data = JSON.stringify({
  requesterName: 'Test User',
  songTitle: 'Billie Jean',
  artist: 'Michael Jackson',
  orderType: 'FREE',
  deviceFingerprint: 'test123'
});

const options = {
  hostname: 'localhost',
  port: 3006,
  path: '/api/music-orders',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log('Response:', body);
    try {
      const json = JSON.parse(body);
      console.log('Parsed:', JSON.stringify(json, null, 2));
    } catch (e) {
      console.log('Not JSON');
    }
  });
});

req.on('error', (e) => {
  console.error(`Error: ${e.message}`);
});

req.write(data);
req.end();
