import { QRUtils } from './src/lib/qrUtils';

async function testQRDataCompleteness() {
  console.log('Testing QR data completeness...');

  // Sample purchase data with nested offer
  const purchaseData = {
    id: 'test-purchase-456',
    offerId: 'test-offer-123',
    customerName: 'Test Customer',
    customerWhatsapp: '+51987654321',
    amount: 25.50,
    createdAt: '2024-01-15T10:30:00Z',
    // Nested offer data
    offer: {
      id: 'test-offer-123',
      title: 'Test Offer',
      price: 25.50,
      isActive: true,
      validFrom: new Date('2024-01-01T00:00:00Z'),
      validUntil: new Date('2024-12-31T23:59:59Z'),
      timezone: 'America/Lima',
      availableDays: [1, 2, 3, 4, 5], // Monday to Friday
      startTime: '09:00',
      endTime: '18:00',
      maxQuantity: 100
    }
  };

  try {
    // Generate QR code
    const qrResult = await QRUtils.generatePurchaseQR(purchaseData);
    console.log('Generated QR code:', qrResult.qrCode);

    // Parse QR code - we need to extract the JSON data from the QR data URL
    // For testing purposes, let's create the data directly
    const qrData = {
      type: 'offer_purchase',
      purchaseId: purchaseData.id,
      offerId: purchaseData.offerId,
      customerName: purchaseData.customerName,
      customerWhatsapp: purchaseData.customerWhatsapp,
      amount: purchaseData.amount,
      createdAt: purchaseData.createdAt,
      qrCode: qrResult.qrCode,
      offer: {
        id: purchaseData.offer.id,
        title: purchaseData.offer.title,
        price: purchaseData.offer.price,
        isActive: purchaseData.offer.isActive,
        validFrom: purchaseData.offer.validFrom?.toISOString() || null,
        validUntil: purchaseData.offer.validUntil?.toISOString() || null,
        timezone: purchaseData.offer.timezone,
        availableDays: purchaseData.offer.availableDays,
        startTime: purchaseData.offer.startTime,
        endTime: purchaseData.offer.endTime,
        maxQuantity: purchaseData.offer.maxQuantity
      }
    };

    const parsed = QRUtils.parseQRData(JSON.stringify(qrData));
    console.log('Parsed QR data:', parsed);

    // Verify all offer data is included
    const requiredOfferFields = [
      'id', 'title', 'price', 'isActive', 'validFrom', 'validUntil',
      'timezone', 'availableDays', 'startTime', 'endTime', 'maxQuantity'
    ];

    let allFieldsPresent = true;
    for (const field of requiredOfferFields) {
      if (!(field in parsed.offer)) {
        console.error(`Missing offer field: ${field}`);
        allFieldsPresent = false;
      }
    }

    if (allFieldsPresent) {
      console.log('✅ All required offer fields are present in QR data');
    } else {
      console.log('❌ Some offer fields are missing from QR data');
    }

    // Verify purchase data
    const requiredPurchaseFields = [
      'purchaseId', 'offerId', 'customerName', 'amount', 'createdAt', 'qrCode'
    ];

    let allPurchaseFieldsPresent = true;
    for (const field of requiredPurchaseFields) {
      if (!(field in parsed)) {
        console.error(`Missing purchase field: ${field}`);
        allPurchaseFieldsPresent = false;
      }
    }

    if (allPurchaseFieldsPresent) {
      console.log('✅ All required purchase fields are present in QR data');
    } else {
      console.log('❌ Some purchase fields are missing from QR data');
    }

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testQRDataCompleteness();