/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  eslint: {
    // Permitir build aunque existan errores de lint (para smoke tests rápidos)
    ignoreDuringBuilds: true,
  },
  async redirects() {
    return [
      {
        source: '/redeem/:path*',
        destination: '/r/:path*',
        permanent: false, // 307/308 temporary to avoid caching wrong path forever
      },
    ];
  },
};
export default nextConfig;
