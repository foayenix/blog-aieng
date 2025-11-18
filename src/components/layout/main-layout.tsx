import { Header } from "./header"
import { Footer } from "./footer"

interface MainLayoutProps {
  children: React.ReactNode
  className?: string
}

export function MainLayout({ children, className }: MainLayoutProps) {
  return (
    <div className="relative flex min-h-screen flex-col">
      <Header />
      <main className={`flex-1 ${className || ""}`}>
        <div className="container py-6">{children}</div>
      </main>
      <Footer />
    </div>
  )
}
