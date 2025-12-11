#!/usr/bin/env tsx

/**
 * Script de prueba para el Sistema de QR Personalizados
 * Verifica funcionamiento básico de utilidades y APIs
 */

import { generateQrCode, generateSignature, verifySignature, isValidPeruvianWhatsapp, normalizeWhatsapp, isValidName } from '../src/lib/qr-custom';

async function testQrCustomSystem() {
  console.log('🧪 Probando Sistema de QR Personalizados...\n');

  // Test 1: Generación de códigos únicos
  console.log('1. Generando códigos QR únicos...');
  const codes = new Set();
  for (let i = 0; i < 10; i++) {
    const code = generateQrCode();
    codes.add(code);
  }
  console.log(`✅ Generados ${codes.size} códigos únicos`);

  // Test 2: Validación de nombres
  console.log('\n2. Probando validación de nombres...');
  const validNames = ['Ana María López', 'Juan Carlos Pérez', 'María José García'];
  const invalidNames = ['Ana', 'Juan', 'A B', '123'];

  validNames.forEach(name => {
    if (isValidName(name)) {
      console.log(`✅ "${name}" - Válido`);
    } else {
      console.log(`❌ "${name}" - Inválido`);
    }
  });

  invalidNames.forEach(name => {
    if (!isValidName(name)) {
      console.log(`✅ "${name}" - Correctamente rechazado`);
    } else {
      console.log(`❌ "${name}" - Incorrectamente aceptado`);
    }
  });

  // Test 3: Validación de WhatsApp peruano
  console.log('\n3. Probando validación de WhatsApp peruano...');
  const validPhones = ['999999999', '+51999999999', '51999999999'];
  const invalidPhones = ['99999999', '+5199999999', '123456789', '+123456789'];

  validPhones.forEach(phone => {
    if (isValidPeruvianWhatsapp(phone)) {
      console.log(`✅ "${phone}" - Válido`);
    } else {
      console.log(`❌ "${phone}" - Inválido`);
    }
  });

  invalidPhones.forEach(phone => {
    if (!isValidPeruvianWhatsapp(phone)) {
      console.log(`✅ "${phone}" - Correctamente rechazado`);
    } else {
      console.log(`❌ "${phone}" - Incorrectamente aceptado`);
    }
  });

  // Test 4: Normalización de WhatsApp
  console.log('\n4. Probando normalización de WhatsApp...');
  const testPhones = [
    { input: '999999999', expected: '51999999999' },
    { input: '+51999999999', expected: '51999999999' },
    { input: '51999999999', expected: '51999999999' }
  ];

  testPhones.forEach(({ input, expected }) => {
    const normalized = normalizeWhatsapp(input);
    if (normalized === expected) {
      console.log(`✅ "${input}" → "${normalized}"`);
    } else {
      console.log(`❌ "${input}" → "${normalized}" (esperado: "${expected}")`);
    }
  });

  // Test 5: Firma HMAC
  console.log('\n5. Probando firma HMAC...');
  const testData = {
    customerName: 'Ana María López',
    customerWhatsapp: '51999999999',
    theme: 'default',
    timestamp: new Date().toISOString()
  };

  const code = generateQrCode();
  const signature = generateSignature(code, testData);

  console.log(`Código: ${code}`);
  console.log(`Firma: ${signature.substring(0, 20)}...`);

  // Verificar firma
  const isValid = verifySignature(code, testData, signature);
  if (isValid) {
    console.log('✅ Firma HMAC válida');
  } else {
    console.log('❌ Firma HMAC inválida');
  }

  // Test 6: Verificar manipulación
  console.log('\n6. Probando detección de manipulación...');
  const tamperedData = { ...testData, customerName: 'Manipulado' };
  const isTamperedValid = verifySignature(code, tamperedData, signature);
  if (!isTamperedValid) {
    console.log('✅ Manipulación detectada correctamente');
  } else {
    console.log('❌ Manipulación no detectada');
  }

  console.log('\n🎉 Pruebas completadas!');
  console.log('\n📝 Próximos pasos:');
  console.log('1. Ejecutar migración: npx prisma db push');
  console.log('2. Iniciar servidor: npm run dev');
  console.log('3. Probar generador: http://localhost:3000/qr-generator');
  console.log('4. Probar admin: http://localhost:3000/admin/sorteos-qr');
}

// Ejecutar pruebas
testQrCustomSystem().catch(console.error);