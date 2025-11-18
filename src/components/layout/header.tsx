"use client"

import Link from "next/link"
import { useSession, signOut } from "next-auth/react"
import { Role } from "@prisma/client"
import {
  Menu,
  User,
  LogOut,
  Shield,
  Settings,
  Star,
  Home,
  FileText,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { canAccessModeration, canAccessAdmin } from "@/lib/permissions"

function getRoleBadgeVariant(role: Role): "default" | "secondary" | "destructive" | "outline" {
  switch (role) {
    case "MAINTAINER":
      return "destructive"
    case "JUDGE":
      return "default"
    case "REVIEWER":
      return "secondary"
    default:
      return "outline"
  }
}

function getRoleDisplayName(role: Role): string {
  return role.charAt(0) + role.slice(1).toLowerCase()
}

function getInitials(name: string | null | undefined): string {
  if (!name) return "U"
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

export function Header() {
  const { data: session, status } = useSession()
  const isLoading = status === "loading"

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo and Brand */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <span className="text-sm font-bold text-primary-foreground">AI</span>
            </div>
            <span className="hidden font-bold sm:inline-block">
              AI Engineering Commons
            </span>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden items-center gap-4 md:flex">
            <Link
              href="/"
              className="flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <Home className="h-4 w-4" />
              Home
            </Link>
            <Link
              href="/articles"
              className="flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <FileText className="h-4 w-4" />
              Articles
            </Link>
            {session?.user && canAccessModeration(session.user.role) && (
              <Link
                href="/moderation"
                className="flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <Shield className="h-4 w-4" />
                Moderation
              </Link>
            )}
            {session?.user && canAccessAdmin(session.user.role) && (
              <Link
                href="/admin"
                className="flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <Settings className="h-4 w-4" />
                Admin
              </Link>
            )}
          </nav>
        </div>

        {/* Right side - Auth */}
        <div className="flex items-center gap-4">
          {isLoading ? (
            <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
          ) : session?.user ? (
            <div className="flex items-center gap-3">
              {/* Reputation */}
              <div className="hidden items-center gap-1 text-sm text-muted-foreground sm:flex">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span>{session.user.reputation}</span>
              </div>

              {/* Role Badge */}
              <Badge
                variant={getRoleBadgeVariant(session.user.role)}
                className="hidden sm:inline-flex"
              >
                {getRoleDisplayName(session.user.role)}
              </Badge>

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={session.user.image || undefined}
                        alt={session.user.name || "User"}
                      />
                      <AvatarFallback>
                        {getInitials(session.user.name)}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {session.user.name}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {session.user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="flex items-center">
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="text-red-600 focus:text-red-600"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Mobile Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild className="md:hidden">
                  <Button variant="ghost" size="icon">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Toggle menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href="/">Home</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/articles">Articles</Link>
                  </DropdownMenuItem>
                  {canAccessModeration(session.user.role) && (
                    <DropdownMenuItem asChild>
                      <Link href="/moderation">Moderation</Link>
                    </DropdownMenuItem>
                  )}
                  {canAccessAdmin(session.user.role) && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin">Admin</Link>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <Button asChild>
              <Link href="/auth/signin">Sign in</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
