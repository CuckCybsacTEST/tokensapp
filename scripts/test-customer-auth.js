#!/usr/bin/env node

const http = require('http');

function makeRequest(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testCustomerAuth() {
  console.log('🧪 Probando sistema de autenticación de clientes...\n');

  try {
    // 1. Intentar login con DNI válido
    console.log('1. Probando login con DNI 12345678...');
    const loginResponse = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/customer/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, { dni: '12345678' });

    console.log('Status:', loginResponse.status);
    console.log('Response:', JSON.stringify(loginResponse.data, null, 2));

    if (loginResponse.status === 200 && loginResponse.data.ok) {
      console.log('✅ Login exitoso\n');

      // 2. Probar endpoint /me para obtener info del cliente
      console.log('2. Probando endpoint /me...');
      const meResponse = await makeRequest({
        hostname: 'localhost',
        port: 3000,
        path: '/api/customer/auth/me',
        method: 'GET',
        headers: {
          'Cookie': loginResponse.data.cookie || ''
        }
      });

      console.log('Status:', meResponse.status);
      console.log('Response:', JSON.stringify(meResponse.data, null, 2));

      if (meResponse.status === 200) {
        console.log('✅ Endpoint /me funciona correctamente\n');
      } else {
        console.log('❌ Error en endpoint /me\n');
      }

      // 3. Probar logout
      console.log('3. Probando logout...');
      const logoutResponse = await makeRequest({
        hostname: 'localhost',
        port: 3000,
        path: '/api/customer/auth/logout',
        method: 'POST',
        headers: {
          'Cookie': loginResponse.data.cookie || ''
        }
      });

      console.log('Status:', logoutResponse.status);
      console.log('Response:', JSON.stringify(logoutResponse.data, null, 2));

      if (logoutResponse.status === 200) {
        console.log('✅ Logout exitoso\n');
      } else {
        console.log('❌ Error en logout\n');
      }

    } else {
      console.log('❌ Login falló\n');
    }

    // 4. Probar login con DNI inválido
    console.log('4. Probando login con DNI inválido...');
    const invalidLoginResponse = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/customer/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, { dni: '99999999' });

    console.log('Status:', invalidLoginResponse.status);
    console.log('Response:', JSON.stringify(invalidLoginResponse.data, null, 2));

    if (invalidLoginResponse.status === 404) {
      console.log('✅ Validación correcta para DNI no encontrado\n');
    } else {
      console.log('❌ Validación incorrecta\n');
    }

  } catch (error) {
    console.error('❌ Error en las pruebas:', error.message);
  }
}

testCustomerAuth();