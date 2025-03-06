declare module '@clerk/nextjs' {
  export const authMiddleware: (options?: { publicRoutes?: string[] }) => (req: Request) => Response | Promise<Response>;
  export const auth: () => { userId: string | null };
  export const ClerkProvider: React.FC<{ children: React.ReactNode }>;
  export const SignIn: React.FC;
  export const SignUp: React.FC;
  export const useClerk: () => {
    signOut: () => Promise<void>;
  };
} 