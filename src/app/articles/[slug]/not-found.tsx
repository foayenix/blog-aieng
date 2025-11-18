import Link from "next/link"
import { Button } from "@/components/ui/button"
import { FileX } from "lucide-react"

export default function ArticleNotFound() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-md mx-auto text-center">
        <FileX className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold mb-2">Article Not Found</h1>
        <p className="text-muted-foreground mb-6">
          The article you&apos;re looking for doesn&apos;t exist or has been removed.
        </p>
        <Link href="/articles">
          <Button>Browse Articles</Button>
        </Link>
      </div>
    </div>
  )
}
