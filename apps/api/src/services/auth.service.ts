import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { PrismaClient } from '@prisma/client'

export const SALT_ROUNDS = 12
export const REFRESH_TOKEN_EXPIRY_DAYS = 30

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS)
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}

export function generateRefreshToken(): string {
  return crypto.randomBytes(64).toString('hex')
}

export async function createSession(
  prisma: PrismaClient,
  userId: string,
  userAgent?: string,
  ipAddress?: string,
) {
  const refreshToken = generateRefreshToken()
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 86_400_000)

  const session = await prisma.session.create({
    data: { userId, refreshToken, expiresAt, userAgent, ipAddress },
  })
  return session
}

export async function rotateSession(
  prisma: PrismaClient,
  oldToken: string,
  userAgent?: string,
  ipAddress?: string,
) {
  const session = await prisma.session.findUnique({ where: { refreshToken: oldToken } })
  if (!session || session.expiresAt < new Date()) {
    if (session) await prisma.session.delete({ where: { id: session.id } })
    return null
  }

  await prisma.session.delete({ where: { id: session.id } })

  const refreshToken = generateRefreshToken()
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 86_400_000)
  const newSession = await prisma.session.create({
    data: { userId: session.userId, refreshToken, expiresAt, userAgent, ipAddress },
  })

  return { session: newSession, userId: session.userId }
}

export function safeUser(user: {
  id: string
  username: string
  handle: string
  email: string
  avatar: string | null
  banner: string | null
  bio: string | null
  website: string | null
  location: string | null
  role: string
  isVerified: boolean
  isOnline: boolean
  lastSeen: Date
  emailVerified: boolean
  createdAt: Date
  updatedAt: Date
}) {
  return {
    id: user.id,
    username: user.username,
    handle: user.handle,
    email: user.email,
    avatar: user.avatar,
    banner: user.banner,
    bio: user.bio,
    website: user.website,
    location: user.location,
    role: user.role,
    isVerified: user.isVerified,
    isOnline: user.isOnline,
    lastSeen: user.lastSeen,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt,
  }
}
