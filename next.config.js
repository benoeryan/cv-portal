const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack: (config) => {
    config.resolve.alias['firebase/firestore'] = path.resolve(__dirname, 'src/lib/firebase.js');
    config.resolve.alias['firebase/auth'] = path.resolve(__dirname, 'src/lib/firebase.js');
    config.resolve.alias['firebase/storage'] = path.resolve(__dirname, 'src/lib/firebase.js');
    config.resolve.alias['@/lib/firebase'] = path.resolve(__dirname, 'src/lib/firebase.js');
    return config;
  },
};

module.exports = nextConfig;
