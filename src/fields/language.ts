import type { CollectionBeforeValidateHook, Field, Where } from "payload"

export const contentLanguageField: Field = {
  name: "language",
  type: "select",
  required: true,
  defaultValue: "fa",
  index: true,
  options: [
    { label: { en: "Persian", fa: "فارسی" }, value: "fa" },
    { label: { en: "English", fa: "انگلیسی" }, value: "en" },
  ],
  admin: {
    position: "sidebar",
    description: {
      en: "This record is only for one language. Add a separate record for another language.",
      fa: "این مورد فقط برای یک زبان است. برای زبان دیگر یک مورد جدا بسازید.",
    },
  },
}

export function withLanguage(
  where: Where | null,
  args: { data?: unknown; siblingData?: unknown },
): Where | true {
  const language = languageFrom(args)
  if (!language) return where && Object.keys(where).length ? where : true
  if (!where || Object.keys(where).length === 0) return { language: { equals: language } }
  return { and: [where, { language: { equals: language } }] }
}

export function languageFrom(args: { data?: unknown; siblingData?: unknown }) {
  const doc = args.data as { language?: string } | undefined
  const row = args.siblingData as { language?: string } | undefined
  return doc?.language || row?.language || null
}

/** Slug can repeat across languages, but not inside one language. */
export function uniqueSlugPerLanguage(collection: "products" | "categories" | "brands" | "attributes"): CollectionBeforeValidateHook {
  return async ({ data, req, originalDoc }) => {
    if (!data || typeof data !== "object") return data
    const row = data as { slug?: unknown; language?: unknown }
    const slug = typeof row.slug === "string" ? row.slug.trim() : ""
    const language = typeof row.language === "string" ? row.language : ""
    if (!slug || !language) return data

    const id = originalDoc && typeof originalDoc === "object" && "id" in originalDoc ? originalDoc.id : undefined
    const existing = await req.payload.find({
      collection,
      depth: 0,
      limit: 1,
      where: {
        and: [
          { slug: { equals: slug } },
          { language: { equals: language } },
          ...(id != null ? [{ id: { not_equals: id } }] : []),
        ],
      },
    })

    if (existing.docs.length) {
      throw new Error("This slug is already used for this language.")
    }

    return data
  }
}
