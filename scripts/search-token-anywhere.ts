#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function searchTokenAnywhere() {
  console.log('🔍 Búsqueda amplia del token E6E60B5F92F4AA13 en toda la BD\n');

  const searchValue = 'E6E60B5F92F4AA13';

  try {
    // Obtener todos los modelos disponibles
    const models = Object.keys(prisma).filter(key =>
      !key.startsWith('$') && !key.startsWith('_') && typeof prisma[key as keyof typeof prisma] === 'object'
    );

    console.log('Modelos disponibles:', models);

    for (const modelName of models) {
      try {
        const model = (prisma as any)[modelName];

        // Intentar buscar por campos de texto comunes
        const textFields = ['signature', 'qrCode', 'shortCode', 'id', 'key', 'label', 'description'];

        for (const field of textFields) {
          try {
            if (model.fields && model.fields[field]) {
              const results = await model.findMany({
                where: {
                  [field]: {
                    contains: searchValue
                  }
                },
                select: {
                  id: true,
                  [field]: true,
                  expiresAt: true
                },
                take: 5
              });

              if (results.length > 0) {
                console.log(`✅ Encontrado en ${modelName}.${field}:`);
                results.forEach(result => {
                  console.log(`   ID: ${result.id}, ${field}: ${result[field]}, expiresAt: ${result.expiresAt?.toISOString().split('T')[0] || 'N/A'}`);
                });
                console.log('');
              }
            }
          } catch (error) {
            // Ignorar errores de campos que no existen
          }
        }
      } catch (error) {
        // Ignorar errores de modelos que no se pueden consultar de esta manera
      }
    }

    // Búsqueda específica en las tablas que sabemos que existen
    console.log('🔍 Búsqueda específica en tablas conocidas...');

    // Buscar en todas las tablas que podrían tener tokens
    const tablesToCheck = ['token', 'reusableToken', 'prize', 'reusablePrize', 'batch'];

    for (const table of tablesToCheck) {
      try {
        console.log(`\nBuscando en ${table}...`);
        const records = await (prisma as any)[table].findMany({
          take: 10
        });

        console.log(`   Total registros en ${table}: ${records.length}`);

        // Mostrar algunos ejemplos
        if (records.length > 0) {
          console.log('   Ejemplos:');
          records.slice(0, 3).forEach((record: any, index: number) => {
            console.log(`     ${index + 1}. ID: ${record.id}, Signature: ${record.signature || 'N/A'}`);
          });
        }
      } catch (error) {
        console.log(`   Error en ${table}: ${error.message}`);
      }
    }

  } catch (error) {
    console.error('❌ Error general:', error);
  } finally {
    await prisma.$disconnect();
  }
}

searchTokenAnywhere();