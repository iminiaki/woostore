import type { BlogPost } from "@/types";

interface WpRendered { rendered: string }
interface WpUser { name: string; avatar_urls?: Record<string, string> }
interface WpMedia { source_url: string }

interface WpPost {
  id: number;
  slug: string;
  date: string;
  title: WpRendered;
  excerpt: WpRendered;
  content: WpRendered;
  featured_media: number;
  _embedded?: {
    author?: WpUser[];
    "wp:featuredmedia"?: WpMedia[];
  }
}

function getWpBaseUrl(): string {
  const baseUrl = process.env.NEXT_PUBLIC_WP_BASE_URL || "";
  if (!baseUrl) throw new Error("NEXT_PUBLIC_WP_BASE_URL is not set");
  return baseUrl.replace(/\/$/, "");
}

async function wpFetch<T>(path: string, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
  const base = getWpBaseUrl();
  const qp = new URLSearchParams();
  if (params) Object.entries(params).forEach(([k, v]) => v !== undefined && qp.set(k, String(v)));
  const url = `${base}/wp-json/wp/v2/${path}${qp.toString() ? `?${qp.toString()}` : ""}`;
  const res = await fetch(url, { next: { revalidate: 120 } });
  if (!res.ok) throw new Error(`WP request failed: ${res.status} ${res.statusText}`);
  return res.json();
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, "").trim();
}

function toBlogPost(p: WpPost): BlogPost {
  const author = p._embedded?.author?.[0];
  const media = p._embedded?.["wp:featuredmedia"]?.[0];
  return {
    id: String(p.id),
    slug: p.slug,
    title: stripHtml(p.title?.rendered || ""),
    excerpt: stripHtml(p.excerpt?.rendered || ""),
    content: p.content?.rendered || "",
    author: {
      name: author?.name || "",
      avatar: author?.avatar_urls?.["96"] || author?.avatar_urls?.["48"] || "",
    },
    publishedAt: new Date(p.date),
    readTime: Math.max(3, Math.round(stripHtml(p.content?.rendered || "").split(/\s+/).length / 200)),
    image: media?.source_url || "",
    tags: [],
  };
}

export async function fetchWpPosts(params?: { per_page?: number; page?: number }): Promise<BlogPost[]> {
  const posts = await wpFetch<WpPost[]>("posts", { per_page: params?.per_page ?? 9, page: params?.page ?? 1, _embed: true });
  return posts.map(toBlogPost);
}

export async function fetchWpPostBySlug(slug: string): Promise<BlogPost | null> {
  const posts = await wpFetch<WpPost[]>("posts", { slug, _embed: true });
  if (!posts.length) return null;
  return toBlogPost(posts[0]!);
}


