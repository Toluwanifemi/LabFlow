import NextAuth, { DefaultSession } from 'next-auth';
import { Role } from './index';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: Role;
      labId: string;
      labName: string;
      onboardingCompleted: boolean;
    } & DefaultSession['user'];
  }

  interface User {
    id: string;
    role: Role;
    labId: string;
    labName: string;
    onboardingCompleted: boolean;
  }
}
