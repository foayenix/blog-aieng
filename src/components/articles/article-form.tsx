"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArticleCategory } from "@prisma/client"
import { serialize } from "next-mdx-remote/serialize"
import { MDXRemoteSerializeResult } from "next-mdx-remote"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { X } from "lucide-react"
import { ArticleContent } from "./article-content"

interface ArticleFormProps {
  mode: "create" | "edit"
  initialData?: {
    title: string
    slug: string
    summary: string
    category: ArticleCategory
    tags: string[]
    bodyMdx: string
  }
  articleSlug?: string
}

const categoryLabels: Record<ArticleCategory, string> = {
  FOUNDATIONS: "Foundations",
  SYSTEMS: "Systems",
  APPLIED: "Applied AI",
  MLOPS: "MLOps",
  SAFETY: "Safety",
  BENCHMARKS: "Benchmarks",
  CASE_STUDIES: "Case Studies",
  CAREER: "Career",
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function ArticleForm({ mode, initialData, articleSlug }: ArticleFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [title, setTitle] = useState(initialData?.title || "")
  const [slug, setSlug] = useState(initialData?.slug || "")
  const [summary, setSummary] = useState(initialData?.summary || "")
  const [category, setCategory] = useState<ArticleCategory>(
    initialData?.category || "FOUNDATIONS"
  )
  const [tags, setTags] = useState<string[]>(initialData?.tags || [])
  const [tagInput, setTagInput] = useState("")
  const [bodyMdx, setBodyMdx] = useState(initialData?.bodyMdx || "")
  const [changelog, setChangelog] = useState("")

  // Preview state
  const [preview, setPreview] = useState<MDXRemoteSerializeResult | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)

  // Auto-generate slug from title (only in create mode)
  useEffect(() => {
    if (mode === "create" && title && !initialData?.slug) {
      setSlug(slugify(title))
    }
  }, [title, mode, initialData?.slug])

  // Generate preview when body changes
  useEffect(() => {
    const generatePreview = async () => {
      if (!bodyMdx.trim()) {
        setPreview(null)
        setPreviewError(null)
        return
      }

      try {
        const mdxSource = await serialize(bodyMdx)
        setPreview(mdxSource)
        setPreviewError(null)
      } catch (err) {
        setPreviewError("Invalid MDX syntax. Please check your content.")
        setPreview(null)
      }
    }

    const timeoutId = setTimeout(generatePreview, 500)
    return () => clearTimeout(timeoutId)
  }, [bodyMdx])

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim().toLowerCase()
    if (trimmedTag && !tags.includes(trimmedTag) && tags.length < 10) {
      setTags([...tags, trimmedTag])
      setTagInput("")
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove))
  }

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleAddTag()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      // Validate MDX by trying to serialize it
      await serialize(bodyMdx)

      const endpoint = mode === "create" ? "/api/articles" : `/api/articles/${articleSlug}`
      const method = mode === "create" ? "POST" : "PATCH"

      const payload = mode === "create"
        ? {
            title,
            slug,
            summary,
            category,
            tags,
            bodyMdx,
          }
        : {
            bodyMdx,
            changelog,
          }

      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to save article")
      }

      const data = await response.json()
      router.push(`/articles/${data.slug || articleSlug}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-destructive/15 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {mode === "create" && (
        <>
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter article title"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              value={slug}
              onChange={(e) => setSlug(slugify(e.target.value))}
              placeholder="article-url-slug"
              required
            />
            <p className="text-xs text-muted-foreground">
              This will be the URL: /articles/{slug || "your-slug"}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="summary">Summary</Label>
            <Textarea
              id="summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Brief description of the article"
              className="min-h-[80px]"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as ArticleCategory)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(categoryLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <div className="flex gap-2">
              <Input
                id="tags"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder="Add a tag and press Enter"
              />
              <Button type="button" variant="secondary" onClick={handleAddTag}>
                Add
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {tags.length}/10 tags added
            </p>
          </div>
        </>
      )}

      <div className="space-y-2">
        <Label>Content</Label>
        <Tabs defaultValue="write">
          <TabsList>
            <TabsTrigger value="write">Write</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>
          <TabsContent value="write">
            <Textarea
              value={bodyMdx}
              onChange={(e) => setBodyMdx(e.target.value)}
              placeholder="Write your article content in MDX..."
              className="min-h-[400px] font-mono text-sm"
              required
            />
          </TabsContent>
          <TabsContent value="preview">
            <Card>
              <CardContent className="p-6">
                {previewError ? (
                  <p className="text-sm text-destructive">{previewError}</p>
                ) : preview ? (
                  <ArticleContent source={preview} />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Start writing to see the preview...
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {mode === "edit" && (
        <div className="space-y-2">
          <Label htmlFor="changelog">Changelog</Label>
          <Textarea
            id="changelog"
            value={changelog}
            onChange={(e) => setChangelog(e.target.value)}
            placeholder="Describe what you changed..."
            className="min-h-[80px]"
          />
          <p className="text-xs text-muted-foreground">
            This helps reviewers understand your changes.
          </p>
        </div>
      )}

      <div className="flex gap-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? mode === "create"
              ? "Creating..."
              : "Saving..."
            : mode === "create"
            ? "Create Article"
            : "Propose Update"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
