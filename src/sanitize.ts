const characters = /[^\w$]/g;
const first = /^([^a-z])/i;

export function sanitize(value: string): string {
	return value.replace(characters, "_").replace(first, "_$1");
}
