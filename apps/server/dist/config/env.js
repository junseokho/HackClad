export const env = {
    PORT: 3000,
    JWT_SECRET: process.env.JWT_SECRET ?? "dev-secret-change-me",
    DATABASE_URL: process.env.DATABASE_URL ?? "file:./data/dev.db",
    SIGNUP_INVITE_CODE: process.env.SIGNUP_INVITE_CODE ?? "cbnutrpg",
    CORS_ORIGIN: process.env.CORS_ORIGIN ?? "*"
};
//# sourceMappingURL=env.js.map