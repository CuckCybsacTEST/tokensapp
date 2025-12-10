async function testQrGeneration() {
  try {
    const response = await fetch('http://localhost:3000/api/qr/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customerName: 'Test User',
        customerWhatsapp: '+51987654321',
        customerDni: '12345678'
      })
    });

    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', data);

    if (data.ok && data.code) {
      // Test validation
      const validateResponse = await fetch(`http://localhost:3000/api/qr/validate/${data.code}`);
      const validateData = await validateResponse.json();
      console.log('Validation Status:', validateResponse.status);
      console.log('Validation Response:', validateData);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testQrGeneration();