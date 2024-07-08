import { collection } from "@content/collections/posts/__index.mjs";
import { run } from "@mdx-js/mdx";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import * as runtime from "react/jsx-runtime";

interface PostPageProps {
	params: {
		id: string;
	};
}

export function generateMetadata(props: PostPageProps): Metadata {
	const { id } = props.params;

	const post = collection[id as keyof typeof collection];

	const metadata: Metadata = {
		title: post.entry.title,
	};

	return metadata;
}

export default async function PostPage(props: PostPageProps): Promise<Awaited<ReactNode>> {
	const { id } = props.params;

	const post = collection[id as keyof typeof collection];
	const { default: Content } = await run(post.entry.summary, { ...(runtime as any) });

	return (
		<div>
			<main>
				<h1>{post.entry.title}</h1>
				<div className="prose">
					<Content />
				</div>
			</main>
		</div>
	);
}
