import node from "@astrojs/node";
import react from "@astrojs/react";
import keystatic from "@keystatic/astro";
import { defineConfig } from "astro/config";

export default defineConfig({
	adapter: node({
		mode: "standalone",
	}),
	integrations: [keystatic(), react()],
	output: "hybrid",
	server: {
		port: 3000,
	},
});
