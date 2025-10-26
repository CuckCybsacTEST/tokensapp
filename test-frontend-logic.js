const { DateTime } = require('luxon');

// Simular exactamente lo que hace el frontend
const tokenExpiresAt = '2025-10-27T04:59:59.999Z';
const hostArrivedAt = null;

console.log('=== SIMULACIÓN DEL FRONTEND ===');
console.log('token.expiresAt:', tokenExpiresAt);
console.log('hostArrivedAt:', hostArrivedAt);
console.log('hostArrivedAt (booleano):', !!hostArrivedAt);

if (hostArrivedAt) {
  console.log('✅ Mostraría hora exacta');
  const expiresAtLima = DateTime.fromJSDate(new Date(tokenExpiresAt)).setZone('America/Lima');
  console.log('Hora mostrada:', expiresAtLima.toLocaleString(DateTime.DATETIME_SHORT, { locale: 'es-ES' }));
} else {
  console.log('⚠️  Mostraría: "45 min después de llegada del cumpleañero"');
}

// Verificar conversión de zona horaria
console.log('\n=== CONVERSIÓN DE ZONA HORARIA ===');
const utcDate = new Date(tokenExpiresAt);
console.log('Fecha UTC:', utcDate.toISOString());
const limaDate = DateTime.fromJSDate(utcDate).setZone('America/Lima');
console.log('Fecha Lima:', limaDate.toISO());
console.log('Fecha Lima (formateada):', limaDate.toLocaleString(DateTime.DATETIME_SHORT, { locale: 'es-ES' }));