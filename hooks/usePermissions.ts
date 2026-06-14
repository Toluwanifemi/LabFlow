import { useSession } from 'next-auth/react';
import { canPerformAction } from '@/lib/auth/permissions';
import { Action } from '@/types';

export function usePermissions() {
  const { data: session } = useSession();
  const role = session?.user?.role;

  const hasPermission = (action: Action) => {
    if (!role) return false;
    return canPerformAction(role, action);
  };

  return { hasPermission, role };
}
