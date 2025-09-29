/** @type {import('next').NextConfig} */
const nextConfig = {
  // Fix the workspace root warning
  outputFileTracingRoot: require('path').join(__dirname, '../'),
  
  // Ensure proper handling of TypeScript
  typescript: {
    // Allow production builds to complete even if there are type errors
    ignoreBuildErrors: true,
  },
  
  // Handle ESLint errors during build
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
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
  webpack: (config, { isServer, dev }) => {
    // Fix for socket.io client
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        net: false,
        tls: false,
      };
    }
    
    // In development, add additional optimizations
    if (dev) {
      // Reduce bundle size by excluding socket.io when disabled
      if (process.env.NEXT_PUBLIC_DISABLE_SOCKET === 'true') {
        config.resolve.alias = {
          ...config.resolve.alias,
          'socket.io-client': false,
        };
      }
    }
    
    return config;
  },

  // Development-specific settings
  ...(process.env.NODE_ENV === 'development' && {
    // Reduce development server logging
    onDemandEntries: {
      // Period (in ms) where the server will keep pages in the buffer
      maxInactiveAge: 25 * 1000,
      // Number of pages that should be kept simultaneously without being disposed
      pagesBufferLength: 2,
    },
  }),
};

module.exports = nextConfig;