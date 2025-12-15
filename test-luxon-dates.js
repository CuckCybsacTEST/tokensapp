// Script para probar el manejo de fechas con Luxon en zona horaria de América Latina
import { DateTime } from 'luxon';

console.log('=== PRUEBA DE MANEJO DE FECHAS CON LUXON ===');

// Fecha actual en zona horaria de Lima
const now = DateTime.now().setZone('America/Lima');
console.log('Fecha actual en Lima:', now.toString());
console.log('Fecha actual formateada:', now.toLocaleString(DateTime.DATETIME_FULL));

// Fecha específica en zona horaria de Lima
const testDate = DateTime.fromISO('2025-12-22T23:59:59', { zone: 'America/Lima' });
console.log('Fecha de prueba (22 dic 2025):', testDate.toString());
console.log('Fecha de prueba formateada:', testDate.toLocaleString(DateTime.DATE_SHORT));

// Convertir a JS Date para verificar compatibilidad con Prisma
const jsDate = testDate.toJSDate();
console.log('Convertida a JS Date:', jsDate.toISOString());

// Verificar que la fecha se mantenga correcta
const backToLuxon = DateTime.fromJSDate(jsDate).setZone('America/Lima');
console.log('De vuelta a Luxon:', backToLuxon.toString());
console.log('¿Son iguales?', testDate.equals(backToLuxon));

// Formato para inputs HTML (yyyy-MM-dd)
console.log('Formato para input date:', testDate.toFormat('yyyy-MM-dd'));

console.log('=== PRUEBA COMPLETADA ===');