import { defineConfig } from 'eslint/config';
import expoConfig from 'eslint-config-expo/flat.js';

export default defineConfig([
  expoConfig,
  {
    // server/gemini-proxy is a separate Cloudflare Workers project with its own
    // tsconfig/toolchain, not part of the Expo app's lint scope.
    ignores: ['dist/*', 'server/**'],
  },
]);
