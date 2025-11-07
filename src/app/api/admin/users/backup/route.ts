import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getSessionCookieFromRequest, verifySessionCookie } from "@/lib/auth";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación de admin
    const cookie = getSessionCookieFromRequest(request);
    const session = await verifySessionCookie(cookie);

    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json(
        { error: "No autorizado - se requiere rol ADMIN" },
        { status: 401 }
      );
    }

    // Obtener todos los usuarios con información básica
    const users = await prisma.user.findMany({
      include: {
        person: true
      },
      orderBy: { createdAt: 'asc' }
    });

    // Obtener información de staff del restaurante por separado
    const staffMembers = await prisma.staff.findMany();
    const staffMap = new Map(staffMembers.map(s => [s.userId, s]));

    // Crear objeto de backup con metadatos
    const backup = {
      metadata: {
        generatedAt: new Date().toISOString(),
        generatedBy: session.role,
        totalUsers: users.length,
        description: "Backup completo de usuarios con información básica y de restaurante"
      },
      users: users.map(user => ({
        id: user.id,
        username: user.username,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        commitmentVersionAccepted: user.commitmentVersionAccepted,
        commitmentAcceptedAt: user.commitmentAcceptedAt,
        person: user.person ? {
          id: user.person.id,
          code: user.person.code,
          name: user.person.name,
          active: user.person.active,
          dni: user.person.dni,
          area: user.person.area,
          jobTitle: user.person.jobTitle,
          whatsapp: user.person.whatsapp,
          birthday: user.person.birthday,
          createdAt: user.person.createdAt,
          updatedAt: user.person.updatedAt
        } : null,
        // Información de restaurante si existe
        restaurantStaff: staffMap.get(user.id) ? {
          id: staffMap.get(user.id)!.id,
          role: staffMap.get(user.id)!.role,
          active: staffMap.get(user.id)!.active,
          zones: staffMap.get(user.id)!.zones,
          createdAt: staffMap.get(user.id)!.createdAt,
          updatedAt: staffMap.get(user.id)!.updatedAt
        } : null
      }))
    };

    // Devolver como JSON con headers para descarga
    return new NextResponse(JSON.stringify(backup, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="usuarios_backup_${new Date().toISOString().split('T')[0]}.json"`
      }
    });

  } catch (error) {
    console.error("Error generando backup de usuarios:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación de admin
    const cookie = getSessionCookieFromRequest(request);
    const session = await verifySessionCookie(cookie);

    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json(
        { error: "No autorizado - se requiere rol ADMIN" },
        { status: 401 }
      );
    }

    // Procesar el archivo multipart
    const formData = await request.formData();
    const file = formData.get('backup') as File;

    if (!file) {
      return NextResponse.json(
        { error: "No se encontró el archivo de backup" },
        { status: 400 }
      );
    }

    // Leer y parsear el archivo
    const text = await file.text();
    let backupData;
    try {
      backupData = JSON.parse(text);
    } catch (e) {
      return NextResponse.json(
        { error: "El archivo no contiene JSON válido" },
        { status: 400 }
      );
    }

    // Validar estructura
    if (!backupData.metadata || !backupData.users || !Array.isArray(backupData.users)) {
      return NextResponse.json(
        { error: "El archivo no tiene la estructura esperada de backup" },
        { status: 400 }
      );
    }

    console.log(`🔄 Iniciando restauración de ${backupData.users.length} usuarios...`);

    let processed = 0;
    let created = 0;
    let updated = 0;
    let errors = 0;

    // Procesar cada usuario
    for (const userData of backupData.users) {
      try {
        processed++;

        // Verificar si el usuario ya existe
        const existingUser = await prisma.user.findUnique({
          where: { username: userData.username },
          include: { person: true }
        });

        if (existingUser) {
          // Actualizar usuario existente (solo campos seguros)
          await prisma.user.update({
            where: { id: existingUser.id },
            data: {
              role: userData.role,
              commitmentVersionAccepted: userData.commitmentVersionAccepted || 0,
              commitmentAcceptedAt: userData.commitmentAcceptedAt ? new Date(userData.commitmentAcceptedAt) : null
            }
          });

          // Actualizar persona si existe
          if (existingUser.person && userData.person) {
            await prisma.person.update({
              where: { id: existingUser.person.id },
              data: {
                name: userData.person.name,
                area: userData.person.area,
                jobTitle: userData.person.jobTitle,
                whatsapp: userData.person.whatsapp,
                birthday: userData.person.birthday ? new Date(userData.person.birthday) : null,
                active: userData.person.active !== false // Default true
              }
            });
          }

          updated++;
        } else {
          // Crear nuevo usuario
          if (!userData.person) {
            console.warn(`⚠️ Usuario ${userData.username} no tiene datos de persona, saltando...`);
            continue;
          }

          // Crear persona primero
          const newPerson = await prisma.person.create({
            data: {
              code: userData.person.code,
              name: userData.person.name,
              dni: userData.person.dni,
              area: userData.person.area,
              jobTitle: userData.person.jobTitle,
              whatsapp: userData.person.whatsapp,
              birthday: userData.person.birthday ? new Date(userData.person.birthday) : null,
              active: userData.person.active !== false
            }
          });

          // Crear usuario
          const newUser = await prisma.user.create({
            data: {
              username: userData.username,
              passwordHash: "$2b$10$dummy.hash.for.restored.user", // Hash dummy, requerirá reset de password
              role: userData.role,
              personId: newPerson.id,
              commitmentVersionAccepted: userData.commitmentVersionAccepted || 0,
              commitmentAcceptedAt: userData.commitmentAcceptedAt ? new Date(userData.commitmentAcceptedAt) : null
            }
          });

          // Crear registro de staff si existe
          if (userData.restaurantStaff) {
            await prisma.staff.create({
              data: {
                userId: newUser.id,
                name: userData.person.name,
                role: userData.restaurantStaff.role,
                active: userData.restaurantStaff.active !== false,
                zones: userData.restaurantStaff.zones || []
              }
            });
          }

          created++;
        }

      } catch (error) {
        console.error(`❌ Error procesando usuario ${userData.username}:`, error);
        errors++;
      }
    }

    console.log(`✅ Restauración completada: ${processed} procesados, ${created} creados, ${updated} actualizados, ${errors} errores`);

    return NextResponse.json({
      success: true,
      processed,
      created,
      updated,
      errors,
      message: `Backup restaurado exitosamente. ${processed} usuarios procesados, ${created} creados, ${updated} actualizados${errors > 0 ? `, ${errors} errores` : ''}.`
    });

  } catch (error) {
    console.error("Error restaurando backup de usuarios:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
