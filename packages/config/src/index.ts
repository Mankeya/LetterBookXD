export { securityConfig, type SecurityConfig } from "./security.js";
export { externalApis, type ExternalApis, requiredEnvVars, optionalEnvVars, validateEnv, createConfig } from "./apis.js";

export const config = createConfig();
export type Config = ReturnType<typeof createConfig>;
