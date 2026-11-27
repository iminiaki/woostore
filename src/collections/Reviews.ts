import type { CollectionBeforeChangeHook, CollectionConfig } from "payload"

import { staffOnly } from "@/access/roles"
import { t } from "@/i18n/admin"
import { relationId, syncReviewStats, syncReviewStatsAfterDelete } from "@/lib/reviews"

const stampProductEmail: CollectionBeforeChangeHook = ({ data }) => {
  const product = relationId(data?.product)
  const email = String(data?.email || "").trim().toLowerCase()
  if (product != null && email) data.productEmail = `${product}:${email}`
  if (email) data.email = email
  return data
}

export const Reviews: CollectionConfig = {
  slug: "reviews",
  labels: t.reviews,
  admin: {
    useAsTitle: "authorName",
    defaultColumns: ["authorName", "product", "rating", "status", "verified", "createdAt"],
    group: t.commerce,
    disableCopyToLocale: true,
    description: {
      en: "Customer reviews. Published reviews update the product rating.",
      fa: "نظر مشتریان. نظرهای منتشرشده امتیاز محصول را به‌روز می‌کنند.",
    },
  },
  access: {
    create: staffOnly,
    read: staffOnly,
    update: staffOnly,
    delete: staffOnly,
  },
  hooks: {
    beforeChange: [stampProductEmail],
    afterChange: [syncReviewStats],
    afterDelete: [syncReviewStatsAfterDelete],
  },
  fields: [
    {
      name: "product",
      type: "relationship",
      relationTo: "products",
      required: true,
      index: true,
      label: { en: "Product", fa: "محصول" },
    },
    {
      name: "email",
      type: "email",
      required: true,
      index: true,
      label: { en: "Email", fa: "ایمیل" },
    },
    {
      name: "authorName",
      type: "text",
      required: true,
      label: { en: "Name", fa: "نام" },
    },
    {
      name: "rating",
      type: "number",
      required: true,
      min: 1,
      max: 5,
      label: { en: "Rating", fa: "امتیاز" },
    },
    {
      name: "headline",
      type: "text",
      label: { en: "Headline", fa: "عنوان" },
    },
    {
      name: "body",
      type: "textarea",
      required: true,
      label: { en: "Review", fa: "نظر" },
    },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "published",
      label: { en: "Status", fa: "وضعیت" },
      options: [
        { label: { en: "Published", fa: "منتشرشده" }, value: "published" },
        { label: { en: "Hidden", fa: "پنهان" }, value: "hidden" },
      ],
      admin: { position: "sidebar" },
    },
    {
      name: "verified",
      type: "checkbox",
      defaultValue: false,
      label: { en: "Verified purchase", fa: "خرید تأییدشده" },
      admin: { position: "sidebar", readOnly: true },
    },
    {
      name: "helpfulCount",
      type: "number",
      defaultValue: 0,
      min: 0,
      label: { en: "Helpful votes", fa: "رأی مفید" },
      admin: { position: "sidebar", readOnly: true },
    },
    {
      name: "helpfulEmails",
      type: "text",
      hasMany: true,
      label: { en: "Helpful voters", fa: "رأی‌دهندگان" },
      admin: { hidden: true },
    },
    {
      name: "productEmail",
      type: "text",
      unique: true,
      index: true,
      admin: { hidden: true },
    },
  ],
}
