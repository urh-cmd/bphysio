/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  experimental: {
    proxyClientMaxBodySize: "200mb",
    // Verarbeitung dauert mehrere Minuten – Proxy darf nicht nach 30s timeouten
    proxyTimeout: 300000, // 5 Minuten
  },
  async rewrites() {
    // Proxy-Ziel – 127.0.0.1 vermeidet IPv6-Probleme (localhost → ::1)
    const backendUrl =
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      "http://127.0.0.1:8001";
    return [
      { source: "/api/:path*", destination: `${backendUrl}/api/:path*` },
      { source: "/health/:path*", destination: `${backendUrl}/health/:path*` },
    ];
  },
};

module.exports = nextConfig;
