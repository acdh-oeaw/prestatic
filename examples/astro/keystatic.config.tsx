import { collection, config, fields, singleton } from "@keystatic/core";

export default config({
	storage: {
		kind: "local",
	},
	collections: {
		posts: collection({
			label: "Posts",
			path: "./content/posts/*",
			slugField: "title",
			format: { data: "json" },
			columns: ["title"],
			entryLayout: "form",
			schema: {
				title: fields.slug({ name: { label: "Title", validation: { isRequired: true } } }),
				summary: fields.mdx({ label: "Summary" }),
				carousel: fields.object({
					slides: fields.array(
						fields.object(
							{
								title: fields.text({ label: "Slide title", validation: { isRequired: true } }),
								content: fields.mdx({ label: "Slide content" }),
							},
							{ label: "Slide" },
						),
						{
							label: "Slides",
							itemLabel(props) {
								return props.fields.title.value;
							},
							validation: { length: { min: 1 } },
						},
					),
				}),
				sections: fields.blocks(
					{
						text: {
							label: "Text",
							itemLabel(props) {
								return props.fields.title.value;
							},
							schema: fields.object(
								{
									title: fields.text({ label: "Section title", validation: { isRequired: true } }),
									content: fields.mdx({ label: "Section content" }),
								},
								{ label: "Text section" },
							),
						},
						cards: {
							label: "Cards",
							itemLabel(props) {
								return props.fields.title.value;
							},
							schema: fields.object(
								{
									title: fields.text({ label: "Section title", validation: { isRequired: true } }),
									cards: fields.array(
										fields.object(
											{
												title: fields.text({
													label: "Card title",
													validation: { isRequired: true },
												}),
												content: fields.mdx({ label: "Card content" }),
											},
											{ label: "Card" },
										),
										{
											label: "Cards",
											itemLabel(props) {
												return props.fields.title.value;
											},
											validation: { length: { min: 1 } },
										},
									),
								},
								{ label: "Cards section" },
							),
						},
					},
					{
						label: "Sections",
						validation: { length: { min: 1 } },
					},
				),
			},
		}),
	},
	singletons: {
		indexPage: singleton({
			label: "Home page",
			path: "./content/index-page",
			format: { contentField: "content" },
			entryLayout: "content",
			schema: {
				title: fields.text({ label: "Title", validation: { isRequired: true } }),
				summary: fields.mdx({ label: "Summary" }),
				content: fields.mdx({ label: "Content" }),
			},
		}),
	},
});
