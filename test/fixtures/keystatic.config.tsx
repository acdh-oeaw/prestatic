import { collection, config, fields, singleton } from "@keystatic/core";

export default config({
	storage: { kind: "local" },
	collections: {
		posts: collection({
			label: "Post",
			path: "./content/posts/*",
			slugField: "title",
			format: { contentField: "content" },
			schema: {
				title: fields.slug({
					name: {
						label: "Title",
						validation: { isRequired: true },
					},
				}),
				summary: fields.mdx({
					label: "Summary",
				}),
				content: fields.mdx({
					label: "Content",
				}),
			},
		}),
	},
	singletons: {
		indexPage: singleton({
			label: "Home page",
			path: "./content/index-page",
			format: { data: "json" },
			schema: {
				title: fields.text({
					label: "Title",
					validation: { isRequired: true },
				}),
				sections: fields.array(
					fields.object(
						{
							title: fields.text({
								label: "Section title",
								validation: { isRequired: true },
							}),
							content: fields.mdx({
								label: "Section content",
							}),
						},
						{
							label: "Section",
						},
					),
					{
						label: "Sections",
						itemLabel(props) {
							return props.fields.title.value;
						},
						validation: { length: { min: 1 } },
					},
				),
			},
		}),
	},
});
