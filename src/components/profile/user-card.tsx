"use client"

import { Role } from "@prisma/client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { CalendarDays, Star, User as UserIcon } from "lucide-react"

interface UserCardProps {
  user: {
    id: string
    name: string | null
    email: string | null
    image: string | null
    bio: string | null
    role: Role
    reputation: number
    createdAt: Date
  }
}

const roleColors: Record<Role, string> = {
  READER: "bg-gray-100 text-gray-800",
  CONTRIBUTOR: "bg-blue-100 text-blue-800",
  REVIEWER: "bg-purple-100 text-purple-800",
  JUDGE: "bg-orange-100 text-orange-800",
  MAINTAINER: "bg-red-100 text-red-800",
}

const roleLabels: Record<Role, string> = {
  READER: "Reader",
  CONTRIBUTOR: "Contributor",
  REVIEWER: "Reviewer",
  JUDGE: "Judge",
  MAINTAINER: "Maintainer",
}

function getInitials(name: string | null): string {
  if (!name) return "?"
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  })
}

export function UserCard({ user }: UserCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-4">
        <Avatar className="h-20 w-20">
          <AvatarImage src={user.image || undefined} alt={user.name || "User"} />
          <AvatarFallback className="text-lg">
            {getInitials(user.name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold">{user.name || "Anonymous"}</h2>
            <Badge className={roleColors[user.role]}>
              {roleLabels[user.role]}
            </Badge>
          </div>
          {user.email && (
            <p className="text-sm text-muted-foreground">{user.email}</p>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {user.bio && (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Bio</h3>
            <p className="text-sm">{user.bio}</p>
          </div>
        )}
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2 text-sm">
            <Star className="h-4 w-4 text-yellow-500" />
            <span className="font-medium">{user.reputation}</span>
            <span className="text-muted-foreground">reputation</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarDays className="h-4 w-4" />
            <span>Joined {formatDate(user.createdAt)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default UserCard
