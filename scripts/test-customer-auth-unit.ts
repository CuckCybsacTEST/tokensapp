#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';

// Simular request/response para testing
class MockRequest {
  constructor(public body: any, public cookies: any = {}) {}

  async json() {
    return this.body;
  }

  get ip() {
    return '127.0.0.1';
  }

  get headers() {
    return {
      get: (name: string) => {
        if (name === 'user-agent') return 'TestAgent/1.0';
        if (name === 'x-forwarded-for') return '127.0.0.1';
        return null;
      }
    };
  }
}

class MockResponse {
  public statusCode: number = 200;
  public data: any = null;
  public headers: Record<string, string> = {};

  status(code: number) {
    this.statusCode = code;
    return this;
  }

  json(data: any) {
    this.data = data;
    return this;
  }

  setHeader(name: string, value: string) {
    this.headers[name] = value;
    return this;
  }
}

async function testCustomerAuthAPIs() {
  console.log('🧪 Probando APIs de autenticación de clientes...\n');

  const prisma = new PrismaClient();

  try {
    // Importar las funciones de las rutas API
    const { POST: loginHandler } = await import('../src/app/api/customer/auth/login/route.ts');
    const { GET: meHandler } = await import('../src/app/api/customer/auth/me/route.ts');
    const { POST: logoutHandler } = await import('../src/app/api/customer/auth/logout/route.ts');

    // 1. Test login con DNI válido
    console.log('1. Probando login con DNI válido (12345678)...');
    const loginReq = new MockRequest({ dni: '12345678' });
    const loginRes = new MockResponse();

    await loginHandler(loginReq as any, loginRes as any);

    console.log('Status:', loginRes.statusCode);
    console.log('Response:', JSON.stringify(loginRes.data, null, 2));

    if (loginRes.statusCode === 200 && loginRes.data.ok) {
      console.log('✅ Login exitoso\n');

      // Extraer session token de la respuesta
      const setCookieHeader = loginRes.headers['Set-Cookie'];
      const sessionToken = setCookieHeader ? setCookieHeader.match(/customer_session=([^;]+)/)?.[1] : null;

      if (sessionToken) {
        console.log('📋 Session token obtenido\n');

        // 2. Test endpoint /me
        console.log('2. Probando endpoint /me...');
        const meReq = {
          cookies: { get: (name: string) => name === 'customer_session' ? sessionToken : null }
        };
        const meRes = new MockResponse();

        await meHandler(meReq as any, meRes as any);

        console.log('Status:', meRes.statusCode);
        console.log('Response:', JSON.stringify(meRes.data, null, 2));

        if (meRes.statusCode === 200 && meRes.data.customer) {
          console.log('✅ Endpoint /me funciona correctamente\n');
        } else {
          console.log('❌ Error en endpoint /me\n');
        }

        // 3. Test logout
        console.log('3. Probando logout...');
        const logoutReq = {
          cookies: { get: (name: string) => name === 'customer_session' ? sessionToken : null }
        };
        const logoutRes = new MockResponse();

        await logoutHandler(logoutReq as any, logoutRes as any);

        console.log('Status:', logoutRes.statusCode);
        console.log('Response:', JSON.stringify(logoutRes.data, null, 2));

        if (logoutRes.statusCode === 200) {
          console.log('✅ Logout exitoso\n');
        } else {
          console.log('❌ Error en logout\n');
        }

      } else {
        console.log('❌ No se pudo obtener session token\n');
      }

    } else {
      console.log('❌ Login falló\n');
    }

    // 4. Test login con DNI inválido
    console.log('4. Probando login con DNI inválido (99999999)...');
    const invalidLoginReq = new MockRequest({ dni: '99999999' });
    const invalidLoginRes = new MockResponse();

    await loginHandler(invalidLoginReq as any, invalidLoginRes as any);

    console.log('Status:', invalidLoginRes.statusCode);
    console.log('Response:', JSON.stringify(invalidLoginRes.data, null, 2));

    if (invalidLoginRes.statusCode === 404) {
      console.log('✅ Validación correcta para DNI no encontrado\n');
    } else {
      console.log('❌ Validación incorrecta\n');
    }

    // 5. Verificar que la sesión se creó en la base de datos
    console.log('5. Verificando sesiones en base de datos...');
    const sessions = await prisma.customerSession.findMany({
      where: { customer: { dni: '12345678' } }
    });

    console.log(`📊 Sesiones encontradas: ${sessions.length}`);
    if (sessions.length > 0) {
      console.log('✅ Sesión creada correctamente en BD\n');
    } else {
      console.log('❌ No se encontró sesión en BD\n');
    }

    console.log('🎉 Pruebas completadas!');

  } catch (error) {
    console.error('❌ Error en las pruebas:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testCustomerAuthAPIs();