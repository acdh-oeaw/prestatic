import type { Config } from "tailwindcss";

const config: Config = {
	content: ["./keystatic.config.@(ts|tsx)", "./src/**/*.@(astro|ts|tsx)", "./content/**/*.mdx"],
};

export default config;
