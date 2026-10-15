export type Lang = "tr" | "en";

export type PerfProfile = "low" | "medium" | "high";

export type Screen =
  | "home"
  | "projects"
  | "assets"
  | "studio"
  | "editor"
  | "audio"
  | "effects"
  | "modules"
  | "settings";

export type ModuleStatus =
  | "not_installed"
  | "downloading"
  | "paused"
  | "verifying"
  | "installing"
  | "installed"
  | "outdated"
  | "error";

export interface ModuleInfo {
  id: string;
  name: string;
  description: string;
  category: string;
  version: string;
  developer: string;
  downloadSize: number;
  installSize: number;
  coreCompat: string;
  dependencies: string[];
  status: ModuleStatus;
  progress: number;
  downloadedBytes: number;
  totalBytes: number;
  speed: number;
  eta: number;
  error?: string;
  installedAt?: number;
}

export interface Clip {
  id: string;
  track: number;
  type: "video" | "image" | "text" | "audio" | "overlay";
  name: string;
  start: number;
  duration: number;
  color: string;
  opacity: number;
  speed: number;
  reversed: boolean;
  frozen: boolean;
  effects: string[];
  thumb?: string;
  volume: number;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  crop: number;
}

export interface Track {
  id: number;
  name: string;
  type: "video" | "audio" | "overlay";
  muted: boolean;
  locked: boolean;
  volume: number;
}

export interface Project {
  id: string;
  name: string;
  resolution: string;
  fps: number;
  aspect: string;
  createdAt: number;
  updatedAt: number;
  clips: Clip[];
  tracks: Track[];
  modules: string[];
  history: HistoryEntry[];
  historyIndex: number;
  cover?: string;
}

export interface HistoryEntry {
  label: string;
  snapshot: string;
  at: number;
}

export interface EffectParam {
  id: string;
  name: string;
  type: "number" | "color" | "boolean" | "select";
  value: number | string | boolean;
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
  keyframes?: { t: number; v: number }[];
}

export interface EffectDef {
  id: string;
  name: string;
  category: "video" | "audio";
  params: EffectParam[];
  builtin: boolean;
}

export interface Preset {
  id: string;
  name: string;
  effectId: string;
  params: Record<string, any>;
  createdAt: number;
}

export interface AudioChain {
  id: string;
  name: string;
  effects: { id: string; params: Record<string, any> }[];
}

export type PreviewMode = "auto" | "manual";
export type PreviewResolution = "360p" | "480p" | "720p" | "1080p" | "original";
export type PreviewScale = 25 | 50 | 75 | 100;
export type EffectPreviewQuality = "fast" | "balanced" | "full";
export type ProxyMode = "auto" | "always" | "off";
export type ExportResolution = "480p" | "720p" | "1080p" | "2K" | "4K";
export type ExportFps = 15 | 24 | 30 | 60 | 120;
export type ExportQuality = "saver" | "balanced" | "high" | "max";
export type RenderStatus =
  | "PENDING"
  | "PREPARING"
  | "RENDERING"
  | "PAUSED"
  | "RECOVERING"
  | "FINALIZING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";
export type CodecChoice = "auto" | "h264" | "h265" | "av1";

export interface PreviewSettings {
  mode: PreviewMode;
  profile: PerfProfile;
  resolution: PreviewResolution;
  scale: PreviewScale;
  effectQuality: EffectPreviewQuality;
  proxy: ProxyMode;
}

export interface ExportSettings {
  resolution: ExportResolution;
  fps: ExportFps;
  quality: ExportQuality;
  codec: CodecChoice;
  bitrate: number;
  audioBitrate: number;
  audioSampleRate: number;
  estimateSizeMB: number;
  estimateTimeSec: number;
}

export interface RenderJob {
  id: string;
  projectId: string;
  status: RenderStatus;
  progress: number;
  eta: number;
  speed: number;
  frame: number;
  totalFrames: number;
  resolution: string;
  fps: number;
  codec: string;
  outputPath?: string;
  error?: string;
  createdAt: number;
  pausedAt?: number;
  recoveredFrom?: string;
}

export interface SettingsState {
  lang: Lang;
  perf: PerfProfile;
  theme: "dark" | "light";
  onboardingDone: boolean;
  storageLocation: string;
  catalogUrl: string;
  autoSave: boolean;
  preview: PreviewSettings;
  export: ExportSettings;
}

export interface MediaAsset {
  id: string;
  name: string;
  type: "video" | "image" | "audio";
  thumb: string;
  duration: number;
}