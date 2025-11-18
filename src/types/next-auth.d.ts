import { Role } from '@prisma/client'
import { DefaultSession, DefaultUser } from 'next-auth'
import { DefaultJWT } from 'next-auth/jwt'

declare module 'next-auth' {
  interface User extends DefaultUser {
    role: Role
    reputation: number
  }

  interface Session extends DefaultSession {
    user: {
      id: string
      role: Role
      reputation: number
    } & DefaultSession['user']
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    id: string
    role: Role
    reputation: number
  }
}
