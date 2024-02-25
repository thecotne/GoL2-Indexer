import { vitePlugin as remix } from "@remix-run/dev";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import packageJSON from "./package.json";

export default defineConfig({
  plugins: [remix(), tsconfigPaths()],
  ssr: {
    noExternal: packageJSON.devDependencies
      ? Object.keys(packageJSON.devDependencies)
      : undefined,
  },
});
