import { Capacitor } from "@capacitor/core";

export const DEFAULT_SERVER_URL = "https://osama-stadio.onrender.com";

export function getApiBase(): string {
  if (typeof window !== "undefined") {
    const custom = localStorage.getItem("osama_api_url");
    if (custom && custom.trim()) {
      const trimmed = custom.trim().replace(/\/$/, "");
      // If running inside native Android/iOS app, localhost/127.0.0.1 is unreachable
      const isNative = typeof Capacitor !== "undefined" && Capacitor.isNativePlatform();
      if (isNative && (trimmed.includes("localhost") || trimmed.includes("127.0.0.1"))) {
        return DEFAULT_SERVER_URL;
      }
      return trimmed;
    }
  }
  return (process.env.NEXT_PUBLIC_API_URL || DEFAULT_SERVER_URL).replace(/\/$/, "");
}

export function setCustomApiBase(url: string) {
  if (typeof window !== "undefined") {
    if (!url || url.trim() === DEFAULT_SERVER_URL) {
      localStorage.removeItem("osama_api_url");
    } else {
      localStorage.setItem("osama_api_url", url.trim().replace(/\/$/, ""));
    }
  }
}

export const API_BASE = {
  toString() {
    return getApiBase();
  },
};

export interface Scene {
  scene_number: number;
  narration: string;
  search_keywords: string;
  visual_description?: string;
}

export interface VideoScript {
  title: string;
  description: string;
  tags: string[];
  scenes: Scene[];
}

export interface TaskStatus {
  task_id: string;
  status: "queued" | "processing" | "completed" | "failed";
  progress: number;
  step: string;
  video_id?: string;
  video_url?: string;
  error?: string;
}

export interface HealthStatus {
  status: string;
  llm_provider?: string;
  voice_provider?: string;
  media_provider?: string;
  has_gemini: boolean;
  has_pexels: boolean;
  ffmpeg?: boolean;
  ffprobe?: boolean;
  disk_free_gb?: number;
  youtube: {
    authenticated: boolean;
    channel_name: string | null;
  };
  available_voices: Record<string, string>;
}

export interface PublicSettings {
  llm: {
    provider: "gemini" | "openai" | "groq" | "openrouter";
    has_gemini_key: boolean;
    gemini_key_masked: string;
    has_openai_key: boolean;
    openai_key_masked: string;
    has_groq_key: boolean;
    groq_key_masked: string;
    has_openrouter_key: boolean;
    openrouter_key_masked: string;
    model_name: string;
  };
  voice: {
    provider: "edge_tts" | "elevenlabs" | "openai_tts";
    has_elevenlabs_key: boolean;
    elevenlabs_key_masked: string;
    elevenlabs_voice_id: string;
    has_openai_tts_key: boolean;
    voice_name: string;
  };
  media: {
    provider: "pexels" | "pixabay";
    has_pexels_key: boolean;
    pexels_key_masked: string;
    has_pixabay_key: boolean;
    pixabay_key_masked: string;
  };
  publishing: {
    youtube_enabled: boolean;
    tiktok_enabled: boolean;
    has_telegram_token: boolean;
    telegram_token_masked: string;
    telegram_chat_id: string;
  };
}

export async function fetchSettings(): Promise<PublicSettings> {
  const res = await fetch(`${API_BASE}/api/settings`);
  if (!res.ok) throw new Error("تعذر جلب الإعدادات");
  return res.json();
}

export async function updateSettings(data: Partial<Record<string, any>>): Promise<{ success: boolean; settings: PublicSettings }> {
  const res = await fetch(`${API_BASE}/api/settings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("فشل تحديث الإعدادات");
  return res.json();
}

export interface HistoryItem {
  video_id: string;
  title: string;
  description: string;
  tags: string[];
  category: string;
  visual_mode: string;
  voice?: string;
  scenes?: Scene[];
  music_enabled?: boolean;
  has_subtitles?: boolean;
  youtube_video_id?: string;
  voice_rate?: number;
  subtitle_style?: string;
  title_card?: boolean;
  duration: number;
  status: string;
  published: boolean;
  published_url?: string;
  video_url: string;
  created_at: string;
}

export async function fetchHealth(): Promise<HealthStatus> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(`${API_BASE}/api/health`, { signal: controller.signal });
    if (!res.ok) throw new Error("تعذر الاتصال بالخادم");
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function generateScript(
  prompt: string, 
  category: string, 
  tone: string, 
  duration: number,
  customSystemPrompt?: string,
  sceneCount: number = 0
): Promise<VideoScript> {
  const res = await fetch(`${API_BASE}/api/script/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ 
      prompt, 
      category, 
      tone, 
      duration,
      custom_system_prompt: customSystemPrompt,
      scene_count: sceneCount
    }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "فشل توليد السيناريو");
  }
  return res.json();
}

export async function triggerRender(
  script: VideoScript, 
  voice: string,
  category: string = "general",
  visualMode: string = "auto",
  includeSubtitles: boolean = false,
  musicEnabled: boolean = false,
  voiceRate: number = 1.0,
  subtitleStyle: string = "karaoke",
  titleCard: boolean = true
): Promise<{ task_id: string; status: string }> {
  const res = await fetch(`${API_BASE}/api/video/render`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ 
      ...script, 
      voice, 
      category, 
      visual_mode: visualMode,
      include_subtitles: includeSubtitles,
      music_enabled: musicEnabled,
      voice_rate: voiceRate,
      subtitle_style: subtitleStyle,
      title_card: titleCard
    }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "فشل بدء إنتاج الفيديو");
  }
  return res.json();
}

export async function fetchHistory(): Promise<HistoryItem[]> {
  const res = await fetch(`${API_BASE}/api/history`);
  if (!res.ok) throw new Error("تعذر جلب سجل الفيديوهات");
  return res.json();
}

export async function deleteHistory(videoId: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/api/history/${videoId}`, {
    method: "DELETE",
  });
  return res.ok;
}

export async function getTaskStatus(taskId: string): Promise<TaskStatus> {
  const res = await fetch(`${API_BASE}/api/video/status/${taskId}`);
  if (!res.ok) throw new Error("تعذر جلب حالة المهمة");
  return res.json();
}

export function getVideoMediaUrl(videoId: string): string {
  return `${API_BASE}/api/video/stream/${videoId}`;
}

export async function triggerYoutubeAuth(): Promise<{ success: boolean; message?: string; error?: string }> {
  const res = await fetch(`${API_BASE}/api/youtube/auth`);
  return res.json();
}

export async function regenerateScene(data: {
  category: string;
  tone: string;
  narration: string;
  scene_number: number;
}): Promise<{ narration: string; search_keywords: string; visual_description: string }> {
  const res = await fetch(`${API_BASE}/api/script/regenerate-scene`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "فشل إعادة توليد المشهد");
  }
  return res.json();
}

export function getVideoThumbUrl(videoId: string): string {
  return `${API_BASE}/api/video/thumb/${videoId}`;
}

export async function fetchTitleVariations(data: {
  title: string;
  description: string;
  category: string;
  tone: string;
}): Promise<{ titles: string[] }> {
  const res = await fetch(`${API_BASE}/api/script/title-variations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "فشل توليد عناوين بديلة");
  }
  return res.json();
}

export async function previewVoice(text: string, voice: string): Promise<string> {
  const res = await fetch(`${API_BASE}/api/voice/preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, voice }),
  });
  if (!res.ok) throw new Error("فشل معاينة الصوت");
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

export async function fetchMusicList(): Promise<{ name: string; size_kb: number }[]> {
  const res = await fetch(`${API_BASE}/api/music`);
  if (!res.ok) return [];
  return res.json();
}

export async function uploadMusic(file: File): Promise<{ success: boolean; name: string }> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_BASE}/api/music/upload`, { method: "POST", body: form });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "فشل رفع الموسيقى");
  }
  return res.json();
}

export function getMusicStreamUrl(): string {
  return `${API_BASE}/api/music/stream`;
}

export interface QueueItem {
  queue_id: string;
  title: string;
  category: string;
  visual_mode: string;
  status: "queued" | "processing" | "done" | "failed";
  task_id?: string | null;
  video_id?: string | null;
  error?: string | null;
  created_at: string;
}

export async function fetchQueue(): Promise<QueueItem[]> {
  const res = await fetch(`${API_BASE}/api/queue`);
  if (!res.ok) return [];
  return res.json();
}

export async function addToQueue(data: Record<string, unknown>): Promise<{ queue_id: string; position: number }> {
  const res = await fetch(`${API_BASE}/api/queue/add`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "فشل الإضافة للطابور");
  }
  return res.json();
}

export async function removeFromQueue(queueId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/queue/${queueId}`, { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "فشل الحذف من الطابور");
  }
}

export async function retryQueueItem(queueId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/queue/${queueId}/retry`, { method: "POST" });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "فشل إعادة التشغيل");
  }
}

export interface Schedule {
  id: string;
  prompt: string;
  category: string;
  tone: string;
  duration: number;
  scene_count: number;
  voice: string;
  visual_mode: string;
  include_subtitles: boolean;
  music_enabled: boolean;
  voice_rate: number;
  subtitle_style: string;
  title_card: boolean;
  time: string;
  auto_publish: boolean;
  privacy: string;
  enabled: boolean;
  created_at?: string;
  last_run?: string;
  last_status?: string;
  last_video_id?: string;
}

export async function fetchSchedules(): Promise<Schedule[]> {
  const res = await fetch(`${API_BASE}/api/autopilot`);
  if (!res.ok) return [];
  return res.json();
}

export async function createSchedule(data: Record<string, unknown>): Promise<Schedule> {
  const res = await fetch(`${API_BASE}/api/autopilot`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "فشل إنشاء الجدولة");
  }
  return res.json();
}

export async function updateSchedule(id: string, updates: Record<string, unknown>): Promise<Schedule> {
  const res = await fetch(`${API_BASE}/api/autopilot/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error("فشل تحديث الجدولة");
  return res.json();
}

export async function deleteSchedule(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/autopilot/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("فشل حذف الجدولة");
}

export async function runScheduleNow(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/autopilot/${id}/run-now`, { method: "POST" });
  if (!res.ok) throw new Error("فشل التشغيل الفوري");
}

export async function downloadBackup(): Promise<void> {
  const res = await fetch(`${API_BASE}/api/backup`);
  if (!res.ok) throw new Error("فشل إنشاء النسخة");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `osama_studio_backup_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function restoreBackup(file: File): Promise<void> {
  const bundle = JSON.parse(await file.text());
  const res = await fetch(`${API_BASE}/api/backup/restore`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(bundle),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "فشل الاستعادة");
  }
}

export async function testNotify(botToken?: string, chatId?: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/notify/test`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bot_token: botToken || null, chat_id: chatId || null }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "فشل الإرسال");
  }
}

export async function fetchTaskLog(taskId: string): Promise<string> {
  const res = await fetch(`${API_BASE}/api/video/log/${taskId}`);
  if (!res.ok) throw new Error("لا يوجد سجل لهذه المهمة");
  return res.text();
}

export interface StorageStats {
  output_mb: number;
  temp_mb: number;
  music_mb: number;
  videos: number;
}

export async function fetchStorageStats(): Promise<StorageStats> {
  const res = await fetch(`${API_BASE}/api/storage/stats`);
  if (!res.ok) throw new Error("تعذر جلب إحصائيات التخزين");
  return res.json();
}

export async function cleanupStorage(): Promise<{ success: boolean; freed_mb: number }> {
  const res = await fetch(`${API_BASE}/api/storage/cleanup`, { method: "POST" });
  if (!res.ok) throw new Error("فشل التنظيف");
  return res.json();
}

export function getSrtDownloadUrl(videoId: string): string {
  return `${API_BASE}/api/video/srt/${videoId}`;
}

export async function fetchYoutubeStats(ids: string[]): Promise<Record<string, { views: number; likes: number; comments: number }>> {
  if (ids.length === 0) return {};
  const res = await fetch(`${API_BASE}/api/youtube/stats?ids=${encodeURIComponent(ids.join(","))}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "فشل جلب الإحصائيات");
  }
  return res.json();
}

export async function publishToYouTube(data: {
  video_id: string;
  title: string;
  description: string;
  tags: string[];
  privacy: string;
  publish_at?: string;
}): Promise<{ success: boolean; url: string; scheduled?: boolean }> {
  const res = await fetch(`${API_BASE}/api/youtube/publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "فشل نشر الفيديو على يوتيوب");
  }
  return res.json();
}
