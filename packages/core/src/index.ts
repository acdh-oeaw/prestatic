import assert from "node:assert";
import crypto from "node:crypto";
import { mkdir, access, writeFile } from "node:fs/promises";
import { join } from "node:path";

import {
	fields,
	type Collection,
	type ComponentSchema,
	type FormField,
	type Singleton,
} from "@keystatic/core";
import { type Reader } from "@keystatic/core/reader";
import { compile, type CompileOptions } from "@mdx-js/mdx";
import serialize from "serialize-javascript";

//

const config = {
	outputFolderName: ".content-collections",
};

//

const characters = /[^\w$]/g;
const first = /^([^a-z])/i;

function sanitize(value: string): string {
	return value.replace(characters, "_").replace(first, "_$1");
}

//

function createHash(value: unknown): string {
	return crypto.createHash("md5").update(JSON.stringify(value)).digest("hex");
}

//

interface FormFieldVisitorParams {
	basePath: string;
	entry: Record<string, unknown>;
	field: FormField<any, any, any>;
	parent: unknown;
	path: Array<string | number>;
	schema: ComponentSchema;
	value: unknown;
}

interface FormFieldVisitor {
	(params: FormFieldVisitorParams): Promise<void>;
}

//

interface WalkParams {
	basePath: string;
	entry: Record<string, unknown>;
	onFormField: FormFieldVisitor;
	schema: Record<string, ComponentSchema>;
}

function walk(params: WalkParams): Promise<void> {
	const { basePath, entry, onFormField, schema: rootSchema } = params;

	const root = { root: entry };
	const path = ["root"];
	const schema = fields.object(rootSchema);
	const node = {
		basePath,
		entry,
		field: schema,
		onFormField,
		parent: root,
		path,
		schema,
		value: entry,
	};

	return visit(node);
}

interface Node {
	basePath: string;
	entry: Record<string, unknown>;
	field: ComponentSchema;
	onFormField: FormFieldVisitor;
	parent: unknown;
	path: Array<string | number>;
	schema: ComponentSchema;
	value: unknown;
}

async function visit(node: Node): Promise<void> {
	const { basePath, entry, field, onFormField, parent, path, schema, value } = node;

	switch (field.kind) {
		case "array": {
			assert(Array.isArray(value));

			return Promise.all(
				value.map((v, key) => {
					return visit({
						basePath,
						entry,
						field: field.element,
						onFormField,
						parent: value,
						path: path.concat(key),
						schema,
						value: v,
					});
				}),
			) as unknown as Promise<void>;
		}

		case "child": {
			throw new Error("Not implemented.");
		}

		case "conditional": {
			assert(value !== null && typeof value === "object");
			assert("value" in value && "discriminant" in value && typeof value.discriminant === "string");
			assert(value.discriminant in field.values);

			return visit({
				basePath,
				entry,
				field: field.values[value.discriminant]!,
				onFormField,
				parent: value,
				path,
				schema,
				value: value.value,
			});
		}

		case "form": {
			return onFormField({
				basePath,
				entry,
				field,
				parent,
				path,
				schema,
				value,
			});
		}

		case "object": {
			assert(value !== null && typeof value === "object");

			return Promise.all(
				Object.entries(value).map(([key, v]) => {
					assert(key in field.fields);

					return visit({
						basePath,
						entry,
						field: field.fields[key]!,
						onFormField,
						parent: value,
						path: path.concat(key),
						schema,
						value: v,
					});
				}),
			) as unknown as Promise<void>;
		}
	}
}

//

export type CompilerOptions = Pick<
	CompileOptions,
	| "baseUrl"
	| "elementAttributeNameCase"
	| "jsxImportSource"
	| "recmaPlugins"
	| "rehypePlugins"
	| "remarkPlugins"
	| "remarkRehypeOptions"
>;

//

export interface BuildParams<
	Collections extends { [key: string]: Collection<Record<string, ComponentSchema>, string> },
	Singletons extends { [key: string]: Singleton<Record<string, ComponentSchema>> },
> {
	compiler: CompilerOptions;
	reader: Reader<Collections, Singletons>;
}

export async function build<
	Collections extends { [key: string]: Collection<Record<string, ComponentSchema>, string> },
	Singletons extends { [key: string]: Singleton<Record<string, ComponentSchema>> },
>(params: BuildParams<Collections, Singletons>): Promise<void> {
	const { compiler, reader } = params;

	const basePath = reader.repoPath;

	const onFormField: FormFieldVisitor = async function onFormField(params) {
		const { basePath, entry, field, parent, path, schema, value } = params;

		if (field.formKind !== "content") return;

		const file = await compile(value as string, {
			...compiler,
			format: "mdx",
			outputFormat: "function-body",
		});

		(parent as any)[path.at(-1)!] = String(file);
	};

	for (const [key, collection] of Object.entries(reader.config.collections ?? {})) {
		assert(collection.path);
		const collectionReader = reader.collections[key]!;

		const folderPath = join(basePath, config.outputFolderName, "collections", key);
		await mkdir(folderPath, { recursive: true });

		const ids = await collectionReader.list();

		for (const id of ids) {
			const fileName = `${id}.mjs`;
			const filePath = join(folderPath, fileName);

			const entry = await collectionReader.readOrThrow(id, { resolveLinkedFiles: true });
			const contentHash = createHash(entry);

			try {
				await access(filePath);
				const { contentHash: _contentHash } = await import(filePath);
				if (contentHash === _contentHash) continue;
			} catch {
				/** noop */
			}

			await walk({ basePath, entry, onFormField, schema: collection.schema });

			const fileContent = [
				`export const contentHash = "${contentHash}";`,
				`export const entry = ${serialize(entry, { space: 2 })};`,
			].join("\n\n");
			await writeFile(filePath, fileContent, { encoding: "utf-8" });
		}

		const imports = [];
		const exports = [];

		for (const id of ids) {
			const _id = sanitize(id);
			imports.push(`import * as ${_id} from "./${id}.mjs";`);
			exports.push(`"${id}": ${_id}`);
		}

		const indexFileName = `__index.mjs`;
		const indexFileContent = [
			imports.join("\n"),
			`export const collection = {\n  ${exports.join(",\n  ")}\n};`,
		].join("\n\n");
		await writeFile(join(folderPath, indexFileName), indexFileContent, { encoding: "utf-8" });
	}

	for (const [key, singleton] of Object.entries(reader.config.singletons ?? {})) {
		assert(singleton.path);
		const singletonReader = reader.singletons[key]!;

		const folderPath = join(basePath, config.outputFolderName, "singletons", key);
		await mkdir(folderPath, { recursive: true });

		const fileName = `__index.mjs`;
		const filePath = join(folderPath, fileName);

		const entry = await singletonReader.readOrThrow({ resolveLinkedFiles: true });
		const contentHash = createHash(entry);

		try {
			await access(filePath);
			const { contentHash: _contentHash } = await import(filePath);
			if (contentHash === _contentHash) continue;
		} catch {
			/** noop */
		}

		await walk({ basePath, entry, onFormField, schema: singleton.schema });

		const fileContent = [
			`export const contentHash = "${contentHash}";`,
			`export const entry = ${serialize(entry, { space: 2 })};`,
		].join("\n\n");
		await writeFile(join(folderPath, fileName), fileContent, { encoding: "utf-8" });
	}
}
