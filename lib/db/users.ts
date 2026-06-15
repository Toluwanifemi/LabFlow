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

export async function createUser(data: { name: string; email: string; passwordHash: string; role: Role }, labId: string): Promise<User> {
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
