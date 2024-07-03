import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { assert, pick } from "@acdh-oeaw/lib";
import type { Collection, ComponentSchema, Config, Singleton } from "@keystatic/core";
import { createReader } from "@keystatic/core/reader";
import { VFile } from "vfile";

import { sanitize } from "./sanitize";
import { transform } from "./transform";

interface CollectContentFieldsParams {
	contentFields: Array<string>;
	path?: string | undefined;
	schema: Record<string, ComponentSchema>;
}

function collectContentFields(params: CollectContentFieldsParams): void {
	const { contentFields, path, schema } = params;

	for (const [fieldName, fieldConfig] of Object.entries(schema)) {
		switch (fieldConfig.kind) {
			case "array": {
				collectContentFields({
					contentFields,
					path,
					schema: { [`${fieldName}[]`]: fieldConfig.element },
				});
				break;
			}

			case "child": {
				throw new Error("Not yet implemented.");
			}

			case "conditional": {
				throw new Error("Not yet implemented.");
			}

			case "form": {
				if (fieldConfig.formKind === "content") {
					contentFields.push(path != null ? [path, fieldName].join(".") : fieldName);
				}
				break;
			}

			case "object": {
				collectContentFields({ contentFields, path: fieldName, schema: fieldConfig.fields });
				break;
			}
		}
	}
}

//

interface TransformContentFieldsParams {
	contentFields: Array<string>;
	entries: Array<{ slug: string; entry: Record<string, unknown> }>;
	transformContent: (content: string, slug: string) => Promise<object>;
	save: (content: string, slug: string) => Promise<void>;
}

async function transformContentFields(params: TransformContentFieldsParams): Promise<void> {
	const { contentFields, entries, save, transformContent } = params;

	for (const { entry, slug } of entries) {
		for (const contentField of contentFields) {
			await transform(entry, contentField.split("."), transformContent, slug);
		}

		await save(JSON.stringify(entry, null, 2), slug);
	}
}

//

interface CreateIndexFileParams {
	entries: Array<{ slug: string; entry: Record<string, unknown> }>;
	save: (imports: Array<string>, exports: Array<{ slug: string; id: string }>) => Promise<void>;
}

async function createIndexFile(params: CreateIndexFileParams) {
	const { entries, save } = params;

	const imports: Array<string> = [];
	const exports: Array<{ slug: string; id: string }> = [];

	entries.forEach(({ slug }) => {
		const id = sanitize(slug);
		exports.push({ slug, id });
		imports.push(`import ${id} from "./${slug}.json" with { type: "json" };`);
	});

	await save(imports, exports);
}

//

export interface GenerateOptions<
	TCollections extends Record<string, Collection<Record<string, ComponentSchema>, string>>,
	TSingletons extends Record<string, Singleton<Record<string, ComponentSchema>>>,
> {
	compile: (file: VFile) => Promise<VFile>;
	cwd?: string;
	keystaticConfig: Config<TCollections, TSingletons>;
	outputFolderPath: string;
}

export interface GenerateStats {
	collections: Map<string, number>;
	singletons: Map<string, number>;
}

export async function generate<
	TCollections extends Record<string, Collection<Record<string, ComponentSchema>, string>>,
	TSingletons extends Record<string, Singleton<Record<string, ComponentSchema>>>,
>({
	compile,
	cwd = process.cwd(),
	keystaticConfig,
	outputFolderPath: _outputFolderPath,
}: GenerateOptions<TCollections, TSingletons>): Promise<GenerateStats> {
	const stats: GenerateStats = { collections: new Map(), singletons: new Map() };

	const reader = createReader(cwd, keystaticConfig);

	const { collections, singletons } = keystaticConfig;

	for (const [collectionName, { path: _path, schema }] of Object.entries(collections ?? {})) {
		assert(_path);
		const path = join(cwd, _path);

		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		const entries = await reader.collections[collectionName]!.all({ resolveLinkedFiles: true });

		const outputFolderPath = join(_outputFolderPath, collectionName);
		await mkdir(outputFolderPath, { recursive: true });

		const contentFields: Array<string> = [];
		collectContentFields({ contentFields, schema });

		await transformContentFields({
			contentFields,
			entries,
			async transformContent(content, _slug) {
				const file = new VFile({ value: content, path });
				return pick(await compile(file), ["data", "value"]);
			},
			save(content, slug) {
				return writeFile(join(outputFolderPath, `${slug}.json`), content, { encoding: "utf-8" });
			},
		});

		await createIndexFile({
			entries,
			save(imports, exports) {
				const filePath = join(outputFolderPath, "index.mjs");
				const fileContent = `${imports.join("\n")}\n\nexport const ${sanitize(collectionName)} = {\n${exports.map(({ slug, id }) => `  "${slug}": ${id},`).join("\n")}\n};\n`;
				return writeFile(filePath, fileContent, { encoding: "utf-8" });
			},
		});

		stats.collections.set(collectionName, entries.length);
	}

	for (const [collectionName, { path: _path, schema }] of Object.entries(singletons ?? {})) {
		assert(_path);
		const path = join(cwd, _path);

		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		const entry = await reader.singletons[collectionName]!.readOrThrow({
			resolveLinkedFiles: true,
		});
		const entries = [{ slug: collectionName, entry }];

		const outputFolderPath = join(_outputFolderPath, collectionName);
		await mkdir(outputFolderPath, { recursive: true });

		const contentFields: Array<string> = [];
		collectContentFields({ contentFields, schema });

		await transformContentFields({
			contentFields,
			entries,
			async transformContent(content, _slug) {
				const file = new VFile({ value: content, path });
				return pick(await compile(file), ["data", "value"]);
			},
			save(content, slug) {
				return writeFile(join(outputFolderPath, `${slug}.json`), content, { encoding: "utf-8" });
			},
		});

		await createIndexFile({
			entries,
			save(imports, exports) {
				const filePath = join(outputFolderPath, "index.mjs");
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				const fileContent = `${imports.join("\n")}\n\nexport default ${exports.at(0)!.id};\n`;
				return writeFile(filePath, fileContent, { encoding: "utf-8" });
			},
		});

		stats.singletons.set(collectionName, entries.length);
	}

	return stats;
}
