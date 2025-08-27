/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
    eslint: {
    // Allow production builds to succeed even if there are ESLint errors.
    // This does NOT affect dev (npm run dev) — only the build step.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
