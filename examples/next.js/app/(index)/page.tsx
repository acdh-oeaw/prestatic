import { entry } from "@content/singletons/indexPage/__index.mjs";
import { run } from "@mdx-js/mdx";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import * as runtime from "react/jsx-runtime";

export const metadata: Metadata = {
	title: entry.title,
};

export default async function IndexPage(): Promise<Awaited<ReactNode>> {
	const { default: Content } = await run(entry.content, { ...(runtime as any) });

	return (
		<div>
			<main>
				<h1>{entry.title}</h1>
				<div className="prose">
					<Content />
				</div>
			</main>
		</div>
	);
}
