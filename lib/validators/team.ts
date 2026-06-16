import { z } from 'zod';

const RoleSchema = z.enum(['ADMIN', 'RESEARCHER', 'STUDENT', 'VIEWER', 'PI']);

export const createMemberSchema = z.object({
  name: z.string().min(2, 'Name is required (min 2 chars)').trim(),
  email: z.string().email('Invalid email address').trim().toLowerCase(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: RoleSchema,
});

export const updateRoleSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  role: RoleSchema,
});

export const removeMemberSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
});
