"use client"

import NextLink from "next/link"
import type { ComponentProps } from "react"

import { useI18n } from "@/components/locale-provider"

type Props = ComponentProps<typeof NextLink>

/** Storefront link that adds /fa or /en, and leaves the default language bare when that option is on. */
export function LocaleLink({ href, ...props }: Props) {
  const { localize } = useI18n()
  const nextHref = typeof href === "string" ? localize(href) : href
  return <NextLink href={nextHref} {...props} />
}
