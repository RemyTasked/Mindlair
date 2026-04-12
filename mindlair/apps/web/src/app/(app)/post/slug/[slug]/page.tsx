import { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import db from "@/lib/db";
import { PostDetailClient } from "../../[id]/post-detail-client";

interface PageProps {
  params: Promise<{ slug: string }>;
}

function truncateText(text: string, maxLength: number): string {
  if (!text) return "";
  const plainText = text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  if (plainText.length <= maxLength) return plainText;
  return plainText.slice(0, maxLength - 3) + "...";
}

async function getPostBySlug(slug: string) {
  const post = await db.post.findUnique({
    where: { slug },
    include: {
      author: {
        select: { id: true, name: true, avatarUrl: true },
      },
    },
  });

  return post;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    return {
      title: "Post Not Found | Mindlair",
    };
  }

  // Don't expose draft post metadata
  if (post.status === "draft") {
    return {
      title: "Draft Post | Mindlair",
      robots: { index: false, follow: false },
    };
  }

  const title = post.seoTitle || post.headlineClaim;
  const description = post.seoDescription || truncateText(post.body, 155);
  const authorName = post.author?.name || "Anonymous";

  return {
    title: `${title} | Mindlair`,
    description,
    authors: [{ name: authorName }],
    openGraph: {
      title,
      description,
      type: "article",
      siteName: "Mindlair",
      authors: [authorName],
      publishedTime: post.publishedAt?.toISOString(),
      modifiedTime: post.updatedAt?.toISOString(),
      ...(post.thumbnailUrl ? { images: [post.thumbnailUrl] } : {}),
    },
    twitter: {
      card: post.thumbnailUrl ? "summary_large_image" : "summary",
      title,
      description,
      ...(post.thumbnailUrl ? { images: [post.thumbnailUrl] } : {}),
    },
    alternates: {
      canonical: `/post/slug/${slug}`,
    },
  };
}

export default async function PostSlugPage({ params }: PageProps) {
  const { slug } = await params;
  
  // Verify the slug exists
  const post = await db.post.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (!post) {
    notFound();
  }

  // Render using the post's ID (the client component will fetch full data)
  return <PostDetailClient postId={post.id} />;
}
