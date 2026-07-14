import { User as PrismaUser, Lab as PrismaLab } from '@prisma/client';
import type { User, Lab } from '@/types';

export function toUser(u: PrismaUser): User {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role as User['role'],
    labId: u.labId,
    createdAt: u.createdAt.toISOString(),
    lastLogin: u.lastLogin?.toISOString() ?? null,
    isActive: u.isActive,
    emailVerified: u.emailVerified?.toISOString() ?? null,
    onboardingCompleted: u.onboardingCompleted,
  };
}

export function toLab(l: PrismaLab): Lab {
  return {
    id: l.id,
    name: l.name,
    institution: l.institution ?? null,
    createdAt: l.createdAt.toISOString(),
  };
}
