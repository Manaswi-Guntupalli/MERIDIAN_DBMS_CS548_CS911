import path from 'node:path';
import { fileURLToPath } from 'node:url';
/** @type {import('next').NextConfig} */
const config = {
  outputFileTracingRoot: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'),
  async rewrites() {
    const backend = process.env.API_ORIGIN || 'http://127.0.0.1:4000';
    return [
      { source: '/api/:path*', destination: `${backend}/api/:path*` },
      { source: '/socket.io/:path*', destination: `${backend}/socket.io/:path*` },
    ];
  },
};
export default config;
