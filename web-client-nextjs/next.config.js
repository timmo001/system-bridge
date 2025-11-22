/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */
const nextConfig = {
	reactCompiler: true,
	reactStrictMode: true,
	output: process.env.STATIC_EXPORT ? "export" : undefined,
};

if (!process.env.STATIC_EXPORT) {
	nextConfig.rewrites = async () => {
		return [
			{
				source: "/app/settings.html",
				destination: "/settings",
			},
			{
				source: "/app/data.html",
				destination: "/data",
			},
		];
	};
}

export default nextConfig;
