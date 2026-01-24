#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';

async function testBasicAuthLogic() {
  console.log('🧪 Probando lógica básica de autenticación...\n');

  const prisma = new PrismaClient();

  try {
    // 1. Verificar que el cliente existe
    console.log('1. Verificando cliente de prueba...');
    const customer = await prisma.customer.findUnique({
      where: { dni: '12345678' }
    });

    if (customer) {
      console.log('✅ Cliente encontrado:', customer.name);
      console.log('   ID:', customer.id);
      console.log('   Activo:', customer.isActive);
      console.log('   Nivel:', customer.membershipLevel);
    } else {
      console.log('❌ Cliente no encontrado');
      return;
    }

    // 2. Verificar modelo CustomerSession
    console.log('\n2. Verificando modelo CustomerSession...');
    const sessionCount = await prisma.customerSession.count();
    console.log(`📊 Sesiones totales en BD: ${sessionCount}`);

    // 3. Probar creación de sesión manual
    console.log('\n3. Creando sesión de prueba manualmente...');
    const sessionToken = 'test_session_' + Date.now();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const session = await prisma.customerSession.create({
      data: {
        customerId: customer.id,
        sessionToken,
        expiresAt,
        ipAddress: '127.0.0.1',
        userAgent: 'TestAgent/1.0'
      }
    });

    console.log('✅ Sesión creada:', session.id);
    console.log('   Token:', session.sessionToken);
    console.log('   Expira:', session.expiresAt);

    // 4. Verificar que se puede buscar la sesión
    console.log('\n4. Buscando sesión por token...');
    const foundSession = await prisma.customerSession.findUnique({
      where: { sessionToken },
      include: { customer: true }
    });

    if (foundSession) {
      console.log('✅ Sesión encontrada');
      console.log('   Cliente:', foundSession.customer.name);
      console.log('   DNI:', foundSession.customer.dni);
    } else {
      console.log('❌ Sesión no encontrada');
    }

    // 5. Limpiar sesión de prueba
    console.log('\n5. Limpiando sesión de prueba...');
    await prisma.customerSession.delete({
      where: { id: session.id }
    });
    console.log('✅ Sesión eliminada');

    // 6. Ejecutar script de limpieza
    console.log('\n6. Ejecutando script de limpieza de sesiones...');
    const { cleanupExpiredSessions } = await import('./cleanup-customer-sessions.ts');
    await cleanupExpiredSessions();

    console.log('\n🎉 Todas las pruebas básicas pasaron!');

  } catch (error) {
    console.error('❌ Error en las pruebas:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testBasicAuthLogic();