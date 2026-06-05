/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare module "*.mdx" {
  import type { ComponentType } from "react";
  import type { LessonMeta } from "./types/course";

  export const meta: LessonMeta;
  const MDXComponent: ComponentType;
  export default MDXComponent;
}
