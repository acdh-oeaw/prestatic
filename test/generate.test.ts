import { join } from "node:path";

import { compile } from "@mdx-js/mdx";
import withGfm from "remark-gfm";
import { test } from "uvu";
import * as assert from "uvu/assert";
import type { VFile } from "vfile";

import { generate } from "../src/generate";
import keystaticConfig from "./fixtures/keystatic.config";

const cwd = join(import.meta.dirname, "fixtures");
const outputFolderPath = join(import.meta.dirname, ".content");

async function processMdx(file: VFile) {
	const compiled = await compile(file, {
		remarkPlugins: [withGfm],
	});

	return compiled;
}

test("should run without throwing errors", () => {
	assert.not.throws(() => {
		return generate({
			cwd,
			keystaticConfig,
			outputFolderPath,
			processMdx,
		});
	});
});

test.run();
