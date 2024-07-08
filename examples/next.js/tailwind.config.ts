import type { Config } from "tailwindcss";

const config: Config = {
	content: [
		"./keystatic.config.@(ts|tsx)",
		"./app/**/*.@(ts|tsx)",
		"./components/**/*.@(ts|tsx)",
		"./content/**/*.mdx",
	],
};

export default config;
