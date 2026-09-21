import dotenv from 'dotenv';
dotenv.config();
const nodeEnv = process.env.NODE_ENV ?? 'development';
const jwtSecret = process.env.JWT_SECRET ?? 'development-secret';
if (nodeEnv === 'production' && jwtSecret === 'development-secret') {
  throw new Error('JWT_SECRET must be configured with a strong value in production');
}
export const env = {
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: process.env.DATABASE_URL ?? 'mysql://cec_app:change-me@localhost:3306/cec_portal',
  jwtSecret,
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL ?? '15m',
  refreshTokenTtl: process.env.REFRESH_TOKEN_TTL ?? '7d',
  nodeEnv,
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
  googleRedirectUri: process.env.GOOGLE_REDIRECT_URI ?? 'http://localhost:4000/api/auth/google/login-callback',
  clientUrl: process.env.CLIENT_URL ?? 'http://localhost:5173',
  emailFrom: process.env.EMAIL_FROM ?? 'CEC Portal <no-reply@cec.edu>',
  smtpHost: process.env.SMTP_HOST ?? '',
  smtpPort: Number(process.env.SMTP_PORT ?? 587),
  smtpUser: process.env.SMTP_USER ?? '',
  smtpPassword: process.env.SMTP_PASSWORD ?? '',
  enrollmentApprovalSecret: process.env.ENROLLMENT_APPROVAL_SECRET ?? ''
};
