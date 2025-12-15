// Script para verificar que las políticas se migraron correctamente
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Verificando migración de políticas...\n');

  const policies = await prisma.customQrPolicy.findMany({
    select: {
      id: true,
      name: true,
      defaultExpiryDate: true,
      extensionExpiryDate: true,
      maxExtensions: true,
      isActive: true
    }
  });

  console.log('Políticas encontradas:');
  policies.forEach(policy => {
    console.log(`\n📋 ${policy.name} (${policy.id})`);
    console.log(`   Activa: ${policy.isActive ? '✅' : '❌'}`);
    console.log(`   Expira por defecto: ${policy.defaultExpiryDate ? policy.defaultExpiryDate.toLocaleDateString('es-PE') : 'Sin fecha'}`);
    console.log(`   Nueva fecha al extender: ${policy.extensionExpiryDate ? policy.extensionExpiryDate.toLocaleDateString('es-PE') : 'Sin fecha'}`);
    console.log(`   Máx extensiones: ${policy.maxExtensions}`);
  });

  // Verificar que no queden campos antiguos
  const oldFields = await prisma.$queryRaw`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'CustomQrPolicy'
    AND column_name IN ('defaultExpiryDays', 'extensionDays')
  `;

  console.log(`\n🔍 Campos antiguos encontrados: ${Array.isArray(oldFields) ? oldFields.length : 0}`);

  if (Array.isArray(oldFields) && oldFields.length > 0) {
    console.log('⚠️  ADVERTENCIA: Aún existen campos antiguos en la base de datos');
  } else {
    console.log('✅ Migración completada correctamente');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());