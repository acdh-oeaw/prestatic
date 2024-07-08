import { join } from "node:path";

import { log } from "@acdh-oeaw/lib";
import { build, type CompilerOptions } from "@acdh-oeaw/prestatic-core";
import { createReader } from "@keystatic/core/reader";

import keystaticConfig from "../keystatic.config";

interface Stats {
	time: string;
}

async function run(): Promise<Stats> {
	const basePath = join(import.meta.dirname, "..");
	const reader = createReader(basePath, keystaticConfig);
	const compiler: CompilerOptions = {
		elementAttributeNameCase: "html",
		jsxImportSource: "astro",
	};

	// await rm(join(basePath, config.outputFolderName), { force: true, recursive: true });

	const start = performance.now();
	await build({ compiler, reader });
	const end = performance.now();

	return { time: (end - start).toFixed(2) };
}

run()
	.then((stats) => {
		log.success(`Successfully processed content in ${stats.time}ms.`);
	})
	.catch((error: unknown) => {
		log.error("Failed to process content.\n", String(error));
	});
