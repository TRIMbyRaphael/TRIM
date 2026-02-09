/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_LANG: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
