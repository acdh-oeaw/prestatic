import "tailwindcss/tailwind.css";

import type { ReactNode } from "react";

interface RootLayoutProps {
	children: ReactNode;
}

export default function RootLayout(props: RootLayoutProps): ReactNode {
	const { children } = props;

	return (
		<html lang="en">
			<body>{children}</body>
		</html>
	);
}
