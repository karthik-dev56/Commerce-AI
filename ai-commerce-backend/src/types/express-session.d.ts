import "express-session";

declare module "express-session" {
  interface SessionData {
    userId?: string;

    user?: {
      googleId: string;
      email: string | null;
      name: string | null;
      picture: string | null;
    };
  }
}