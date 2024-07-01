const regex = /[^\w$]/g;

export function sanitize(value: string): string {
	return value.replace(regex, "_");
}
