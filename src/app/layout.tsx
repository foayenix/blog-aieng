import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Providers } from "./providers"
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

export const metadata: Metadata = {
  title: "AI Engineering Commons",
  description: "A community-driven knowledge hub for AI/ML engineering. Share knowledge, contribute articles, and learn from the community.",
  keywords: ["AI", "ML", "machine learning", "artificial intelligence", "engineering", "community", "knowledge hub"],
  authors: [{ name: "AI Engineering Commons Community" }],
  openGraph: {
    title: "AI Engineering Commons",
    description: "A community-driven knowledge hub for AI/ML engineering",
    type: "website",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}
