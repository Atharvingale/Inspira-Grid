/** @type {import('next').NextConfig} */
const nextConfig = {
  // Fix the workspace root warning
  outputFileTracingRoot: require('path').join(__dirname, '../'),
  
  // Ensure proper handling of TypeScript
  typescript: {
    // Allow production builds to complete even if there are type errors
    ignoreBuildErrors: false,
  },

  // Enable React strict mode
  reactStrictMode: true,

  // Configure images if needed
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
    ],
  },

  // Webpack configuration for better compatibility
  webpack: (config, { isServer }) => {
    // Fix for socket.io client
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        net: false,
        tls: false,
      };
    }
    
    return config;
  },
};

module.exports = nextConfig;
