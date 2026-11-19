import type { NextConfig } from "next";

const fallbackApiProxyUrl = "http://localhost:8002";
const configuredApiProxyUrl = process.env.API_PROXY_URL?.trim();

function resolveApiProxyUrl(value: string | undefined): string {
  if (!value) return fallbackApiProxyUrl;

  try {
    const url = new URL(value);
    if ((url.protocol === "http:" || url.protocol === "https:") && url.hostname) {
      return value.replace(/\/+$/, "");
    }
  } catch {
    // Use the local API default when the environment value is incomplete,
    // such as `https` without a hostname.
  }

  console.warn(
    `Invalid API_PROXY_URL "${value}"; using ${fallbackApiProxyUrl}.`,
  );
  return fallbackApiProxyUrl;
}

const apiProxyUrl = resolveApiProxyUrl(configuredApiProxyUrl);

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiProxyUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
