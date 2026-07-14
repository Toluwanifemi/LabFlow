import { prisma } from './client';
import { ActionType } from '@/types';

interface WriteAuditLogParams {
  userId: string;
  actionType: ActionType;
  sampleId?: string | null;
  fieldChanged?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  ipAddress: string;
  labId?: string;
}

export async function writeAuditLog(params: WriteAuditLogParams) {
  let labId = params.labId;
  if (!labId) {
    const user = await prisma.user.findUnique({
      where: { id: params.userId },
      select: { labId: true },
    });
    labId = user?.labId;
  }

  return prisma.auditLog.create({
    data: {
      userId: params.userId,
      actionType: params.actionType,
      sampleId: params.sampleId ?? undefined,
      fieldChanged: params.fieldChanged ?? undefined,
      oldValue: params.oldValue ?? undefined,
      newValue: params.newValue ?? undefined,
      ipAddress: params.ipAddress,
      labId: labId ?? undefined,
    },
  });
}

export async function getAuditLogsForLab(labId: string, page = 1, limit = 25) {
  const skip = (page - 1) * limit;
  return prisma.auditLog.findMany({
    where: {
      labId,
    },
    include: {
      user: { select: { name: true, email: true } },
      sample: { select: { humanId: true } },
    },
    orderBy: { timestamp: 'desc' },
    skip,
    take: limit,
  });
}

export async function getAuditLogsCountForLab(labId: string): Promise<number> {
  return prisma.auditLog.count({
    where: {
      labId,
    },
  });
}

