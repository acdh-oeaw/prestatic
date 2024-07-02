const characters = /[^\w$]/g;
const first = /^([^a-z])/;

export function sanitize(value: string): string {
	return value.replace(characters, "_").replace(first, "_$1");
}
