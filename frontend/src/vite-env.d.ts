interface ImportMetaEnv {
  readonly VITE_DATA_SOURCE?: 'api' | 'static' | 'auto';
  readonly VITE_BASE?: string;
  readonly BASE_URL: string;
  readonly MODE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
