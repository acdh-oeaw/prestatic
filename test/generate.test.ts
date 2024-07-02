import { join } from "node:path";

import { compile as _compile } from "@mdx-js/mdx";
import withGfm from "remark-gfm";
import { test } from "uvu";
import * as assert from "uvu/assert";
import type { VFile } from "vfile";

import { generate } from "../src/generate";
import keystaticConfig from "./fixtures/keystatic.config";

const cwd = join(import.meta.dirname, "fixtures");
const outputFolderPath = join(import.meta.dirname, ".content");

function compile(file: VFile): Promise<VFile> {
	return _compile(file, {
		remarkPlugins: [withGfm],
	});
}

test("should run without throwing errors", () => {
	assert.not.throws(() => {
		return generate({
			compile,
			cwd,
			keystaticConfig,
			outputFolderPath,
		});
	});
});

test.run();
