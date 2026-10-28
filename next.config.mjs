/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // The Rust-free Prisma client loads its query compiler (a .wasm file) at runtime.
    // Next's file tracing can't see that dynamic read, so ship it with every server function.
    outputFileTracingIncludes: {
      "/**/*": ["./node_modules/.prisma/client/*.wasm", "./node_modules/.prisma/client/*.mjs"],
    },
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com", pathname: "/**" }],
  },
};

export default nextConfig;
