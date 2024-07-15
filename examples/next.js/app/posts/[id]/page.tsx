import { assert } from "@acdh-oeaw/lib";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import { collection } from "@content/collections/posts/__index.mjs";

export const dynamicParams = false;

interface PostPageProps {
	params: {
		id: string;
	};
}

export async function generateMetadata(props: PostPageProps): Promise<Metadata> {
	const { id } = props.params;

	assert(id in collection);
	const post = collection[id as keyof typeof collection];

	const metadata: Metadata = {
		title: post.entry.title,
	};

	return metadata;
}

export default function PostPage(props: PostPageProps): ReactNode {
	const { id } = props.params;

	assert(id in collection);
	const post = collection[id as keyof typeof collection];

	return (
		<div>
			<main>
				<h1>{post.entry.title}</h1>
			</main>
		</div>
	);
}
