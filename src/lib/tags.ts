// "Franchise law" -> "franchise-law": the address segment for a tag page.
export const tagSlug = (t: string) => t.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
