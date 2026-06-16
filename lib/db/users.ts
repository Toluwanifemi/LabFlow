import { prisma } from './client';
import { User, Role } from '@/types';

export async function getUsersByLabId(labId: string): Promise<User[]> {
  return prisma.user.findMany({
    where: { labId, isActive: true },
    orderBy: { createdAt: 'desc' },
  }) as unknown as Promise<User[]>;
}

export async function getTotalMembers(labId: string): Promise<number> {
  return prisma.user.count({
    where: { labId }
  });
}

export async function createUser(data: { name: string; email: string; passwordHash: string; role: Role; emailVerified?: Date }, labId: string): Promise<User> {
  return prisma.user.create({
    data: {
      ...data,
      labId,
    },
  }) as unknown as Promise<User>;
}

export async function updateUserRole(userId: string, role: Role, labId: string): Promise<User> {
  return prisma.user.update({
    where: { id: userId, labId },
    data: { role },
  }) as unknown as Promise<User>;
}

export async function deactivateUser(userId: string, labId: string): Promise<User> {
  return prisma.user.update({
    where: { id: userId, labId },
    data: { isActive: false },
  }) as unknown as Promise<User>;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  return prisma.user.findUnique({
    where: { email },
  }) as unknown as Promise<User | null>;
}

export async function getUserByEmailWithLab(email: string) {
  return prisma.user.findUnique({
    where: { email },
    select: { id: true, labId: true, role: true, isActive: true, name: true },
  });
}

export async function getUserById(userId: string, labId: string) {
  return prisma.user.findUnique({
    where: { id: userId, labId },
  });
}

export async function createVerificationToken(email: string, token: string, expiresAt: Date) {
  return prisma.verificationToken.create({
    data: { email, token, expiresAt },
  });
}

export async function getUserByEmailInsensitive(email: string) {
  return prisma.user.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
  });
}

export async function createPasswordResetToken(email: string, token: string, expiresAt: Date) {
  return prisma.passwordResetToken.create({
    data: { email, token, expiresAt },
  });
}

export async function getPasswordResetToken(token: string) {
  return prisma.passwordResetToken.findUnique({ where: { token } });
}

export async function updateUserPassword(email: string, passwordHash: string) {
  return prisma.user.update({
    where: { email },
    data: { passwordHash },
  });
}

export async function markPasswordResetTokenUsed(tokenId: string) {
  return prisma.passwordResetToken.update({
    where: { id: tokenId },
    data: { usedAt: new Date() },
  });
}

export async function getVerificationToken(token: string) {
  return prisma.verificationToken.findUnique({ where: { token } });
}

export async function completeUserOnboarding(userId: string, data: { role?: Role; onboardingCompleted?: boolean }) {
  return prisma.user.update({
    where: { id: userId },
    data,
  });
}

export async function verifyUserByEmail(email: string, passwordHash: string, tokenId: string) {
  return prisma.$transaction([
    prisma.user.update({
      where: { email },
      data: { passwordHash, emailVerified: new Date(), onboardingCompleted: true },
    }),
    prisma.verificationToken.update({
      where: { id: tokenId },
      data: { usedAt: new Date() },
    }),
  ]);
}
