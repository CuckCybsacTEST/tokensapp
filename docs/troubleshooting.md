# Troubleshooting / Local Dev

## 1. Error `Environment variable not found: DATABASE_URL`
**Síntoma:** Al abrir `/admin/tokens` (u otra página que hace queries) aparece un 500 y el log de Prisma:
```
PrismaClientInitializationError: error: Environment variable not found: DATABASE_URL.
```
**Causas probables:**
1. Aún no creaste el archivo `.env` (copiar desde `.env.example`).
2. Prisma Client fue generado antes de definir la variable y el binario nativo quedó cacheado.
3. (Windows) El proceso de `next dev` bloqueó el archivo `query_engine-windows.dll.node` impidiendo regenerar el client.

**Solución rápida:**
```powershell
# Crear/editar .env
Copy-Item .env.example .env -Force  # (si no existe)
# Edita DATABASE_URL si necesitas otra ruta

# Mata procesos node que bloqueen el engine
Get-Process node | Stop-Process -Force

# Regenera Prisma Client
npm run prisma:generate

# (Opcional) Sincroniza schema (solo si es nuevo)
npm run db:push

# Inicia dev
npm run dev
```

### Fallback en desarrollo
`src/lib/prisma.ts` aplica un fallback a `file:./prisma/dev.db` si `DATABASE_URL` está ausente **solo en desarrollo**. Esto evita el crash inicial, pero si el client se generó cuando faltaba la variable todavía podrías ver el error hasta regenerar. En producción no existe fallback: la app falla rápido si falta la variable (intencional).

### Prevención
- Tener `.env` listo antes de `npm install` (o justo después) y antes del primer `npm run dev`.
- Añadir un script `postinstall` que ejecute `prisma generate` (ver sección 3). 
- Evitar abrir varias sesiones `npm run dev` sobre el mismo workspace simultáneamente.

## 2. Error Windows `EPERM: operation not permitted, rename ... query_engine-windows.dll.node`
**Causa:** El DLL de Prisma está en uso (lock de Windows) mientras se intenta reemplazar durante `prisma generate` o `db push`.

**Solución:**
1. Cerrar el servidor (`Ctrl+C` en la terminal o detener la VS Code Task).
2. Asegurarte de que no quedan procesos `node.exe` activos (Administrador de tareas o:
   ```powershell
   Get-Process node | Stop-Process -Force
   ```
3. Ejecutar de nuevo:
   ```powershell
   npm run prisma:generate
   ```

## 3. Script `postinstall` recomendado
Para reducir incidencias agrega a `package.json`:
```jsonc
"scripts": {
  // ...otros scripts
  "postinstall": "prisma generate"
}
```
Esto asegura que tras instalar dependencias siempre dispones de un Prisma Client actualizado.

## 4. Resumen flujo limpio inicial
```powershell
Copy-Item .env.example .env
npm install
npm run db:push
npm run seed   # opcional
npm run dev
```

## 5. Checklist rápido cuando veas 500 + PrismaClientInitializationError
- [ ] `.env` existe y contiene `DATABASE_URL`
- [ ] No hay procesos `node.exe` viejos
- [ ] Corrí `npm run prisma:generate`
- [ ] Versión de Prisma en `package.json` coincide con @prisma/client
- [ ] (Si cambiaste provider) regeneraste y volviste a iniciar

## 6. ¿Por qué inyectamos la URL en el constructor?
Para que, una vez resuelta la URL (incluyendo fallback dev), el `PrismaClient` no dependa del lookup interno de `env()` al inicializar el engine. Esto hace más resiliente el arranque local aunque `.env` se haya creado después del primer intento, siempre que regeneres el client.

## 7. Problemas futuros esperables
| Síntoma | Acción |
|---------|--------|
| `DATABASE_URL` apunta a un archivo inexistente | Crear carpeta / corregir ruta; luego `db:push` |
| Migraciones nuevas no reflejadas | `npm run prisma:generate && npm run db:push` |
| Se cambió de SQLite a Turso/Postgres | Actualizar `.env`, ejecutar migraciones, regenerar client |
| Hot reload muestra aún el error viejo | Reiniciar `npm run dev` tras regenerar |

---
Si encuentras otro edge case, documentarlo aquí para fortalecer la DX del equipo.
