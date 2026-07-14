export type Role = 'ADMIN' | 'RESEARCHER' | 'STUDENT' | 'VIEWER' | 'PI';

export type ActionType =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'RESTORE'
  | 'PHASE_CHANGE'
  | 'IMAGE_ATTACH';

export type Action =
  | 'create_sample'
  | 'edit_sample'
  | 'soft_delete_sample'
  | 'restore_sample'
  | 'update_phase'
  | 'attach_image'
  | 'view_own_samples'
  | 'view_all_samples'
  | 'view_audit_log'
  | 'export_audit_log'
  | 'manage_roles'
  | 'edit_lab_settings';



export interface PhaseEntry {
  phase: string;
  updatedBy: string;
  timestamp: string;
  experimentName?: string;
}

export interface ImageEntry {
  filename: string;
  uploaderId: string;
  uploadTimestamp: string;
  url: string;
}

export interface SampleSummary {
  id: string;
  slug: string;
  humanId: string;
  sampleType: string;
  source: string;
  collectionDate: string;
  currentPhase: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  labId: string;
  images: ImageEntry[];
  description: string | null;
}



export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  labId: string;
  createdAt: string;
  lastLogin: string | null;
  isActive: boolean;
  emailVerified: string | null;
  onboardingCompleted: boolean;
}

export interface Lab {
  id: string;
  name: string;
  institution: string | null;
  createdAt: string;
}

export function parsePhaseHistory(value: unknown): PhaseEntry[] {
  if (!value || !Array.isArray(value)) return [];
  return value.map((item: any) => ({
    phase: String(item?.phase ?? ''),
    updatedBy: String(item?.updatedBy ?? ''),
    timestamp: String(item?.timestamp ?? ''),
    ...(item?.experimentName ? { experimentName: String(item.experimentName) } : {}),
  }));
}

export function parseImages(value: unknown): ImageEntry[] {
  if (!value || !Array.isArray(value)) return [];
  return value.map((item: any) => ({
    filename: String(item?.filename ?? ''),
    uploaderId: String(item?.uploaderId ?? ''),
    uploadTimestamp: String(item?.uploadTimestamp ?? ''),
    url: String(item?.url ?? ''),
  }));
}

