import { Role, Action } from '@/types';

const PERMISSIONS: Record<Action, Role[]> = {
  create_sample:       ['ADMIN', 'PI', 'RESEARCHER', 'STUDENT'],
  edit_sample:         ['ADMIN', 'PI', 'RESEARCHER', 'STUDENT'],
  soft_delete_sample:  ['ADMIN', 'PI'],
  restore_sample:      ['ADMIN', 'PI'],
  update_phase:        ['ADMIN', 'PI', 'RESEARCHER', 'STUDENT'],
  attach_image:        ['ADMIN', 'PI', 'RESEARCHER', 'STUDENT'],
  view_own_samples:    ['ADMIN', 'PI', 'RESEARCHER', 'STUDENT', 'VIEWER'],
  view_all_samples:    ['ADMIN', 'PI', 'RESEARCHER', 'VIEWER'],
  view_audit_log:      ['ADMIN', 'PI'],
  export_audit_log:    ['ADMIN', 'PI'],
  manage_roles:        ['ADMIN', 'PI'],
  edit_lab_settings:   ['ADMIN', 'PI'],
};

export function canPerformAction(role: Role, action: Action): boolean {
  return PERMISSIONS[action]?.includes(role) ?? false;
}

