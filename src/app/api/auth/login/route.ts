import { buildSetCookie, createSessionCookie, SessionRole } from "@/lib/auth";
import { logEvent } from "@/lib/log";
import { apiError, apiOk } from '@/lib/apiError';

// Definición de tipos para los usuarios
interface User {
  username: string;
  password: string;
  role: SessionRole;
}

// En una aplicación real, estas credenciales deberían estar en una base de datos
// o en variables de entorno seguras, no en el código fuente
const getDefaultUsers = (): User[] => {
  // Usuarios por defecto para desarrollo
  if (process.env.NODE_ENV !== "production") {
    return [
      {
        username: "admin",
        password: "admin-admin",
        role: "ADMIN"
      },
      {
        username: "staff",
        password: "staff-staff",
        role: "STAFF"
      }
    ];
  }
  
  // En producción, usar variables de entorno
  const adminUsername = process.env.ADMIN_USERNAME || "admin";
  const adminPassword = process.env.ADMIN_PASSWORD;
  
  if (!adminPassword) {
    console.error("ADVERTENCIA: ADMIN_PASSWORD no está configurada en el entorno de producción");
    return [];
  }
  
  return [
    {
      username: adminUsername,
      password: adminPassword,
      role: "ADMIN"
    }
  ];
};

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { username, password } = body;
  
  // Verificar que se proporcionaron credenciales
  if (!username || !password) {
    await logEvent("AUTH_FAIL", "Login admin fallido: credenciales incompletas", { ok: false });
    return apiError('INVALID_CREDENTIALS', 'Credenciales incompletas', { reason: 'MISSING_FIELDS' }, 401);
  }
  
  // Obtener usuarios válidos
  const users = getDefaultUsers();
  
  if (users.length === 0) {
    return apiError('ADMIN_CREDENTIALS_NOT_SET', 'Credenciales admin no configuradas', undefined, 500);
  }
  
  // Buscar usuario que coincida con las credenciales
  const user = users.find(u => u.username === username && u.password === password);
  
  if (!user) {
    await logEvent("AUTH_FAIL", "Login admin fallido: credenciales inválidas", { ok: false, username });
    return apiError('INVALID_CREDENTIALS', 'Credenciales inválidas', { username }, 401);
  }
  
  // Crear token de sesión con el rol correspondiente
  const token = await createSessionCookie(user.role);
  
  await logEvent("AUTH_SUCCESS", "Login admin exitoso", { username, role: user.role });
  
  return apiOk({ ok: true, role: user.role }, 200, { 'Set-Cookie': buildSetCookie(token) });
}
