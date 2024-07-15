import type { Metadata } from "next";
import type { ReactNode } from "react";

import { collection } from "@content/collections/posts/__index.mjs";
import Link from "next/link";

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
								<article>
									<h2>
										<Link href={`/post/${id}`}>{post.entry.title}</Link>
									</h2>
									<div>{post.entry.summary}</div>
								</article>
							</li>
						);
					})}
				</ul>
			</main>
		</div>
	);
}
