/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable Turbopack if it's causing issues
  experimental: {
    // turbopack: false, // Uncomment if needed
  },
  swcMinify: true,
};

export default nextConfig;
