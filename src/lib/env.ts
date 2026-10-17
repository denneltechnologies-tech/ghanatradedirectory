export const env = {
  appUrl: process.env.APP_URL ?? "http://localhost:3000",
  sessionSecret:
    process.env.SESSION_SECRET ?? "dev-only-change-me-6f2c1a9b4d8e7f3a2c5b9e1d4a7f0c3b",
  sessionCookie: process.env.SESSION_COOKIE_NAME ?? "ght_session",
  storageDir: process.env.STORAGE_DIR ?? "./storage",
  adminEmails: (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean),
} as const;

export const SESSION_TTL_DAYS = 30;
