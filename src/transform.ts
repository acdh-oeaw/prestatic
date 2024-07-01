export async function transform(
	value: Record<string, unknown>,
	segments: Array<string>,
	compile: (content: string, slug: string) => Promise<object>,
	slug: string,
): Promise<void> {
	let o = value;
	let i = 0;

	while (i < segments.length - 1) {
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		let segment = segments[i++]!;

		if (segment.endsWith("[]")) {
			segment = segment.slice(0, -2);
			await Promise.all(
				(o[segment] as Array<Record<string, unknown>>).map((v) => {
					return transform(v, segments.slice(i), compile, slug);
				}),
			);
			return;
		}

		o = o[segment] as Record<string, unknown>;
	}

	// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
	let segment = segments[i]!;

	if (segment.endsWith("[]")) {
		segment = segment.slice(0, -2);
		o[segment] = await Promise.all(
			(o[segment] as Array<string>).map((v) => {
				return compile(v, slug);
			}),
		);
	} else {
		o[segment] = await compile(o[segment] as string, slug);
	}
}
