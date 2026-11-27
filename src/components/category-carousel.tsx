"use client";

import Image from "next/image";
import { LocaleLink as Link } from "@/components/locale-link";
import { Card, CardContent } from "@/components/ui/card";
import { HomeCarousel } from "@/components/home-carousel";
import type { Category } from "@/types";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  categories: Category[];
  viewAllHref?: string;
  className?: string;
};

function categoryCard(c: Category) {
  return (
    <Link href={`/category/${c.slug}`} className="block">
      <Card className="group cursor-pointer overflow-hidden transition-all duration-300 hover:shadow-lg">
        <CardContent className="p-0">
          <div className="relative aspect-square">
            <Image
              src={c.image}
              alt={c.name}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 768px) 72vw, 25vw"
            />
            <div className="absolute inset-0 bg-black/20 transition-colors duration-300 group-hover:bg-black/30" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <h3 className="mb-2 text-3xl font-bold text-white drop-shadow-lg">{c.name}</h3>
                <div className="rounded-full bg-white/90 px-4 py-2 backdrop-blur-sm">
                  <span className="text-sm font-medium text-gray-800">Shop Now</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export function CategoryCarousel({ title, categories, viewAllHref, className }: Props) {
  return (
    <HomeCarousel
      items={categories}
      getKey={(category) => category.slug}
      renderItem={categoryCard}
      title={title}
      viewAllHref={viewAllHref}
      className={cn("mx-auto max-w-7xl space-y-6 px-4", className)}
      previousLabel="Previous categories"
      nextLabel="Next categories"
      itemLabel={(index) => `Category ${index + 1}`}
      pagesLabel="Category pages"
      mobileFrom={1}
    />
  );
}
