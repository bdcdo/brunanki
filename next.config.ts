import type { NextConfig } from "next";

// Substituem o antigo public/_headers, que era convenção de Cloudflare Pages e
// não é lido por nada fora dela. A doc do Next garante que headers() vale
// também para arquivos de /public: as regras são checadas antes do filesystem.
const securityHeaders = [
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()"
  }
];

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    unoptimized: true
  },
  async headers() {
    return [
      // A regra genérica vem primeiro porque, em cabeçalhos repetidos, o último
      // a casar vence — assim /flags/* consegue definir o próprio Cache-Control.
      { source: "/:path*", headers: securityHeaders },
      {
        source: "/flags/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800"
          },
          { key: "X-Content-Type-Options", value: "nosniff" }
        ]
      }
      // O bloco /_next/static/* do _headers antigo não foi portado: o Next já
      // aplica `public, max-age=31536000, immutable` nesses assets e não
      // permite sobrescrever esse cabeçalho por aqui.
    ];
  }
};

export default nextConfig;
