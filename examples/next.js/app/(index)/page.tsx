import type { Metadata } from "next";
import type { ReactNode } from "react";

import { entry } from "@content/singletons/indexPage/__index.mjs";

export const metadata: Metadata = {
	title: entry.title,
};

export default function IndexPage(): ReactNode {
	return (
		<div>
			<main>
				<h1>{entry.title}</h1>
			</main>
		</div>
	);
}
