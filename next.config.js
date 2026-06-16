/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // better-sqlite3 es un módulo nativo: se externaliza para que Next no intente
  // bundlearlo en el servidor (Next 14 usa experimental.serverComponentsExternalPackages).
  experimental: {
    serverComponentsExternalPackages: ['better-sqlite3'],
  },
  webpack: (config) => {
    config.externals.push({ 'better-sqlite3': 'commonjs better-sqlite3' });
    return config;
  },
};

module.exports = nextConfig;
