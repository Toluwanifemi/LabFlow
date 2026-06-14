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
}

export async function writeAuditLog(params: WriteAuditLogParams) {
  return prisma.auditLog.create({
    data: {
      userId: params.userId,
      actionType: params.actionType,
      sampleId: params.sampleId ?? undefined,
      fieldChanged: params.fieldChanged ?? undefined,
      oldValue: params.oldValue ?? undefined,
      newValue: params.newValue ?? undefined,
      ipAddress: params.ipAddress,
    },
  });
}

export async function getAuditLogsForLab(labId: string) {
  return prisma.auditLog.findMany({
    where: {
      user: { labId }
    },
    include: {
      user: { select: { name: true, email: true } },
      sample: { select: { humanId: true } }
    },
    orderBy: { timestamp: 'desc' }
  });
}

export async function getRecentActivitiesCount(labId: string): Promise<number> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  return prisma.auditLog.count({
    where: {
      user: { labId },
      timestamp: { gte: sevenDaysAgo }
    }
  });
}
