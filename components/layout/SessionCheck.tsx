'use client';
import { useSessionCheck } from '@/hooks/useSessionCheck';

export function SessionCheck() {
  useSessionCheck();
  return null;
}
