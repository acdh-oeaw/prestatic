import assert from "node:assert/strict";
import crypto from "node:crypto";
import { access, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import {
	fields,
	type Collection,
	type ComponentSchema,
	type FormField,
	type Singleton,
} from "@keystatic/core";
import { type Reader } from "@keystatic/core/reader";
import { compile } from "@mdx-js/mdx";
import { generate as serialize } from "escodegen";
import { valueToEstree as parse, type Expression } from "estree-util-value-to-estree";

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
	tree: Expression;
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
	tree: Expression;
}

function walk(params: WalkParams): Promise<void> {
	const { basePath, entry, onFormField, schema: rootSchema, tree } = params;

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
		tree,
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
	tree: Expression;
	value: unknown;
}

async function visit(node: Node): Promise<void> {
	const { basePath, entry, field, onFormField, parent, path, schema, tree, value } = node;

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
						tree,
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
				tree,
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
				tree,
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
						tree,
						value: v,
					});
				}),
			) as unknown as Promise<void>;
		}
	}
}

//

interface BuildParams<
	Collections extends { [key: string]: Collection<Record<string, ComponentSchema>, string> },
	Singletons extends { [key: string]: Singleton<Record<string, ComponentSchema>> },
> {
	reader: Reader<Collections, Singletons>;
}

export async function build<
	Collections extends { [key: string]: Collection<Record<string, ComponentSchema>, string> },
	Singletons extends { [key: string]: Singleton<Record<string, ComponentSchema>> },
>(params: BuildParams<Collections, Singletons>): Promise<void> {
	const { reader } = params;

	const basePath = reader.repoPath;

	const onFormField: FormFieldVisitor = async function onFormField(params) {
		const { basePath, entry, field, imports, parent, path, schema, value } = params;

		if (field.formKind !== "content") return;

		// TODO: allow passing in configuration (plugins, jsx runtime)
		const file = await compile(value as string);

		// TODO: save to separate file and use (dynamic) import in entry file
		const filePath = path.join("_");
		imports.push({ filePath, fileContent: String(file) });

		(parent as any)[path.at(-1)!] = () => import(filePath);
	};

	for (const [key, collection] of Object.entries(reader.config.collections ?? {})) {
		const configHash = createHash(collection); // TODO: invalidate all on onfig change

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

			const imports: Array<FormFieldImport> = [];
			const tree = parse(entry);
			await walk({ basePath, entry, imports, onFormField, schema: collection.schema });

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
			`export const configHash = "${configHash}";`,
			`export const collection = {\n  ${exports.join(",\n  ")}\n};`,
		].join("\n\n");
		await writeFile(join(folderPath, indexFileName), indexFileContent, { encoding: "utf-8" });
	}

	for (const [key, singleton] of Object.entries(reader.config.singletons ?? {})) {
		const configHash = createHash(singleton); // TODO: invalidate all on config change

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

		const imports: Array<FormFieldImport> = [];
		await walk({ basePath, entry, imports, onFormField, schema: singleton.schema });

		const fileContent = [
			`export const contentHash = "${contentHash}";`,
			`export const entry = ${serialize(entry, { space: 2 })};`,
		].join("\n\n");
		await writeFile(join(folderPath, fileName), fileContent, { encoding: "utf-8" });
	}
}
