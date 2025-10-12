import type { NextConfig } from "next";

const wpBaseUrl = process.env.NEXT_PUBLIC_WP_BASE_URL;
const wpHostname = wpBaseUrl ? new URL(wpBaseUrl).hostname : undefined;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
        port: '',
        pathname: '/**',
      },
      ...(wpHostname ? [{ protocol: 'https', hostname: wpHostname, port: '', pathname: '/**' } as const] : []),
      { protocol: 'https', hostname: 'secure.gravatar.com', port: '', pathname: '/**' },
      { protocol: 'https', hostname: '0.gravatar.com', port: '', pathname: '/**' },
      { protocol: 'https', hostname: '1.gravatar.com', port: '', pathname: '/**' },
      { protocol: 'https', hostname: '2.gravatar.com', port: '', pathname: '/**' },
      { protocol: 'https', hostname: 'gravatar.com', port: '', pathname: '/**' },
      { protocol: 'https', hostname: 'i0.wp.com', port: '', pathname: '/**' },
      { protocol: 'https', hostname: 'i1.wp.com', port: '', pathname: '/**' },
      { protocol: 'https', hostname: 'i2.wp.com', port: '', pathname: '/**' },
    ],
  },
};

export default nextConfig;
