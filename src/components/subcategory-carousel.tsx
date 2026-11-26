"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { HomeCarousel } from "@/components/home-carousel";

export type SubcategoryCard = {
  id: string;
  name: string;
  slug: string;
  href: string;
  image: string;
  count: number;
};

function tile(sub: SubcategoryCard) {
  return (
    <Link href={sub.href} className="group relative block overflow-hidden rounded-2xl bg-muted">
      <div className="relative aspect-[5/3]">
        <Image
          src={sub.image}
          alt={sub.name}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-105"
          sizes="(max-width: 768px) 72vw, 25vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4">
          <div>
            <p className="text-base font-semibold text-white sm:text-lg">{sub.name}</p>
            <p className="text-xs text-white/75">
              {sub.count} product{sub.count === 1 ? "" : "s"}
            </p>
          </div>
          <ArrowRight className="mb-0.5 h-4 w-4 shrink-0 text-white/80 transition-transform duration-300 group-hover:translate-x-1" />
        </div>
      </div>
    </Link>
  );
}

export function SubcategoryCarousel({ items }: { items: SubcategoryCard[] }) {
  const desktopGridClassName =
    items.length >= 4
      ? "hidden md:grid md:grid-cols-4 md:gap-3"
      : items.length === 3
        ? "hidden md:grid md:grid-cols-3 md:gap-3"
        : items.length === 2
          ? "hidden md:grid md:grid-cols-2 md:gap-3"
          : "hidden md:grid md:grid-cols-1 md:gap-3";

  return (
    <HomeCarousel
      items={items}
      getKey={(sub) => sub.id}
      renderItem={tile}
      className="mb-10 space-y-6"
      previousLabel="Previous subcategories"
      nextLabel="Next subcategories"
      itemLabel={(index) => `Subcategory ${index + 1}`}
      mobileFrom={2}
      arrowPlacement="edges"
      desktopGridClassName={desktopGridClassName}
    />
  );
}
