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

export type SampleType = string;
export type Group = 'CONTROL' | 'NMU' | 'TREATMENT';
export type Sex = 'MALE' | 'FEMALE';
export type PhaseType = string;
export type AnalysisType = 'RNA' | 'HISTOLOGY' | 'PCR' | 'SEQUENCING';
export type ImageType = 'TUMOR' | 'MICROSCOPY' | 'GEL' | 'OTHER';

export interface PhaseEntry {
  phase: string;
  updatedBy: string;
  timestamp: string;
}

export interface ImageEntry {
  filename: string;
  uploaderId: string;
  uploadTimestamp: string;
  url: string;
}

export interface Sample {
  id: string;
  slug: string;
  humanId: string;
  qrCodeUrl: string | null;
  sampleType: SampleType;
  source: string;
  collectionDate: string;        // ISO date string
  description: string | null;
  experimentType: string | null;
  currentPhase: PhaseType | null;
  phaseHistory: PhaseEntry[];
  images: ImageEntry[];
  createdById: string;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  deletedAt: string | null;
  deletedById: string | null;
  labId: string;

  // Expanded fields
  parentSampleId: string | null;
  group: Group | null;
  sex: Sex | null;
  age: number | null;

  // Relations
  phaseHistories?: SamplePhaseHistory[];
  treatmentLogs?: TreatmentLog[];
  observationLogs?: ObservationLog[];
  analysisRecords?: AnalysisRecord[];
  sampleImages?: SampleImage[];
}

export interface SamplePhaseHistory {
  id: string;
  sampleId: string;
  phase: PhaseType;
  notes: string | null;
  updatedById: string;
  timestamp: string;
}

export interface TreatmentLog {
  id: string;
  sampleId: string;
  treatmentType: string;
  dose: string;
  route: string;
  frequency: string;
  administeredById: string;
  administeredAt: string;
  notes: string | null;
}

export interface ObservationLog {
  id: string;
  sampleId: string;
  tumorPresent: boolean;
  tumorSizeMm: number | null;
  bodyWeight: number | null;
  condition: string | null;
  observedById: string;
  observedAt: string;
  notes: string | null;
}

export interface AnalysisRecord {
  id: string;
  sampleId: string;
  analysisType: AnalysisType;
  resultSummary: string | null;
  performedById: string;
  performedAt: string;
}

export interface SampleImage {
  id: string;
  sampleId: string;
  imageUrl: string;
  imageType: ImageType;
  uploadedById: string;
  uploadedAt: string;
}

export interface AuditLogEntry {
  id: string;
  userId: string;
  actionType: ActionType;
  sampleId: string;
  fieldChanged: string | null;
  oldValue: string | null;
  newValue: string | null;
  timestamp: string;
  ipAddress: string;
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

export interface GoQRReadSymbol {
  seq: number;
  data: string | null;
  error: string | null;
}

export interface GoQRReadResponse {
  type: string;
  symbol: GoQRReadSymbol[];
}
