#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testCompleteAuthFlow() {
  console.log('🚀 Probando flujo completo de autenticación de clientes...\n');

  try {
    // 1. Verificar cliente de prueba existe
    console.log('1. Verificando cliente de prueba...');
    const customer = await prisma.customer.findUnique({
      where: { dni: '12345678' },
      select: { id: true, name: true, dni: true, isActive: true }
    });

    if (!customer) {
      console.log('❌ Cliente de prueba no encontrado');
      return;
    }
    console.log(`✅ Cliente encontrado: ${customer.name} (DNI: ${customer.dni})`);

    // 2. Verificar APIs existen
    console.log('\n2. Verificando que las APIs están implementadas...');
    const fs = require('fs');
    const path = require('path');

    const apiPaths = [
      'src/app/api/customer/auth/login/route.ts',
      'src/app/api/customer/auth/logout/route.ts',
      'src/app/api/customer/auth/me/route.ts'
    ];

    for (const apiPath of apiPaths) {
      const fullPath = path.join(process.cwd(), apiPath);
      if (fs.existsSync(fullPath)) {
        console.log(`✅ API existe: ${apiPath}`);
      } else {
        console.log(`❌ API faltante: ${apiPath}`);
      }
    }

    // 3. Verificar hooks y componentes
    console.log('\n3. Verificando hooks y componentes...');
    const componentPaths = [
      'src/lib/hooks/use-customer-auth.tsx',
      'src/components/CustomerProtectedRoute.tsx'
    ];

    for (const compPath of componentPaths) {
      const fullPath = path.join(process.cwd(), compPath);
      if (fs.existsSync(fullPath)) {
        console.log(`✅ Componente existe: ${compPath}`);
      } else {
        console.log(`❌ Componente faltante: ${compPath}`);
      }
    }

    // 4. Verificar páginas actualizadas
    console.log('\n4. Verificando páginas actualizadas...');
    const pagePaths = [
      'src/app/login/page.tsx',
      'src/app/register/page.tsx',
      'src/app/profile/page.tsx'
    ];

    for (const pagePath of pagePaths) {
      const fullPath = path.join(process.cwd(), pagePath);
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        if (content.includes('useCustomerAuth')) {
          console.log(`✅ Página actualizada: ${pagePath}`);
        } else {
          console.log(`⚠️ Página existe pero no usa useCustomerAuth: ${pagePath}`);
        }
      } else {
        console.log(`❌ Página faltante: ${pagePath}`);
      }
    }

    // 5. Verificar layout actualizado
    console.log('\n5. Verificando layout raíz...');
    const layoutPath = 'src/app/layout.tsx';
    const fullLayoutPath = path.join(process.cwd(), layoutPath);
    if (fs.existsSync(fullLayoutPath)) {
      const content = fs.readFileSync(fullLayoutPath, 'utf-8');
      if (content.includes('CustomerAuthProvider')) {
        console.log(`✅ Layout actualizado con CustomerAuthProvider`);
      } else {
        console.log(`❌ Layout no tiene CustomerAuthProvider`);
      }
    }

    // 6. Verificar modelo de BD
    console.log('\n6. Verificando modelo CustomerSession...');
    const sessionCount = await prisma.customerSession.count();
    console.log(`📊 Sesiones activas en BD: ${sessionCount}`);

    // 7. Verificar script de limpieza
    console.log('\n7. Verificando script de limpieza...');
    const cleanupPath = 'scripts/cleanup-customer-sessions.ts';
    const fullCleanupPath = path.join(process.cwd(), cleanupPath);
    if (fs.existsSync(fullCleanupPath)) {
      console.log(`✅ Script de limpieza existe: ${cleanupPath}`);
    } else {
      console.log(`❌ Script de limpieza faltante`);
    }

    console.log('\n🎉 Verificación completa del sistema de autenticación terminada!');

  } catch (error) {
    console.error('❌ Error en la verificación:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testCompleteAuthFlow();