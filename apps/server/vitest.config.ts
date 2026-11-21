import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Vitest uses esbuild by default, which cannot emit decorator metadata.
  // SWC is configured below to emit it so Nest DI works in tests too.
  plugins: [
    swc.vite({
      jsc: {
        target: "es2022",
        parser: { syntax: "typescript", decorators: true },
        transform: { legacyDecorator: true, decoratorMetadata: true },
      },
    }),
  ],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    hookTimeout: 30_000,
  },
});
