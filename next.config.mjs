/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // Permitir build aunque existan errores de lint (para smoke tests rápidos)
    ignoreDuringBuilds: true,
  },
};
export default nextConfig;
