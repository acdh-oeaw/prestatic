import typographyPlugin from "@tailwindcss/typography";
import type { Config } from "tailwindcss";

const config: Config = {
	content: [
		"./keystatic.config.@(ts|tsx)",
		"./app/**/*.@(ts|tsx)",
		"./components/**/*.@(ts|tsx)",
		"./content/**/*.mdx",
	],
	plugins: [typographyPlugin],
};

export default config;
