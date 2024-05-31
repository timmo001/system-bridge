/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === "production";

let internalHost = null;

if (!isProd) {
  const { internalIpV4 } = await import("internal-ip");
  internalHost = await internalIpV4();
}

const nextConfig = {
  // Ensure Next.js uses SSG instead of SSR
  // https://nextjs.org/docs/pages/building-your-application/deploying/static-exports
  output: "export",
  // Note: This feature is required to use the Next.js Image component in SSG mode.
  // See https://nextjs.org/docs/messages/export-image-api for different workarounds.
  images: {
    unoptimized: true,
  },
  // Configure assetPrefix or else the server won't properly resolve your assets.
  assetPrefix: isProd ? null : `http://${internalHost}:3000`,
};

export default nextConfig;
