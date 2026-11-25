"use client"

import Image from "next/image"
import { useCallback, useEffect, useRef, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type Props = {
  images: string[]
  alt: string
  selected: number
  onSelect: (index: number) => void
}

export function ProductImageStrip({ images, alt, selected, onSelect }: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(false)

  const sync = useCallback(() => {
    const el = scrollerRef.current
    if (!el) return
    const max = el.scrollWidth - el.clientWidth
    setCanPrev(el.scrollLeft > 4)
    setCanNext(max > 4 && el.scrollLeft < max - 4)
  }, [])

  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    sync()
    el.addEventListener("scroll", sync, { passive: true })
    const observer = new ResizeObserver(sync)
    observer.observe(el)
    return () => {
      el.removeEventListener("scroll", sync)
      observer.disconnect()
    }
  }, [sync, images])

  useEffect(() => {
    const el = scrollerRef.current
    const thumb = el?.querySelector<HTMLElement>(`[data-index="${selected}"]`)
    if (!el || !thumb) return
    const pad = 12
    const thumbLeft = thumb.offsetLeft
    const thumbRight = thumbLeft + thumb.offsetWidth
    const viewLeft = el.scrollLeft
    const viewRight = viewLeft + el.clientWidth
    if (thumbLeft < viewLeft + pad) {
      el.scrollTo({ left: Math.max(0, thumbLeft - pad), behavior: "smooth" })
    } else if (thumbRight > viewRight - pad) {
      el.scrollTo({ left: thumbRight - el.clientWidth + pad, behavior: "smooth" })
    }
  }, [selected, images])

  const scrollByThumbs = (direction: -1 | 1) => {
    const el = scrollerRef.current
    if (!el) return
    const thumb = el.querySelector<HTMLElement>("button")
    const step = thumb ? thumb.offsetWidth + 12 : el.clientWidth * 0.5
    el.scrollBy({ left: direction * step * 2, behavior: "smooth" })
  }

  if (images.length < 2) return null

  return (
    <div className="group/strip relative">
      <div
        className={cn(
          "pointer-events-none absolute inset-y-0 left-0 z-[1] w-10 bg-gradient-to-r from-background to-transparent transition-opacity duration-300",
          canPrev ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        className={cn(
          "pointer-events-none absolute inset-y-0 right-0 z-[1] w-10 bg-gradient-to-l from-background to-transparent transition-opacity duration-300",
          canNext ? "opacity-100" : "opacity-0",
        )}
      />

      {canPrev ? (
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Previous images"
          onClick={() => scrollByThumbs(-1)}
          className="absolute top-1/2 left-0 z-10 size-8 -translate-y-1/2 rounded-full border-border/80 bg-background/90 shadow-sm backdrop-blur-sm"
        >
          <ChevronLeft className="size-4" />
        </Button>
      ) : null}
      {canNext ? (
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Next images"
          onClick={() => scrollByThumbs(1)}
          className="absolute top-1/2 right-0 z-10 size-8 -translate-y-1/2 rounded-full border-border/80 bg-background/90 shadow-sm backdrop-blur-sm"
        >
          <ChevronRight className="size-4" />
        </Button>
      ) : null}

      <div
        ref={scrollerRef}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {images.map((src, index) => {
          const active = selected === index
          return (
            <button
              key={`${src}-${index}`}
              type="button"
              data-index={index}
              aria-label={`${alt}, image ${index + 1}`}
              aria-current={active ? "true" : undefined}
              onClick={() => onSelect(index)}
              className={cn(
                "relative aspect-square w-[calc((100%-2.25rem)/4.2)] shrink-0 snap-start overflow-hidden rounded-lg bg-muted md:w-[calc((100%-3.75rem)/6)]",
                "border-2 transition-[border-color,transform,opacity] duration-300",
                active ? "border-foreground opacity-100" : "border-transparent opacity-80 hover:opacity-100",
              )}
            >
              <Image src={src} alt="" fill sizes="120px" className="object-cover" />
            </button>
          )
        })}
      </div>
    </div>
  )
}
