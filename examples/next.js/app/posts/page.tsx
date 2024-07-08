import { collection } from "@content/collections/posts/__index.mjs";
import { run } from "@mdx-js/mdx";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import * as runtime from "react/jsx-runtime";

export const metadata: Metadata = {
	title: "Posts",
};

export default function PostsPage(): ReactNode {
	return (
		<div>
			<main>
				<h1>Posts</h1>
				<ul>
					{Object.entries(collection).map(([id, post]) => {
						return (
							<li key={id}>
								{/* @ts-expect-error Upstream type error. */}
								<PostPreview post={post} />
							</li>
						);
					})}
				</ul>
			</main>
		</div>
	);
}

interface PostPreviewProps {
	post: {
		entry: {
			title: string;
			summary: string;
		};
	};
}

async function PostPreview(props: PostPreviewProps): Promise<Awaited<ReactNode>> {
	const { post } = props;

	const { default: Content } = await run(post.entry.summary, { ...(runtime as any) });

	return (
		<article>
			<h2>{post.entry.title}</h2>
			<div className="prose">
				<Content />
			</div>
		</article>
	);
}
