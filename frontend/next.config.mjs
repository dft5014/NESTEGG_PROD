/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // Allow production builds to succeed even if there are ESLint errors.
    // This does NOT affect dev (npm run dev) — only the build step.
    ignoreDuringBuilds: true,
  },
  // Ensure environment variables are available at build time
  env: {
    KINDE_ISSUER_URL: process.env.KINDE_ISSUER_URL,
    KINDE_CLIENT_ID: process.env.KINDE_CLIENT_ID,
    KINDE_POST_LOGIN_REDIRECT_URL: process.env.KINDE_POST_LOGIN_REDIRECT_URL,
    KINDE_POST_LOGOUT_REDIRECT_URL: process.env.KINDE_POST_LOGOUT_REDIRECT_URL,
  },
  // Allow external images from Kinde (for user avatars, etc.)
  images: {
    domains: ['nestegg.kinde.com', 'gravatar.com'],
  },
  // Important: This ensures proper API route handling for Kinde
  async rewrites() {
    return [
      {
        source: '/api/auth/:path*',
        destination: '/api/auth/:path*',
      },
    ];
  },
};

export default nextConfig;