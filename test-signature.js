import { prepareQrDataForSignature, generateSignature, verifySignature } from '../src/lib/qr-custom.js';

// Test data
const testData = {
  customerName: 'Juan Pérez',
  customerWhatsapp: '+51987654321',
  customerDni: '12345678',
  customerPhrase: 'Feliz cumpleaños',
  customData: 'test-data',
  theme: 'default',
  createdAt: new Date().toISOString()
};

const code = 'TEST123';

// Prepare data using centralized function
const preparedData = prepareQrDataForSignature(testData);
console.log('Prepared data:', JSON.stringify(preparedData, null, 2));

// Generate signature
const signature = generateSignature(code, preparedData);
console.log('Generated signature:', signature);

// Verify signature
const isValid = verifySignature(code, preparedData, signature);
console.log('Signature valid:', isValid);

// Test with different data preparation (should fail)
const wrongData = {
  ...testData,
  customerName: 'Different Name' // This should make verification fail
};
const wrongPrepared = prepareQrDataForSignature(wrongData);
const isValidWrong = verifySignature(code, wrongPrepared, signature);
console.log('Wrong data signature valid:', isValidWrong);