# 📸 Subida de Imágenes Reales para Tokens QR

Este directorio es para colocar las imágenes reales que quieres subir para los siguientes tokens:

## 🎯 Tokens a procesar:

1. **C1ED7C2BDD9C9CEE7C1289EDD571FFFE** - Rogger Antony Echevarría espinoza
2. **56DA118D2FDD92FFF10F9C9D7EF06094** - Juan carlos anco sanchez
3. **BD11A22C7C079BB3C00BB8F091C92D54** - Judith Julissa Miguel Picoy
4. **B2A85941ABA935800B03BDACA2890C8A** - Clidmer Briand Trujillo Palacios

## 📁 Instrucciones:

1. **Coloca las imágenes** en este directorio con nombres exactos:
   - `C1ED7C2BDD9C9CEE7C1289EDD571FFFE.jpg` (o .png, .jpeg, .webp)
   - `56DA118D2FDD92FFF10F9C9D7EF06094.jpg`
   - `BD11A22C7C079BB3C00BB8F091C92D54.jpg`
   - `B2A85941ABA935800B03BDACA2890C8A.jpg`

2. **Ejecuta el script**:
   ```bash
   npm run upload:real-images
   ```

3. **El script procesará**:
   - Optimización automática de imágenes
   - Subida a Supabase Storage
   - Actualización de URLs en base de datos
   - Limpieza de archivos temporales

## ✅ Resultado:

- Las imágenes estarán disponibles en Supabase con URLs públicas
- Se mostrarán correctamente en el frontend
- No más errores ENOENT

## 🗑️ Después de usar:

Este directorio y su contenido serán eliminados automáticamente después del procesamiento.