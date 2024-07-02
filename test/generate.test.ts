import { join } from "node:path";

import { createFormatAwareProcessors } from "@mdx-js/mdx/internal-create-format-aware-processors";
import withGfm from "remark-gfm";
import { test } from "uvu";
import * as assert from "uvu/assert";
import type { VFile } from "vfile";

import { generate } from "../src/generate";
import keystaticConfig from "./fixtures/keystatic.config";

const cwd = join(import.meta.dirname, "fixtures");
const outputFolderPath = join(import.meta.dirname, ".content");

function compile(file: VFile): Promise<VFile> {
	const processor = createFormatAwareProcessors({
		remarkPlugins: [withGfm],
	});

	return processor.process(file);
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
