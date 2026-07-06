import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "browserslist": false,
    }
    return config
  },
}

export default nextConfig
