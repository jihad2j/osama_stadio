"use client";

import React, { useState, useEffect } from "react";
import { 
  Sparkles, 
  Video, 
  Play, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Volume2, 
  Search, 
  Plus, 
  Trash2, 
  RefreshCw, 
  ExternalLink,
  ChevronLeft,
  Settings2,
  Film,
  Layers,
  ArrowRight,
  ShieldCheck,
  Check,
  Folder,
  Download,
  Car,
  CarFront,
  Gauge,
  RotateCcw,
  Link2,
  Copy,
  Dices,
  CalendarClock,
  Music,
  TrendingUp,
  Bookmark,
  Moon,
  ChevronUp,
  ChevronDown,
  BookOpen,
  FileText,
  HelpCircle,
  SlidersHorizontal,
  Palette,
  Type,
  AlertTriangle
} from "lucide-react";
import {
  fetchHealth,
  getApiBase,
  setCustomApiBase,
  DEFAULT_SERVER_URL,
  generateScript,
  triggerRender,
  getTaskStatus,
  getVideoMediaUrl,
  getVideoThumbUrl,
  publishToYouTube,
  fetchHistory,
  deleteHistory,
  triggerYoutubeAuth,
  regenerateScene,
  fetchTitleVariations,
  previewVoice,
  fetchMusicList,
  uploadMusic,
  getMusicStreamUrl,
  getSrtDownloadUrl,
  fetchYoutubeStats,
  fetchQueue,
  addToQueue,
  removeFromQueue,
  retryQueueItem,
  fetchTaskLog,
  fetchStorageStats,
  cleanupStorage,
  StorageStats,
  downloadBackup,
  restoreBackup,
  QueueItem,
  fetchSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  runScheduleNow,
  Schedule,
  VideoScript,
  Scene,
  TaskStatus,
  HealthStatus,
  HistoryItem
} from "@/lib/api";
import SettingsModal from "@/components/SettingsModal";

function YouTubeIcon({ className = "w-5 h-5 text-red-500" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  );
}

const NICHES = [
  {
    id: "google_veo",
    title: "Google Veo سينمائي 🌟",
    subtitle: "توليد فيديو حقيقي ذكاء اصطناعي (اشتراك Pro)",
    icon: Sparkles,
    color: "from-amber-500 via-red-600 to-purple-700",
    badgeColor: "bg-purple-500/20 text-purple-300 border-purple-500/40",
    defaultPrompt: "مشهد سينمائي واقعي مذهل لسيارة خارقة تسير في شوارع طوكيو ليلاً مع انعكاس أضواء النيون والمطر بدقة 4K",
    defaultTone: "حماسي ومليء بالإثارة",
    visualMode: "veo_ai"
  },
  {
    id: "real_cars",
    title: "سيارات حقيقية 🏎️",
    subtitle: "سباقات وسيارات حقيقية بمشاهد واقعية",
    icon: Car,
    color: "from-red-600 to-red-800",
    badgeColor: "bg-red-500/20 text-red-400 border-red-500/30",
    defaultPrompt: "سباق مثير بين سيارة رياضية حمراء وسيارة خارقة سوداء على طريق سريع مع أصوات محركات قوية وحماس",
    defaultTone: "حماسي ومليء بالإثارة",
    visualMode: "auto_real"
  },
  {
    id: "car_facts",
    title: "حقائق سيارات مذهلة",
    subtitle: "معلومات وأرقام عن سيارات حقيقية",
    icon: Gauge,
    color: "from-amber-500 to-orange-600",
    badgeColor: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    defaultPrompt: "أغرب 5 حقائق عن أسرع السيارات الخارقة في العالم وأسعارها الصادمة",
    defaultTone: "مشوق ومليء بالمعلومات",
    visualMode: "auto_real"
  },
  {
    id: "kids_cars",
    title: "سيارات كرتون للأطفال",
    subtitle: "شخصيات سيارات كرتونية 3D مرحة",
    icon: CarFront,
    color: "from-orange-500 to-amber-600",
    badgeColor: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    defaultPrompt: "سباق حماسي بين سيارة حمراء صغيرة وشاحنة عملاقة مبهجة يعلم الأطفال أن التعاون والمحاولة يصنعان الفوز",
    defaultTone: "حماسي ومرح للأطفال",
    visualMode: "ai_cartoon"
  },
  {
    id: "kids_alphabet",
    title: "تعليم الحروف والأرقام",
    subtitle: "حروف وأرقام كرتونية 3D مرحة للأطفال",
    icon: BookOpen,
    color: "from-pink-500 to-rose-600",
    badgeColor: "bg-pink-500/20 text-pink-400 border-pink-500/30",
    defaultPrompt: "تعليم حرف (س) للأطفال مع شخصية سيارة كرتونية وساعة سحرية ونطق ممتع يشجع الطفل على الترديد",
    defaultTone: "تعليمي ومبهج للأطفال",
    visualMode: "ai_cartoon"
  },
  {
    id: "kids_stories",
    title: "قصص أطفال قبل النوم 🌙",
    subtitle: "حكايات كرتونية دافئة بعبرة لطيفة",
    icon: Moon,
    color: "from-blue-600 to-blue-800",
    badgeColor: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    defaultPrompt: "قصة الأرنب الصغير الذي أضاع طريقه في الغابة وتعلم الشجاعة بمساعدة أصدقائه",
    defaultTone: "دافئ وحنون للأطفال",
    visualMode: "ai_cartoon"
  },
  {
    id: "cinematic_story",
    title: "قصص وعبر ملهمة",
    subtitle: "قصص حكمة وروايات مشوقة بأسلوب وثائقي",
    icon: FileText,
    color: "from-emerald-500 to-teal-600",
    badgeColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    defaultPrompt: "قصة تاجر حكيم فقد كل أمواله في الصحراء وعاد بثروة أكبر بفضل كلمة واحدة قالها لصديقه",
    defaultTone: "سرد قصصي درامي وتأملي",
    visualMode: "ai_cinematic"
  },
  {
    id: "mystery_tales",
    title: "غموض وأساطير",
    subtitle: "أسرار تاريخية وظواهر مشوقة بحبكة قوية",
    icon: HelpCircle,
    color: "from-purple-600 to-purple-800",
    badgeColor: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    defaultPrompt: "سر القرية المنسية تحت الرمال التي اختفى سكانها فجأة في ليلة واحدة ولم يتركوا أثراً",
    defaultTone: "غامض ومشوق جداً",
    visualMode: "ai_cinematic"
  },
  {
    id: "custom",
    title: "برومت حر مخصص",
    subtitle: "تحكم كامل في توجيهات الذكاء الاصطناعي",
    icon: SlidersHorizontal,
    color: "from-gray-500 to-gray-700",
    badgeColor: "bg-gray-500/20 text-gray-400 border-gray-500/30",
    defaultPrompt: "",
    defaultTone: "حماسي وملهم",
    visualMode: "auto"
  }
];

export default function OsamaStudioDashboard() {
  // Navigation & Pipeline State
  const [step, setStep] = useState<"input" | "review" | "rendering" | "preview" | "published" | "history" | "queue" | "autopilot">("input");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [serverState, setServerState] = useState<"checking" | "connected" | "error">("checking");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Input Data & Niches
  const [selectedNiche, setSelectedNiche] = useState<string>("real_cars");
  const [visualMode, setVisualMode] = useState<string>("auto_real");
  const [userPrompt, setUserPrompt] = useState(NICHES[0].defaultPrompt);
  const [tone, setTone] = useState(NICHES[0].defaultTone);
  const [duration, setDuration] = useState(35);
  const [sceneCount, setSceneCount] = useState(0); // 0 = تلقائي
  const [connectingYt, setConnectingYt] = useState(false);

  const TONE_PRESETS = [
    "حماسي وملهم",
    "حماسي ومليء بالإثارة",
    "تعليمي ومبهج للأطفال",
    "سرد قصصي درامي وتأملي",
    "غامض ومشوق جداً",
    "تحفيزي قوي",
    "كوميدي خفيف",
  ];
  const [showCustomPrompt, setShowCustomPrompt] = useState(false);
  const [customSystemPrompt, setCustomSystemPrompt] = useState("");

  // Step 2: Script Data for Review & Edit
  const [script, setScript] = useState<VideoScript | null>(null);
  const [selectedVoice, setSelectedVoice] = useState("ar-SA-HamedNeural");
  const [includeSubtitles, setIncludeSubtitles] = useState(false);
  const [voiceRate, setVoiceRate] = useState(1.0);
  const [subtitleStyle, setSubtitleStyle] = useState("karaoke");
  const [titleCard, setTitleCard] = useState(true);

  // Queue state
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [queueMsg, setQueueMsg] = useState<string | null>(null);

  // Autopilot state
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [apPrompt, setApPrompt] = useState("");
  const [apNiche, setApNiche] = useState("real_cars");
  const [apTime, setApTime] = useState("18:00");
  const [apAutoPublish, setApAutoPublish] = useState(false);
  const [creatingSchedule, setCreatingSchedule] = useState(false);

  const loadSchedules = async () => {
    try {
      setSchedules(await fetchSchedules());
    } catch {
      /* backend offline */
    }
  };

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apPrompt.trim()) return;
    setCreatingSchedule(true);
    try {
      const n = NICHES.find(x => x.id === apNiche);
      await createSchedule({
        prompt: apPrompt,
        category: apNiche,
        tone: n?.defaultTone || tone,
        duration,
        scene_count: sceneCount,
        voice: selectedVoice,
        visual_mode: n?.visualMode || visualMode,
        include_subtitles: includeSubtitles,
        music_enabled: musicEnabled && musicList.length > 0,
        voice_rate: voiceRate,
        subtitle_style: subtitleStyle,
        title_card: titleCard,
        time: apTime,
        auto_publish: apAutoPublish,
        privacy: "unlisted",
        enabled: true,
      });
      setApPrompt("");
      pushToast("أُضيفت الجدولة اليومية ⏰");
      loadSchedules();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "فشل إنشاء الجدولة");
    } finally {
      setCreatingSchedule(false);
    }
  };

  const handleToggleSchedule = async (s: Schedule) => {
    try {
      await updateSchedule(s.id, { enabled: !s.enabled });
      loadSchedules();
    } catch {
      setError("فشل تحديث الجدولة");
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    if (!confirm("حذف هذه الجدولة اليومية؟")) return;
    try {
      await deleteSchedule(id);
      setSchedules(prev => prev.filter(s => s.id !== id));
    } catch {
      setError("فشل حذف الجدولة");
    }
  };

  const handleRunScheduleNow = async (id: string) => {
    try {
      await runScheduleNow(id);
      pushToast("بدأ التنفيذ الفوري في الخلفية 🚀", "info");
    } catch {
      setError("فشل التشغيل الفوري");
    }
  };

  // Diagnostics & storage
  const [taskLog, setTaskLog] = useState<string | null>(null);
  const [storage, setStorage] = useState<StorageStats | null>(null);

  // History library controls
  const [historyQuery, setHistoryQuery] = useState("");
  const [historyFilter, setHistoryFilter] = useState<"all" | "published" | "ready">("all");
  const [historySort, setHistorySort] = useState<"new" | "old" | "long">("new");

  // تقدير تقريبي لمدة التعليق الصوتي من طول النصوص (~14 حرف/ثانية للعربية)
  const estimatedDuration = script
    ? Math.max(5, Math.round(script.scenes.reduce((acc, s) => acc + s.narration.length, 0) / 14))
    : 0;

  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Titles, voice preview, music, scheduling
  const [titlesAlt, setTitlesAlt] = useState<string[]>([]);
  const [loadingTitles, setLoadingTitles] = useState(false);
  const [previewingVoice, setPreviewingVoice] = useState(false);
  const [musicEnabled, setMusicEnabled] = useState(false);
  const [musicList, setMusicList] = useState<{ name: string; size_kb: number }[]>([]);
  const [uploadingMusic, setUploadingMusic] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [publishScheduled, setPublishScheduled] = useState(false);

  // Stats & templates
  const [statsMap, setStatsMap] = useState<Record<string, { views: number; likes: number; comments: number }>>({});
  const [loadingStats, setLoadingStats] = useState(false);

  // Toasts
  interface Toast { id: number; text: string; kind: "success" | "info"; }
  const [toasts, setToasts] = useState<Toast[]>([]);
  const pushToast = (text: string, kind: "success" | "info" = "success") => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev.slice(-2), { id, text, kind }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3200);
  };
  interface Template { name: string; prompt: string; niche: string; tone: string; duration: number; sceneCount: number; visualMode: string; }
  const [templates, setTemplates] = useState<Template[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("cf_templates") || "[]");
    } catch {
      return [];
    }
  });

  const persistTemplates = (list: Template[]) => {
    setTemplates(list);
    try {
      localStorage.setItem("cf_templates", JSON.stringify(list));
    } catch { /* ignore */ }
  };

  const saveCurrentAsTemplate = () => {
    if (!userPrompt.trim()) return;
    const name = userPrompt.trim().slice(0, 28) + (userPrompt.trim().length > 28 ? "…" : "");
    persistTemplates([...templates, { name, prompt: userPrompt, niche: selectedNiche, tone, duration, sceneCount, visualMode }].slice(-12));
    pushToast("حُفظ القالب 📌");
  };

  const applyTemplate = (t: Template) => {
    setUserPrompt(t.prompt);
    setSelectedNiche(t.niche);
    setTone(t.tone);
    setDuration(t.duration);
    setSceneCount(t.sceneCount);
    const n = NICHES.find(x => x.id === t.niche);
    setVisualMode(t.visualMode || n?.visualMode || "auto_real");
    pushToast("طُبّق القالب ✅", "info");
  };

  const formatCompact = (n: number) => {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
    if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
    return String(n);
  };

  const extractYoutubeId = (item: HistoryItem): string | null => {
    if (item.youtube_video_id) return item.youtube_video_id;
    const m = (item.published_url || "").match(/(?:shorts\/|v=|youtu\.be\/)([\w-]{6,})/);
    return m ? m[1] : null;
  };

  const handleRefreshStats = async () => {
    const ids = historyItems.map(extractYoutubeId).filter((x): x is string => !!x);
    if (ids.length === 0) {
      setError("لا توجد فيديوهات منشورة على يوتيوب لجلب إحصائياتها");
      return;
    }
    setLoadingStats(true);
    try {
      const data = await fetchYoutubeStats(ids);
      setStatsMap(data);
      pushToast(`حُدّثت إحصائيات ${Object.keys(data).length} فيديو 📊`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "فشل جلب الإحصائيات");
    } finally {
      setLoadingStats(false);
    }
  };

  // مقياس SEO بسيط للعنوان والوصف (0-100)
  const seoScore = (() => {
    if (!script) return 0;
    let s = 0;
    if (script.title.length > 0 && script.title.length <= 100) s += 20;
    if (/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(script.title)) s += 15;
    if (/#Shorts|#shorts|#شورتس/.test(script.description)) s += 20;
    if (script.tags.length >= 3) s += 15;
    if (script.scenes.length >= 3 && script.scenes.length <= 6) s += 15;
    if (estimatedDuration >= 20 && estimatedDuration <= 60) s += 15;
    return s;
  })();

  const handleCopy = async (field: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      pushToast("تم النسخ إلى الحافظة ✅");
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      setError("تعذر النسخ — انسخ النص يدوياً");
    }
  };

  const handleTitleVariations = async () => {
    if (!script) return;
    setLoadingTitles(true);
    try {
      const res = await fetchTitleVariations({
        title: script.title,
        description: script.description,
        category: selectedNiche,
        tone,
      });
      setTitlesAlt(res.titles || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "فشل توليد عناوين بديلة");
    } finally {
      setLoadingTitles(false);
    }
  };

  const handlePreviewVoice = async () => {
    if (!script || previewingVoice) return;
    setPreviewingVoice(true);
    try {
      const sample = script.scenes[0]?.narration || script.title;
      const url = await previewVoice(sample, selectedVoice);
      const audio = new Audio(url);
      audio.onended = () => setPreviewingVoice(false);
      audio.onerror = () => setPreviewingVoice(false);
      await audio.play();
    } catch {
      setError("فشل معاينة الصوت");
      setPreviewingVoice(false);
    }
  };

  const handleMusicUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingMusic(true);
    try {
      await uploadMusic(file);
      const list = await fetchMusicList();
      setMusicList(list);
      setMusicEnabled(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "فشل رفع الموسيقى");
    } finally {
      setUploadingMusic(false);
      e.target.value = "";
    }
  };

  const handleRegenerateScene = async (index: number) => {    if (!script) return;
    setRegeneratingIndex(index);
    try {
      const fresh = await regenerateScene({
        category: selectedNiche,
        tone,
        narration: script.scenes[index].narration,
        scene_number: script.scenes[index].scene_number,
      });
      const newScenes = [...script.scenes];
      newScenes[index] = {
        ...newScenes[index],
        narration: fresh.narration || newScenes[index].narration,
        search_keywords: fresh.search_keywords || newScenes[index].search_keywords,
        visual_description: fresh.visual_description || newScenes[index].visual_description,
      };
      setScript({ ...script, scenes: newScenes });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "فشل إعادة توليد المشهد");
    } finally {
      setRegeneratingIndex(null);
    }
  };

  // Step 3: Render & Task Tracking
  const [taskId, setTaskId] = useState<string | null>(null);
  const [taskStatus, setTaskStatus] = useState<TaskStatus | null>(null);

  // Step 4: Preview & Publish
  const [renderedVideoId, setRenderedVideoId] = useState<string | null>(null);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const [privacy, setPrivacy] = useState("public");
  const [publishing, setPublishing] = useState(false);

  // History State
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Filtered/ordered view of the library (server returns newest first)
  const visibleHistory = historyItems
    .filter((h) => {
      if (historyFilter === "published" && !h.published_url) return false;
      if (historyFilter === "ready" && h.published_url) return false;
      if (historyQuery.trim() && !h.title.includes(historyQuery.trim())) return false;
      return true;
    })
    .sort((a, b) => {
      if (historySort === "long") return (b.duration || 0) - (a.duration || 0);
      return 0;
    });
  const orderedHistory = historySort === "old" ? [...visibleHistory].reverse() : visibleHistory;

  // Load server health & history
  useEffect(() => {
    checkServerHealth();
    loadHistoryData();
    fetchMusicList().then(setMusicList).catch(() => {});
    loadQueue();
    loadSchedules();
    // Restore unsent draft (prompt + settings)
    try {
      const raw = localStorage.getItem("cf_draft");
      if (raw) {
        const d = JSON.parse(raw);
        if (d.userPrompt) setUserPrompt(d.userPrompt);
        if (d.tone) setTone(d.tone);
        if (d.duration) setDuration(d.duration);
        if (typeof d.sceneCount === "number") setSceneCount(d.sceneCount);
        if (d.visualMode) setVisualMode(d.visualMode);
        if (d.selectedNiche && NICHES.some(n => n.id === d.selectedNiche)) setSelectedNiche(d.selectedNiche);
        pushToast("استُعيدت مسودتك غير المرسلة 📝", "info");
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Autosave draft on every change
  useEffect(() => {
    try {
      localStorage.setItem("cf_draft", JSON.stringify({ userPrompt, tone, duration, sceneCount, visualMode, selectedNiche }));
    } catch {
      /* ignore */
    }
  }, [userPrompt, tone, duration, sceneCount, visualMode, selectedNiche]);

  // Auto-refresh queue while viewing it + celebrate completions
  const prevDoneCount = React.useRef<number | null>(null);
  useEffect(() => {
    if (step !== "queue") return;
    loadQueue();
    const interval = setInterval(loadQueue, 4000);
    return () => clearInterval(interval);
  }, [step]);

  useEffect(() => {
    const done = queueItems.filter(q => q.status === "done").length;
    if (prevDoneCount.current !== null && done > prevDoneCount.current) {
      pushToast("اكتمل فيديو في الطابور 🎉");
      loadHistoryData();
    }
    prevDoneCount.current = done;
  }, [queueItems]);

  const checkServerHealth = async () => {
    setServerState("checking");
    try {
      const data = await fetchHealth();
      setHealth(data);
      setServerState("connected");
    } catch (err) {
      console.warn("Backend offline or booting...", err);
      setServerState("error");
    }
  };

  const loadHistoryData = async () => {
    setLoadingHistory(true);
    try {
      const list = await fetchHistory();
      setHistoryItems(list);
    } catch (err) {
      console.warn("Could not load history:", err);
    } finally {
      setLoadingHistory(false);
    }
    try {
      setStorage(await fetchStorageStats());
    } catch {
      /* backend offline */
    }
  };

  const handleNicheSelect = (nicheId: string) => {
    setSelectedNiche(nicheId);
    const n = NICHES.find(item => item.id === nicheId);
    if (n) {
      if (n.defaultPrompt) setUserPrompt(n.defaultPrompt);
      setTone(n.defaultTone);
      setVisualMode(n.visualMode);
      if (nicheId === "custom") {
        setShowCustomPrompt(true);
      }
    }
  };

  // 1. Submit User Prompt -> Generate Script via LLM
  const handleGenerateScript = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userPrompt.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const result = await generateScript(
        userPrompt, 
        selectedNiche, 
        tone, 
        duration,
        showCustomPrompt ? customSystemPrompt : undefined,
        sceneCount
      );
      setScript(result);
      setStep("review");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "فشل توليد السيناريو");
    } finally {
      setLoading(false);
    }
  };

  // 2. Scene Updates during Review
  const updateScene = (index: number, field: keyof Scene, value: string | number) => {
    if (!script) return;
    const newScenes = [...script.scenes];
    newScenes[index] = { ...newScenes[index], [field]: value };
    setScript({ ...script, scenes: newScenes });
  };

  const addScene = () => {
    if (!script) return;
    const defaultKeywords =
      selectedNiche.includes("kids")
        ? "cute 3D cartoon scene Pixar style"
        : selectedNiche === "real_cars" || selectedNiche === "car_facts"
          ? "real sports car driving on road action"
          : "cinematic scene vertical";
    const newScene: Scene = {
      scene_number: script.scenes.length + 1,
      narration: "اكتب نص المشهد الجديد هنا...",
      search_keywords: defaultKeywords,
      visual_description: "مشهد مضاف يدوياً",
    };
    setScript({ ...script, scenes: [...script.scenes, newScene] });
  };

  const removeScene = (index: number) => {
    if (!script || script.scenes.length <= 1) return;
    const newScenes = script.scenes
      .filter((_, idx) => idx !== index)
      .map((s, idx) => ({ ...s, scene_number: idx + 1 }));
    setScript({ ...script, scenes: newScenes });
  };

  const moveScene = (index: number, dir: -1 | 1) => {
    if (!script) return;
    const j = index + dir;
    if (j < 0 || j >= script.scenes.length) return;
    const ns = [...script.scenes];
    [ns[index], ns[j]] = [ns[j], ns[index]];
    setScript({ ...script, scenes: ns.map((s, i) => ({ ...s, scene_number: i + 1 })) });
  };

  // 3. User Approves Script -> Trigger Video Rendering Pipeline
  const buildRenderPayload = () => {
    if (!script) throw new Error("لا يوجد سكريبت");
    return {
      ...script,
      voice: selectedVoice,
      category: selectedNiche,
      visual_mode: visualMode,
      include_subtitles: includeSubtitles,
      music_enabled: musicEnabled,
      voice_rate: voiceRate,
      subtitle_style: subtitleStyle,
      title_card: titleCard,
    };
  };

  const handleStartRender = async () => {
    if (!script) return;
    setLoading(true);
    setError(null);
    setTaskLog(null);

    try {
      const res = await triggerRender(script, selectedVoice, selectedNiche, visualMode, includeSubtitles, musicEnabled, voiceRate, subtitleStyle, titleCard);
      setTaskId(res.task_id);
      setStep("rendering");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "فشل بدء إنتاج الفيديو");
    } finally {
      setLoading(false);
    }
  };

  const loadQueue = async () => {
    try {
      setQueueItems(await fetchQueue());
    } catch {
      /* backend offline */
    }
  };

  const handleAddToQueue = async () => {
    if (!script) return;
    setLoading(true);
    setQueueMsg(null);
    try {
      const res = await addToQueue(buildRenderPayload());
      setQueueMsg(`أُضيف للطابور — موضع #${res.position} ✅`);
      pushToast(`أُضيف «${script.title.slice(0, 30)}» للطابور ✅`);
      loadQueue();
      setTimeout(() => setQueueMsg(null), 4000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "فشل الإضافة للطابور");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveQueue = async (qid: string) => {
    try {
      await removeFromQueue(qid);
      setQueueItems(prev => prev.filter(q => q.queue_id !== qid));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "فشل الحذف من الطابور");
    }
  };

  const handleRetryQueue = async (qid: string) => {
    try {
      await retryQueueItem(qid);
      pushToast("أُعيد العنصر للطابور 🔄", "info");
      loadQueue();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "فشل إعادة التشغيل");
    }
  };

  const handleCleanupStorage = async () => {
    if (!confirm("حذف الملفات المؤقتة؟ (الفيديوهات المنتجة والموسيقى لن تُمس)")) return;
    try {
      const res = await cleanupStorage();
      pushToast(`تم تحرير ${res.freed_mb}MB 🧹`);
      setStorage(await fetchStorageStats());
    } catch {
      setError("فشل تنظيف التخزين");
    }
  };

  // Poll Task Status during rendering
  useEffect(() => {
    if (step !== "rendering" || !taskId) return;

    const interval = setInterval(async () => {
      try {
        const status = await getTaskStatus(taskId);
        setTaskStatus(status);

        if (status.status === "completed" && status.video_id) {
          setRenderedVideoId(status.video_id);
          setStep("preview");
          loadHistoryData(); // Refresh history
          clearInterval(interval);
        } else if (status.status === "failed") {
          setError(status.error || "فشل أثناء معالجة ومونتاج الفيديو");
          try {
            setTaskLog(await fetchTaskLog(taskId));
          } catch {
            setTaskLog(null);
          }
          clearInterval(interval);
        }
      } catch (err: unknown) {
        console.error("Polling error:", err);
      }
    }, 1800);

    return () => clearInterval(interval);
  }, [step, taskId]);

  // 4. User Approves Video -> Publish to YouTube Shorts
  const handlePublish = async () => {
    if (!renderedVideoId || !script) return;
    setPublishing(true);
    setError(null);

    try {
      const res = await publishToYouTube({
        video_id: renderedVideoId,
        title: script.title,
        description: script.description,
        tags: script.tags,
        privacy: privacy,
        publish_at: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
      });

      if (res.success) {
        setPublishedUrl(res.url);
        setPublishScheduled(!!res.scheduled);
        setStep("published");
        loadHistoryData(); // Update history record
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "فشل رفع الفيديو على يوتيوب");
    } finally {
      setPublishing(false);
    }
  };

  const handleReuseHistory = (item: HistoryItem) => {
    if (!item.scenes || item.scenes.length === 0) return;
    setScript({
      title: item.title,
      description: item.description,
      tags: item.tags,
      scenes: item.scenes.map((s, idx) => ({ ...s, scene_number: idx + 1 })),
    });
    if (item.voice) setSelectedVoice(item.voice);
    if (item.category) {
      setSelectedNiche(item.category);
      const n = NICHES.find(x => x.id === item.category);
      if (n) setVisualMode(n.visualMode);
    }
    if (item.visual_mode) setVisualMode(item.visual_mode);
    setMusicEnabled(!!item.music_enabled);
    if (item.voice_rate) setVoiceRate(item.voice_rate);
    if (item.subtitle_style) setSubtitleStyle(item.subtitle_style);
    if (typeof item.title_card === "boolean") setTitleCard(item.title_card);
    setTitlesAlt([]);
    setScheduledAt("");
    setPublishScheduled(false);
    setError(null);
    setStep("review");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleConnectYoutube = async () => {
    setConnectingYt(true);
    try {
      const res = await triggerYoutubeAuth();
      if (res.success) {
        await checkServerHealth();
      } else {
        setError(res.error || "تعذر ربط حساب يوتيوب — تأكد من ملف client_secret وتشغيل السيرفر محلياً");
      }
    } catch {
      setError("تعذر ربط حساب يوتيوب — يجب تشغيل الباك اند على نفس الجهاز لإتمام OAuth");
    } finally {
      setConnectingYt(false);
    }
  };

  const handleDeleteHistory = async (videoId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الفيديو من السجل؟")) return;
    try {
      await deleteHistory(videoId);
      setHistoryItems(prev => prev.filter(h => h.video_id !== videoId));
    } catch (err) {
      console.error("Failed to delete history item:", err);
    }
  };

  const restartPipeline = () => {
    setStep("input");
    setUserPrompt(NICHES[0].defaultPrompt);
    setSceneCount(0);
    setTitlesAlt([]);
    setScheduledAt("");
    setPublishScheduled(false);
    setScript(null);
    setTaskId(null);
    setTaskStatus(null);
    setRenderedVideoId(null);
    setPublishedUrl(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-[#f1f1f1] flex flex-col font-sans pb-20 md:pb-6 relative overflow-x-clip">
      {/* Ambient background */}
      <div className="bg-orb w-[480px] h-[480px] bg-red-600/8 -top-40 -left-40" />
      <div className="bg-orb w-[420px] h-[420px] bg-red-800/5 top-[35%] -right-52" style={{ animationDelay: "-6s" }} />
      <div className="bg-orb w-[380px] h-[380px] bg-red-900/5 bottom-0 left-1/3" style={{ animationDelay: "-10s" }} />
      <div className="bg-grid" />
      {/* Top Header - Fully Responsive & Safe Area Adapted */}
      <header className="border-b border-[#272727] bg-[#0f0f0f]/95 backdrop-blur-xl sticky top-0 z-40 relative pt-[env(safe-area-inset-top,0px)]">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 flex items-center justify-between gap-3">
          {/* Right Side: Brand & Live Server Status (RTL Start) */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Logo */}
            <div 
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-red-700 via-red-600 to-red-500 flex items-center justify-center shadow-lg shadow-red-600/30 shrink-0 border border-red-400/30 cursor-pointer"
              onClick={() => setStep("input")}
            >
              <span className="text-white font-black text-xs sm:text-sm tracking-tighter">OS</span>
            </div>

            {/* Title & Server Badge */}
            <div className="flex items-center gap-2">
              <div>
                <h1 className="font-extrabold text-sm sm:text-base tracking-tight flex items-center gap-1.5 text-white">
                  <span>Osama Studio</span>
                  <span className="text-[10px] bg-red-600/20 text-red-400 border border-red-600/30 px-1.5 py-0.2 rounded-full font-bold hidden sm:inline-block">
                    استوديو أسامة
                  </span>
                </h1>
                <p className="text-[10px] text-[#888] hidden md:block">
                  استوديو الذكاء الاصطناعي للفيديوهات القصيرة
                </p>
              </div>

              {/* Real-time Server Connection Pill */}
              <button
                type="button"
                onClick={() => setIsSettingsOpen(true)}
                className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-all cursor-pointer ${
                  serverState === "connected"
                    ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-400 hover:bg-emerald-900/50"
                    : serverState === "checking"
                    ? "bg-amber-950/40 border-amber-500/30 text-amber-400 hover:bg-amber-900/50"
                    : "bg-red-950/40 border-red-500/30 text-red-400 hover:bg-red-900/50"
                }`}
                title="انقر لفتح إعدادات السيرفر"
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    serverState === "connected"
                      ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]"
                      : serverState === "checking"
                      ? "bg-amber-400 animate-ping"
                      : "bg-red-500 animate-pulse"
                  }`}
                />
                <span className="hidden sm:inline">
                  {serverState === "connected" ? "متصل" : serverState === "checking" ? "فحص..." : "غير متصل"}
                </span>
              </button>
            </div>
          </div>

          {/* Left Side: Navigation & Actions (RTL End) */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-1">
            {/* 1. المكتبة (Library / History) */}
            <button
              onClick={() => {
                if (step === "history") setStep("input");
                else {
                  setStep("history");
                  loadHistoryData();
                }
              }}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer shrink-0 ${
                step === "history" 
                  ? "bg-white text-[#0f0f0f] shadow-sm" 
                  : "bg-[#272727] hover:bg-[#383838] text-[#f1f1f1]"
              }`}
              title="سجل ومكتبة الفيديوهات المنتجة"
            >
              <Folder className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">المكتبة</span>
              {historyItems.length > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  step === "history" ? "bg-[#0f0f0f]/15 text-[#0f0f0f]" : "bg-red-600 text-white"
                }`}>
                  {historyItems.length}
                </span>
              )}
            </button>

            {/* 2. الطابور (Queue) */}
            <button
              onClick={() => {
                if (step === "queue") setStep("input");
                else {
                  setStep("queue");
                  loadQueue();
                }
              }}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer shrink-0 ${
                step === "queue"
                  ? "bg-white text-[#0f0f0f] shadow-sm"
                  : "bg-[#272727] hover:bg-[#383838] text-[#f1f1f1]"
              }`}
              title="طابور المعالجة والإنتاج"
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">الطابور</span>
              {queueItems.filter(q => q.status === "queued" || q.status === "processing").length > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  step === "queue" ? "bg-[#0f0f0f]/15 text-[#0f0f0f]" : "bg-amber-500 text-white"
                }`}>
                  {queueItems.filter(q => q.status === "queued" || q.status === "processing").length}
                </span>
              )}
            </button>

            {/* 3. الطيار الآلي (Autopilot) */}
            <button
              onClick={() => {
                if (step === "autopilot") setStep("input");
                else {
                  setStep("autopilot");
                  loadSchedules();
                }
              }}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer shrink-0 ${
                step === "autopilot"
                  ? "bg-white text-[#0f0f0f] shadow-sm"
                  : "bg-[#272727] hover:bg-[#383838] text-[#f1f1f1]"
              }`}
              title="جدولة النشر التلقائي"
            >
              <Clock className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">الطيار الآلي</span>
              {schedules.filter(s => s.enabled).length > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  step === "autopilot" ? "bg-[#0f0f0f]/15 text-[#0f0f0f]" : "bg-blue-500 text-white"
                }`}>
                  {schedules.filter(s => s.enabled).length}
                </span>
              )}
            </button>

            {/* 4. حساب يوتيوب (YouTube Status) */}
            {health?.youtube?.authenticated ? (
              <span className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-[#1e1e1e] border border-[#333] text-[11px] font-semibold text-[#f1f1f1] shrink-0" title={`قناة يوتيوب: ${health.youtube.channel_name}`}>
                <YouTubeIcon className="w-3.5 h-3.5" />
                <span className="max-w-[110px] truncate">{health.youtube.channel_name}</span>
              </span>
            ) : (
              <button
                onClick={handleConnectYoutube}
                disabled={connectingYt}
                className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-red-600/90 hover:bg-red-600 text-[11px] font-bold text-white transition-all cursor-pointer disabled:opacity-50 shrink-0"
                title="ربط حساب يوتيوب للنشر التلقائي"
              >
                <Link2 className="w-3.5 h-3.5" />
                <span>{connectingYt ? "ربط..." : "ربط يوتيوب"}</span>
              </button>
            )}

            {/* 5. الإعدادات (Settings Button) */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full bg-[#272727] hover:bg-[#383838] text-xs font-semibold text-[#f1f1f1] transition-all cursor-pointer shrink-0 border border-[#383838]/40"
              title="إعدادات التطبيق والمفاتيح والسيرفر"
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">الإعدادات</span>
            </button>
          </div>
        </div>

        {/* Provider status strip */}
        {health && (
          <div className="max-w-7xl mx-auto px-3 sm:px-6 py-1 flex items-center justify-between border-t border-[#1e1e1e] text-[10px] text-[#888] overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>السيناريو: <span className="text-[#ccc]">{health.llm_provider}</span></span>
              </span>
              <span className="flex items-center gap-1 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>الصوت: <span className="text-[#ccc]">{health.voice_provider}</span></span>
              </span>
              <span className="flex items-center gap-1 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>المرئيات: <span className="text-[#ccc]">{health.media_provider}</span></span>
              </span>
            </div>
            {!health.youtube?.authenticated && (
              <button onClick={handleConnectYoutube} disabled={connectingYt} className="md:hidden flex items-center gap-1 shrink-0 text-red-400 font-bold cursor-pointer">
                <Link2 className="w-3 h-3" />
                <span>{connectingYt ? "جاري الربط..." : "ربط يوتيوب"}</span>
              </button>
            )}
          </div>
        )}
        {health && health.ffmpeg === false && (
          <div className="max-w-7xl mx-auto px-3 sm:px-6 pb-2">
            <div className="p-2.5 rounded-xl bg-rose-950/50 border border-rose-700/60 text-[11px] text-rose-200">
              ⚠️ برنامج FFmpeg غير مثبت على السيرفر — لن يعمل إنتاج الفيديو. ثبّته وأعد تشغيل الباك اند.
            </div>
          </div>
        )}
        {health && typeof health.disk_free_gb === "number" && health.disk_free_gb >= 0 && health.disk_free_gb < 2 && (
          <div className="max-w-7xl mx-auto px-3 sm:px-6 pb-2">
            <div className="p-2.5 rounded-xl bg-amber-950/50 border border-amber-700/60 text-[11px] text-amber-200">
              ⚠️ مساحة القرص منخفضة ({health.disk_free_gb}GB متبقية) — نظّف المؤقت من السجل أو احذف فيديوهات قديمة.
            </div>
          </div>
        )}
      </header>

      {/* Offline Alert Banner */}
      {serverState === "error" && (
        <div className="bg-gradient-to-r from-red-950/90 via-[#1c0808] to-red-950/90 border-b border-red-600/30 px-3 sm:px-6 py-2.5 text-xs text-red-200">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-right">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
              <span>
                تعذر الاتصال بسيرفر الباك اند: <strong className="font-mono text-red-300 dir-ltr inline-block px-1 bg-black/40 rounded">{getApiBase()}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={async () => {
                  setCustomApiBase(DEFAULT_SERVER_URL);
                  await checkServerHealth();
                }}
                className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-[11px] transition-all cursor-pointer shadow-md shadow-red-600/30"
              >
                التحويل لسيرفر Render السحابي 🌐
              </button>
              <button
                type="button"
                onClick={() => checkServerHealth()}
                className="px-3 py-1 rounded-lg bg-[#272727] hover:bg-[#3f3f3f] text-[#f1f1f1] font-semibold text-[11px] transition-all cursor-pointer"
              >
                إعادة المحاولة 🔄
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stepper Navigation (Visible in workflow steps) */}
      {step !== "history" && (
        <div className="border-b border-[#272727] bg-[#0f0f0f]">
          <div className="max-w-5xl mx-auto px-3 py-2 flex items-center justify-between overflow-x-auto text-[11px] sm:text-xs font-medium no-scrollbar">
            {[
              { id: "input", num: 1, label: "الفكرة والنيش" },
              { id: "review", num: 2, label: "مراجعة السيناريو" },
              { id: "rendering", num: 3, label: "الإنتاج والمونتاج" },
              { id: "preview", num: 4, label: "المعاينة والنشر" },
            ].map((st, i, arr) => (
              <React.Fragment key={st.id}>
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full shrink-0 transition-all ${
                  step === st.id ? "bg-white text-[#0f0f0f] font-bold" : "text-[#717171]"
                }`}>
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    step === st.id ? "bg-red-600 text-white" : "bg-[#272727] text-[#aaa]"
                  }`}>{st.num}</span>
                  <span>{st.label}</span>
                </div>
                {i < arr.length - 1 && <ChevronLeft className="w-3.5 h-3.5 text-[#3f3f3f] shrink-0 mx-1" />}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-3 sm:px-6 py-5 sm:py-8 relative z-10" key={step}>
        <div className="animate-fade-up">
        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-red-950/40 border border-red-900/60 text-red-200 flex items-start gap-2.5 text-xs sm:text-sm">
            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">تنبيه:</p>
              <p>{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-xs hover:text-white underline">إغلاق</button>
          </div>
        )}

        {/* STEP 1: PROMPT & NICHE SELECTION */}
        {step === "input" && (
          <div className="max-w-3xl mx-auto space-y-5 sm:space-y-6">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1f1f1f] border border-[#333] text-xs text-[#aaa]">
                <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                <span className="font-semibold text-white">Osama Studio Dashboard</span>
                <span>•</span>
                <span>غرفة الإنتاج وصناعة المحتوى</span>
              </div>
              <h2 className="text-xl sm:text-3xl font-extrabold tracking-tight">
                إنتاج فيديو جديد في <span className="text-gradient">Osama Studio 🎬</span>
              </h2>
              <p className="text-[#aaa] text-xs sm:text-sm max-w-lg mx-auto">
                اختر مسار المحتوى المطلوب أو اكتب فكرتك وسيتولى استوديو أسامة إنتاج الفيديو بالكامل بالذكاء الاصطناعي
              </p>
            </div>

            {/* Niche Selector Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
              {NICHES.map((n, ni) => {
                const IconComponent = n.icon;
                const isSelected = selectedNiche === n.id;
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => handleNicheSelect(n.id)}
                    className={`select-card animate-fade-up stagger-${Math.min(ni + 1, 4)} p-3 sm:p-4 rounded-2xl border text-right flex flex-col justify-between cursor-pointer ${
                      isSelected
                        ? "select-card-selected bg-[#272727] border-red-600"
                        : "bg-[#1a1a1a] border-[#272727] hover:border-[#3f3f3f] text-[#aaa]"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${n.color} flex items-center justify-center text-white shadow-lg ring-1 ring-white/20`}>
                        <IconComponent className="w-4.5 h-4.5" />
                      </div>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-red-600 flex items-center justify-center text-white">
                          <Check className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="font-extrabold text-xs sm:text-sm text-[#f1f1f1]">{n.title}</div>
                      <div className="text-[10px] text-[#717171] line-clamp-1 mt-0.5">{n.subtitle}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Saved Templates */}
            <div className="glass-panel p-3 sm:p-4 rounded-2xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Bookmark className="w-3.5 h-3.5 text-amber-400" />
                  <span>قوالبي المحفوظة ({templates.length}/12):</span>
                </span>
                <button
                  type="button"
                  onClick={saveCurrentAsTemplate}
                  disabled={!userPrompt.trim() || templates.length >= 12}
                  className="text-[11px] font-bold text-[#3ea6ff] hover:text-white bg-[#263850] hover:bg-[#3ea6ff]/25 border border-[#3ea6ff]/30 px-2.5 py-1 rounded-lg cursor-pointer disabled:opacity-40 transition-all"
                >
                  + حفظ الإعداد الحالي كقالب
                </button>
              </div>
              {templates.length === 0 ? (
                <p className="text-[11px] text-[#717171]">احفظ فكرتك وإعداداتها المفضلة لتعود إليها بضغطة واحدة لاحقاً.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {templates.map((t, i) => (
                    <span key={i} className="group inline-flex items-center gap-1 text-[11px] bg-slate-900 border border-slate-700 hover:border-amber-500/60 rounded-lg pl-1 pr-2 py-1 transition-all">
                      <button type="button" onClick={() => applyTemplate(t)} className="text-slate-200 hover:text-amber-200 cursor-pointer max-w-[180px] truncate" title={t.prompt}>
                        📌 {t.name}
                      </button>
                      <button type="button" onClick={() => persistTemplates(templates.filter((_, j) => j !== i))} className="text-[#717171] hover:text-red-500 cursor-pointer font-bold" title="حذف القالب">×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Main Form */}
            <form onSubmit={handleGenerateScript} className="glass-panel-glow p-4 sm:p-7 rounded-2xl space-y-4 sm:space-y-5">
              {/* Visual Generation Mode Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-200 mb-2 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-indigo-400" />
                  <span>طريقة إنتاج المرئيات (Visual Style):</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {[
                    { id: "veo_ai", label: "🌟 Google Veo (فيديو سينمائي بالذكاء الاصطناعي)", sub: "توليد فيديو حقيقي 9:16 عبر اشتراك Google AI Pro", tag: "Google Veo" },
                    { id: "auto_real", label: "🏎️ سيارات حقيقية (ستوك + AI واقعي)", sub: "فيديو حقيقي أولاً ثم توليد واقعي — الأفضل للسيارات", tag: "موصى به للسيارات" },
                    { id: "real_stock", label: "🎥 ستوك حقيقي فقط (Pexels/Pixabay)", sub: "مقاطع واقعية حقيقية 1080p بدون توليد", tag: "واقعي" },
                    { id: "ai_realistic", label: "📸 توليد واقعي AI (بدون مفاتيح)", sub: "صور واقعية متحركة بحركة سينمائية", tag: "واقعي" },
                    { id: "ai_cartoon", label: "🎨 كرتون 3D بالذكاء الاصطناعي (متحرك)", sub: "الأفضل لسيارات الأطفال والأحرف", tag: "كرتون" },
                    { id: "ai_cinematic", label: "🏰 لوحات سينمائية 3D (متحركة)", sub: "الأفضل للقصص التاريخية والعبر", tag: "سينمائي" },
                    { id: "auto", label: "🤖 تلقائي ذكي حسب الفئة", sub: "أطفال → كرتون، سيارات/قصص → واقعي", tag: "تلقائي" },
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setVisualMode(mode.id)}
                      className={`select-card p-2.5 rounded-xl border text-right cursor-pointer ${
                        visualMode === mode.id
                          ? "select-card-selected bg-indigo-600/20 border-indigo-500 text-white"
                          : "bg-slate-900 border-slate-800 text-slate-400 hover:border-indigo-500/50"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-bold text-[11px] sm:text-xs">{mode.label}</div>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 ${
                          visualMode === mode.id
                            ? "bg-indigo-500/30 text-indigo-200 border-indigo-400/40"
                            : "bg-slate-950 text-slate-500 border-slate-800"
                        }`}>
                          {mode.tag}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{mode.sub}</div>
                    </button>
                  ))}
                </div>
                {visualMode === "veo_ai" && (
                  <div className="mt-2 p-2.5 rounded-xl bg-purple-950/40 border border-purple-800/50 text-[11px] text-purple-200 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
                    <span>
                      🌟 وضع Google Veo مفعل: يتم توليد مشاهد الفيديو بالكامل عبر نموذج Veo المتطور باستخدام مفتاح Gemini API نفسه واشتراكك في Google AI Pro.
                    </span>
                  </div>
                )}
                {visualMode === "real_stock" && health && !health.has_pexels && (
                  <div className="mt-2 p-2.5 rounded-xl bg-amber-950/40 border border-amber-800/50 text-[11px] text-amber-200">
                    ⚠️ مفتاح Pexels غير مربوط — سيُحاول Pixabay ثم التوليد الواقعي تلقائياً حتى لا يتوقف الإنتاج. اربط المفتاح من الإعدادات لأفضل نتائج ستوك.
                  </div>
                )}
              </div>

              {/* Prompt Textarea */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold mb-1.5 text-slate-200">
                  فكرة الفيديو أو تفاصيل القصة:
                </label>
                <textarea
                  rows={3}
                  value={userPrompt}
                  onChange={(e) => setUserPrompt(e.target.value)}
                  placeholder="اكتب فكرة القصة أو الحرف المراد تعليمه أو مغامرة السيارات الكرتونية..."
                  className="w-full bg-[#121212] border border-[#3f3f3f] rounded-xl p-3 sm:p-4 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#3ea6ff]/50 text-[#f1f1f1] placeholder:text-[#717171]"
                  required
                />
              </div>

              {/* Custom Prompt Toggle & Input */}
              <div className="border border-slate-800 rounded-xl p-3 bg-slate-900/40">
                <button
                  type="button"
                  onClick={() => setShowCustomPrompt(!showCustomPrompt)}
                  className="w-full flex items-center justify-between text-xs text-indigo-400 font-semibold cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>تعديل التوجيه البرمجي المخصص (Custom System Prompt)</span>
                  </span>
                  <span>{showCustomPrompt ? "إخفاء ▲" : "تخصيص ▼"}</span>
                </button>

                {showCustomPrompt && (
                  <div className="mt-3 space-y-1.5">
                    <p className="text-[11px] text-slate-400">
                      يمكنك هنا كتابة قواعد إضافية للذكاء الاصطناعي (مثل: ركز على سيارة زرقاء، اجعل الحوار باللهجة الفلانية، إلخ):
                    </p>
                    <textarea
                      rows={2}
                      value={customSystemPrompt}
                      onChange={(e) => setCustomSystemPrompt(e.target.value)}
                      placeholder="أنت خبير محتوى أطفال... ركز على تكرار نطق الحرف 3 مرات..."
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                    />
                  </div>
                )}
              </div>

              {/* Duration and Tone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    أسلوب الكلام (Tone):
                  </label>
                  <input
                    type="text"
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {TONE_PRESETS.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTone(t)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all cursor-pointer ${
                          tone === t
                            ? "bg-indigo-600/30 border-indigo-500 text-indigo-200"
                            : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-600 hover:text-slate-200"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center justify-between">
                      <span>المدة التقريبية:</span>
                      <span className="text-indigo-400 font-bold">{duration} ثانية</span>
                    </label>
                    <input
                      type="range"
                      min={20}
                      max={55}
                      step={5}
                      value={duration}
                      onChange={(e) => setDuration(Number(e.target.value))}
                      className="w-full accent-indigo-500 bg-slate-800 h-2 rounded-lg cursor-pointer mt-2"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      عدد المشاهد:
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {[{ v: 0, l: "تلقائي" }, { v: 3, l: "3" }, { v: 4, l: "4" }, { v: 5, l: "5" }, { v: 6, l: "6" }].map((o) => (
                        <button
                          key={o.v}
                          type="button"
                          onClick={() => setSceneCount(o.v)}
                          className={`px-3 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                            sceneCount === o.v
                              ? "bg-indigo-600/30 border-indigo-500 text-indigo-200"
                              : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-600 hover:text-slate-200"
                          }`}
                        >
                          {o.l}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Subtitles Option */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Type className="w-3.5 h-3.5 text-indigo-400" />
                    <span>نصوص الترجمة (Subtitles):</span>
                  </span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      {includeSubtitles
                        ? "كلمات نابضة بأسلوب تيك توك (كاريوكي) تُحرق على الفيديو."
                        : "فيديو نقي بدون نصوص (موصى به لتفادي تشوه الخطوط واستخدام كابشن تيك توك ويوتيوب الذاتي)."}
                    </span>
                </div>
                <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                  <button
                    type="button"
                    onClick={() => setIncludeSubtitles(false)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer border transition-all ${
                      !includeSubtitles
                        ? "bg-emerald-500/20 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/40"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-300"
                    }`}
                  >
                    ✓ بدون ترجمة (فيديو نقي)
                  </button>
                  <button
                    type="button"
                    onClick={() => setIncludeSubtitles(true)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer border transition-all ${
                      includeSubtitles
                        ? "bg-indigo-600/30 border-indigo-500 text-indigo-300 ring-1 ring-indigo-500/40"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-300"
                    }`}
                  >
                    ✍️ حرق الترجمة
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || !userPrompt.trim()}
                className="w-full gradient-btn btn-shine py-3.5 sm:py-4 rounded-full font-bold text-xs sm:text-sm text-white flex items-center justify-center gap-2 shadow-xl shadow-red-600/20 disabled:opacity-50 cursor-pointer"              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>جاري صياغة سكريبت المشاهد...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-indigo-200" />
                    <span>توليد مسودة السيناريو والمشاهد ✨</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* STEP 2: SCRIPT REVIEW & EDIT */}
        {step === "review" && script && (
          <div className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-lg sm:text-2xl font-extrabold text-white flex items-center gap-2 flex-wrap">
                  <span>مراجعة المشاهد والسيناريو</span>
                  {(() => {
                    const n = NICHES.find(x => x.id === selectedNiche);
                    return n ? (
                      <span className={`text-[11px] px-2 py-0.5 rounded-full border font-bold ${n.badgeColor}`}>
                        {n.title}
                      </span>
                    ) : null;
                  })()}
                  <span className="text-[11px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30">
                    {script.scenes.length} مشاهد
                  </span>
                  <span className="text-[11px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    ⏱️ ~{estimatedDuration} ثانية
                  </span>
                </h2>
                <p className="text-[11px] sm:text-xs text-slate-400">
                  عدّل نصوص المشاهد ووصف المرئيات للتأكد من مطابقة النيش المطلوب
                </p>
              </div>

              <button
                onClick={() => setStep("input")}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span>العودة للفكرة</span>
              </button>
            </div>

            {/* Video Meta Info */}
            <div className="glass-panel p-4 sm:p-5 rounded-2xl space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center justify-between">
                    <span>عنوان الفيديو (YouTube Shorts Title):</span>
                    <button
                      type="button"
                      onClick={() => handleCopy("title", script.title)}
                      className="flex items-center gap-1 text-[10px] text-indigo-300 hover:text-white cursor-pointer"
                      title="نسخ العنوان"
                    >
                      {copiedField === "title" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedField === "title" ? "تم النسخ!" : "نسخ"}</span>
                    </button>
                  </label>
                  <input
                    type="text"
                    value={script.title}
                    onChange={(e) => setScript({ ...script, title: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm font-bold text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleCopy("tags", script.tags.join(" "))}
                      className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-white bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-lg cursor-pointer"
                      title="نسخ الوسوم"
                    >
                      {copiedField === "tags" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>نسخ الوسوم ({script.tags.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopy("desc", script.description)}
                      className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-white bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-lg cursor-pointer"
                      title="نسخ الوصف"
                    >
                      {copiedField === "desc" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>نسخ الوصف</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleTitleVariations}
                      disabled={loadingTitles}
                      className="flex items-center gap-1 text-[10px] text-fuchsia-300 hover:text-white bg-fuchsia-600/15 hover:bg-fuchsia-600/30 border border-fuchsia-500/40 px-2 py-0.5 rounded-lg cursor-pointer disabled:opacity-50"
                      title="توليد عناوين بديلة جذابة"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>{loadingTitles ? "يولّد..." : "عناوين بديلة ✨"}</span>
                    </button>
                  </div>
                  {titlesAlt.length > 0 && (
                    <div className="mt-2 space-y-1.5">
                      {titlesAlt.map((t, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setScript({ ...script, title: t })}
                          className="w-full text-right text-[11px] bg-slate-950 hover:bg-indigo-950/50 border border-slate-800 hover:border-indigo-500/50 rounded-lg px-2.5 py-1.5 text-slate-200 transition-all cursor-pointer"
                          title="اضغط لاعتماد هذا العنوان"
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
                      <span>صوت المعلق:</span>
                    </span>
                    <button
                      type="button"
                      onClick={handlePreviewVoice}
                      disabled={previewingVoice}
                      className="flex items-center gap-1 text-[10px] text-indigo-300 hover:text-white cursor-pointer disabled:opacity-50"
                      title="اسمع عينة من الصوت قبل الإنتاج"
                    >
                      <Play className="w-3 h-3" />
                      <span>{previewingVoice ? "يُشغّل..." : "عينة 🎧"}</span>
                    </button>
                  </label>
                  <select
                    value={selectedVoice}
                    onChange={(e) => setSelectedVoice(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="ar-SA-HamedNeural">🇸🇦 حامد (سعودي فخم/حماسي)</option>
                    <option value="ar-SA-ZariyahNeural">🇸🇦 زارية (سعودي نسائي مبهج)</option>
                    <option value="ar-EG-ShakirNeural">🇪🇬 شاكر (مصري واضح)</option>
                    <option value="ar-EG-SalmaNeural">🇪🇬 سلمى (مصري نسائي مبهج)</option>
                    <option value="ar-AE-HamdanNeural">🇦🇪 حمدان (إماراتي سينمائي)</option>
                  </select>
                </div>
              </div>

              {/* SEO Score */}
              <div className="pt-2.5 border-t border-slate-800/80">
                <div className="flex items-center justify-between text-[11px] font-semibold mb-1.5">
                  <span className="text-slate-300">📈 جاهزية النشر (SEO): عنوان ≤100 حرف + إيموجي + #Shorts + وسوم + مدة مناسبة</span>
                  <span className={`font-extrabold ${seoScore >= 80 ? "text-emerald-400" : seoScore >= 50 ? "text-amber-400" : "text-rose-400"}`}>
                    {seoScore}/100
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${seoScore >= 80 ? "bg-gradient-to-r from-emerald-500 to-teal-400" : seoScore >= 50 ? "bg-gradient-to-r from-amber-500 to-yellow-400" : "bg-gradient-to-r from-rose-500 to-red-400"}`}
                    style={{ width: `${seoScore}%` }}
                  />
                </div>
              </div>

              {/* Subtitles Toggle in Review */}
              <div className="pt-2.5 border-t border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                    <Type className="w-3.5 h-3.5 text-indigo-400" />
                    <span>نصوص الترجمة التلقائية:</span>
                  </label>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {includeSubtitles
                        ? "كلمات نابضة بأسلوب تيك توك (كاريوكي) + ملف SRT قابل للتحميل من السجل."
                        : "فيديو نقي بدون نصوص (موصى به لتفادي تشوه الحروف ولإضافة نصوص عبر تيك توك/يوتيوب مباشرة)."}
                    </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIncludeSubtitles(false)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border transition-all ${
                      !includeSubtitles
                        ? "bg-emerald-600/20 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/40"
                        : "bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    ✓ بدون ترجمة (نقي)
                  </button>
                  <button
                    type="button"
                    onClick={() => setIncludeSubtitles(true)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border transition-all ${
                      includeSubtitles
                        ? "bg-indigo-600/30 border-indigo-500 text-indigo-300 ring-1 ring-indigo-500/40"
                        : "bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    ✍️ حرق الترجمة
                  </button>
                </div>
              </div>
            </div>

              {/* Background Music */}
              <div className="glass-panel p-4 sm:p-5 rounded-2xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <Music className="w-3.5 h-3.5 text-indigo-400" />
                      <span>موسيقى خلفية هادئة:</span>
                    </span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      {musicList.length > 0
                        ? `ملف مرفوع: ${musicList[0].name} (${musicList[0].size_kb}KB) — يُمزج بصوت منخفض تحت التعليق.`
                        : "ارفع ملف MP3 ليُضاف بصوت منخفض تحت التعليق الصوتي."}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <label className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:border-indigo-500 cursor-pointer transition-all">
                      {uploadingMusic ? "جاري الرفع..." : "📤 رفع موسيقى"}
                      <input type="file" accept=".mp3,.wav,.m4a,.ogg,audio/*" className="hidden" onChange={handleMusicUpload} disabled={uploadingMusic} />
                    </label>
                    {musicList.length > 0 && (
                      <a href={getMusicStreamUrl()} target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 border border-slate-700 text-slate-300 hover:text-white cursor-pointer" title="اسمع الموسيقى">
                        🎧 سماع
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => setMusicEnabled(!musicEnabled)}
                      disabled={musicList.length === 0}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer border transition-all disabled:opacity-40 ${
                        musicEnabled
                          ? "bg-emerald-500/20 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/40"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-300"
                      }`}
                    >
                      {musicEnabled ? "✓ مفعّلة" : "تفعيل"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Production Options: speed, subtitle style, title card */}
              <div className="glass-panel p-4 sm:p-5 rounded-2xl grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">🎙️ سرعة الصوت:</label>
                  <div className="flex gap-1.5">
                    {[{ v: 0.9, l: "هادئة" }, { v: 1.0, l: "طبيعية" }, { v: 1.1, l: "سريعة" }].map((o) => (
                      <button
                        key={o.v}
                        type="button"
                        onClick={() => setVoiceRate(o.v)}
                        className={`flex-1 px-2 py-1.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                          voiceRate === o.v
                            ? "bg-indigo-600/30 border-indigo-500 text-indigo-200"
                            : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-600"
                        }`}
                      >
                        {o.l}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">✍️ ستايل الترجمة:</label>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSubtitleStyle("karaoke")}
                      className={`flex-1 px-2 py-1.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                        subtitleStyle === "karaoke"
                          ? "bg-fuchsia-600/25 border-fuchsia-500 text-fuchsia-200"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-600"
                      }`}
                    >
                      🟡 كاريوكي نابض
                    </button>
                    <button
                      type="button"
                      onClick={() => setSubtitleStyle("classic")}
                      className={`flex-1 px-2 py-1.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                        subtitleStyle === "classic"
                          ? "bg-fuchsia-600/25 border-fuchsia-500 text-fuchsia-200"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-600"
                      }`}
                    >
                      📝 كلاسيكية
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">🎬 بطاقة العنوان والخاتمة:</label>
                  <button
                    type="button"
                    onClick={() => setTitleCard(!titleCard)}
                    className={`w-full px-2 py-1.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                      titleCard
                        ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-600"
                    }`}
                  >
                    {titleCard ? "✓ مفعّلة (هوية القناة)" : "إظهار البطاقات"}
                  </button>
                </div>
              </div>

              {/* Scenes Editor Cards */}
            <div className="space-y-0">
              {script.scenes.map((scene, idx) => {
                const words = scene.narration.trim().split(/\s+/).filter(Boolean).length;
                const estSec = Math.max(2, Math.round(scene.narration.length / 14));
                const isLast = idx === script.scenes.length - 1;
                return (
                <div key={idx} className={`timeline-rail ${isLast ? "timeline-rail-last" : ""} pr-12 pb-4 animate-fade-up stagger-${Math.min(idx + 1, 4)}`}>
                  <span className="absolute top-4 right-0 w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-600 to-fuchsia-600 flex items-center justify-center text-xs font-extrabold text-white shadow-lg shadow-indigo-600/40 ring-2 ring-[#07090e]">
                    {scene.scene_number}
                  </span>
                  <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-slate-800 space-y-3 hover:border-indigo-500/40 transition-colors">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 flex-wrap gap-2">
                    <span className="text-xs font-bold text-white flex items-center gap-2">
                      <span>المشهد {scene.scene_number}</span>
                      <span className="text-[10px] font-semibold text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-full">
                        {words} كلمة • ~{estSec} ث
                      </span>
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => moveScene(idx, -1)}
                        disabled={idx === 0}
                        className="text-slate-500 hover:text-white p-1 disabled:opacity-30"
                        title="تحريك المشهد للأعلى"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => moveScene(idx, 1)}
                        disabled={idx === script.scenes.length - 1}
                        className="text-slate-500 hover:text-white p-1 disabled:opacity-30"
                        title="تحريك المشهد للأسفل"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleRegenerateScene(idx)}
                        disabled={regeneratingIndex !== null}
                        className="flex items-center gap-1 text-[10px] font-bold text-indigo-300 hover:text-white bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/40 px-2 py-1 rounded-lg transition-all disabled:opacity-50 cursor-pointer"
                        title="إعادة توليد نص هذا المشهد وكلمات البحث بالذكاء الاصطناعي"
                      >
                        <Dices className={`w-3 h-3 ${regeneratingIndex === idx ? "animate-spin" : ""}`} />
                        <span>{regeneratingIndex === idx ? "يولّد..." : "توليد جديد 🎲"}</span>
                      </button>
                      <button
                        onClick={() => removeScene(idx)}
                        disabled={script.scenes.length <= 1}
                        className="text-slate-500 hover:text-rose-400 p-1 disabled:opacity-30"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">
                        نص التعليق الصوتي:
                      </label>
                      <textarea
                        rows={2}
                        value={scene.narration}
                        onChange={(e) => updateScene(idx, "narration", e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1 flex items-center gap-1">
                        <Search className="w-3 h-3 text-indigo-400" />
                        <span>وصف المرئيات بالإنجليزية (AI Prompt / Keywords):</span>
                      </label>
                      <input
                        type="text"
                        value={scene.search_keywords}
                        onChange={(e) => updateScene(idx, "search_keywords", e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-xs font-mono text-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                  </div>
                </div>
                );
              })}
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <button
                onClick={addScene}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-dashed border-slate-700 hover:border-indigo-500 text-xs font-semibold flex items-center justify-center gap-1.5 text-slate-300"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة مشهد آخر</span>
              </button>

              <div className="w-full sm:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                {queueMsg && (
                  <span className="text-[11px] font-bold text-emerald-300 bg-emerald-950/50 border border-emerald-700/50 px-3 py-2 rounded-xl text-center">
                    {queueMsg}
                  </span>
                )}
                <button
                  onClick={handleAddToQueue}
                  disabled={loading}
                  className="px-5 py-3 rounded-xl font-bold text-xs sm:text-sm text-amber-200 bg-amber-600/15 hover:bg-amber-600/30 border border-amber-500/50 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all"
                  title="إنتاج لاحق ضمن الطابور المتسلسل"
                >
                  <Layers className="w-4 h-4" />
                  <span>إضافة للطابور ➕</span>
                </button>
                <button
                  onClick={handleStartRender}
                  disabled={loading}
                  className="gradient-btn btn-shine px-7 py-3 rounded-full font-bold text-xs sm:text-sm text-white flex items-center justify-center gap-2 shadow-xl shadow-red-600/20 cursor-pointer disabled:opacity-50"
                >
                  <Film className="w-4 h-4" />
                  <span>بدء الإنتاج الآن 🎬</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: RENDERING PROGRESS */}
        {step === "rendering" && (
          <div className="max-w-md mx-auto py-10 text-center space-y-5">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-red-600/15 border-2 border-red-600 mx-auto flex items-center justify-center shadow-lg shadow-red-600/20 animate-pulse-ring">
              <Video className="w-7 h-7 sm:w-8 sm:h-8 text-red-400 animate-pulse" />
            </div>

            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white">
                جاري إنتاج الفيديو...
              </h2>
              <p className="text-xs sm:text-sm text-[#aaa] mt-1 flex items-center justify-center gap-1.5">
                <span className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: "0.15s" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: "0.3s" }} />
                </span>
                <span>{taskStatus?.step || "تهيئة المحرك..."}</span>
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="w-full bg-[#272727] h-3 rounded-full overflow-hidden p-0.5 border border-[#3f3f3f]">
                <div
                  className="progress-shimmer h-full rounded-full transition-all duration-500"
                  style={{ width: `${taskStatus?.progress || 10}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-[#717171]">
                <span>المهمة: #{taskId}</span>
                <span className="font-bold text-white">{taskStatus?.progress || 10}%</span>
              </div>
            </div>
            {taskStatus?.status === "failed" && (
              <button
                onClick={handleStartRender}
                disabled={loading || !script}
                className="gradient-btn btn-shine px-6 py-2.5 rounded-full text-xs font-bold text-white inline-flex items-center gap-2 shadow-lg cursor-pointer disabled:opacity-50"
              >
                <RotateCcw className="w-4 h-4" />
                <span>إعادة المحاولة بنفس السكريبت 🔄</span>
              </button>
            )}
            {taskLog && (
              <details className="text-right bg-[#1a1a1a] border border-[#272727] rounded-xl overflow-hidden">
                <summary className="px-4 py-2.5 text-[11px] font-bold text-[#aaa] cursor-pointer hover:text-white">
                  🛠️ السجل التقني للمهمة (للتشخيص)
                </summary>
                <pre dir="ltr" className="px-4 pb-3 text-[10px] font-mono text-[#717171] whitespace-pre-wrap max-h-48 overflow-y-auto text-left">
                  {taskLog}
                </pre>
              </details>
            )}
          </div>
        )}

        {/* STEP 4: PREVIEW & PUBLISH */}
        {step === "preview" && renderedVideoId && (
          <div className="max-w-4xl mx-auto space-y-5">
            <div className="text-center space-y-1">
              <div className="animate-pop-in inline-flex items-center gap-1.5 bg-green-600/15 text-green-400 border border-green-600/30 px-4 py-1.5 rounded-full text-xs font-bold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>تم الإنتاج بنجاح! راجع الفيديو قبل النشر</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              {/* Player 9:16 in phone mockup */}
              <div className="md:col-span-5 flex justify-center">
                <div className="phone-frame w-full max-w-[280px] sm:max-w-[300px]">
                  <div className="phone-notch" />
                  <div className="phone-screen aspect-[9/16]">
                    <video
                      src={getVideoMediaUrl(renderedVideoId)}
                      poster={getVideoThumbUrl(renderedVideoId)}
                      controls
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>

              {/* Publish Controls */}
              <div className="md:col-span-7 space-y-4">
                <div className="glass-panel p-5 rounded-2xl space-y-3">
                  <h3 className="font-bold text-base text-white border-b border-slate-800 pb-2">
                    {script?.title}
                  </h3>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      حالة الخصوصية على يوتيوب:
                    </label>
                    <select
                      value={privacy}
                      onChange={(e) => setPrivacy(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200"
                    >
                      <option value="public">🌍 عام (Public) - ينشر للمشاهدين فوراً</option>
                      <option value="unlisted">🔒 غير مدرج (Unlisted) - للمراجعة الخاصة أولاً</option>
                      <option value="private">👁️ خاص (Private) - لا يظهر لأحد</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1">
                      <CalendarClock className="w-3.5 h-3.5 text-indigo-400" />
                      <span>جدولة النشر (اختياري):</span>
                    </label>
                    <input
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 [color-scheme:dark]"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      {scheduledAt
                        ? "⏰ سيُرفع خاصاً ويُنشر تلقائياً في الموعد المحدد."
                        : "اتركه فارغاً للنشر الفوري."}
                    </p>
                  </div>

                  <div className="pt-2 flex flex-col gap-2.5">
                    <button
                      onClick={handlePublish}
                      disabled={publishing}
                      className="w-full py-3.5 rounded-full font-bold text-xs sm:text-sm text-white bg-red-600 hover:bg-red-700 flex items-center justify-center gap-2 shadow-lg shadow-red-600/20 disabled:opacity-50 cursor-pointer btn-shine"
                    >
                      {publishing ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>جاري النشر على YouTube Shorts...</span>
                        </>
                      ) : (
                        <>
                          <YouTubeIcon className="w-4 h-4 text-white" />
                          <span>🚀 موافقة ونشر الآن على YouTube Shorts</span>
                        </>
                      )}
                    </button>

                    <a
                      href={getVideoMediaUrl(renderedVideoId)}
                      download={`short_${renderedVideoId}.mp4`}
                      className="w-full py-2.5 text-center text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl transition-all flex items-center justify-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>تحميل ملف MP4 للجهاز</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: PUBLISHED CELEBRATION */}
        {step === "published" && publishedUrl && (
          <div className="max-w-md mx-auto py-10 text-center space-y-4">
            <div className="animate-pop-in w-20 h-20 rounded-full bg-green-600 text-white mx-auto flex items-center justify-center shadow-xl shadow-green-600/30 ring-4 ring-green-600/20">
              <Check className="w-10 h-10" />
            </div>

            <h2 className="text-2xl font-extrabold text-white">
              {publishScheduled ? "تمت جدولة النشر بنجاح! ⏰" : <>تم النشر بنجاح على <span className="text-gradient">يوتيوب! 🎉</span></>}
            </h2>
            {publishScheduled && scheduledAt && (
              <p className="text-xs text-slate-400">سيظهر الفيديو للجمهور تلقائياً في الموعد المحدد (مرفوع كخاص حتى ذلك الحين).</p>
            )}

            <div className="glass-panel-glow p-4 rounded-2xl space-y-3">
              <a
                href={publishedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm text-white bg-red-600 hover:bg-red-500 flex items-center justify-center gap-2 shadow-lg"
              >
                <YouTubeIcon className="w-4 h-4" />
                <span>مشاهدة الفيديو على يوتيوب شورتس</span>
                <ExternalLink className="w-3.5 h-3.5 mr-1" />
              </a>

              <button
                onClick={restartPipeline}
                className="w-full py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 border border-slate-700"
              >
                صناعة فيديو جديد 🎬
              </button>
            </div>
          </div>
        )}

        {/* STEP: VIDEO HISTORY LIBRARY */}
        {step === "history" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-lg sm:text-2xl font-extrabold text-white flex items-center gap-2">
                  <Folder className="w-5 h-5 text-indigo-400 shrink-0" />
                  <span className="truncate">سجل الفيديوهات المنتجة ({historyItems.length})</span>
                </h2>
                <p className="text-xs text-slate-400">جميع الفيديوهات التي تم إنشاؤها مسبقاً مع إمكانية المعاينة والتحميل والنشر</p>
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  {[
                    { label: "🎬 فيديو", value: historyItems.length },
                    { label: "🚀 منشور", value: historyItems.filter(h => h.published_url).length },
                    { label: "👁 مشاهدة", value: formatCompact(Object.values(statsMap).reduce((a, s) => a + (s.views || 0), 0)) },
                    { label: "👍 إعجاب", value: formatCompact(Object.values(statsMap).reduce((a, s) => a + (s.likes || 0), 0)) },
                  ].map((c) => (
                    <span key={c.label} className="text-[11px] font-bold bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg text-slate-200">
                      {c.label}: <span className="text-gradient">{c.value}</span>
                    </span>
                  ))}
                </div>
                {storage && (
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-1.5 text-[10px] text-slate-400">
                    <span className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-full">
                      💾 المخرجات {storage.output_mb}MB • المؤقت {storage.temp_mb}MB • {storage.videos} فيديو
                    </span>
                    {storage.temp_mb > 0 && (
                      <button
                        onClick={handleCleanupStorage}
                        className="text-amber-300 hover:text-white bg-amber-600/15 border border-amber-500/40 px-2 py-0.5 rounded-full font-bold cursor-pointer"
                        title="حذف الملفات المؤقتة فقط"
                      >
                        🧹 تنظيف المؤقت
                      </button>
                    )}
                    <button
                      onClick={async () => {
                        try {
                          await downloadBackup();
                          pushToast("حُفظت النسخة الاحتياطية 💾");
                        } catch {
                          setError("فشل إنشاء النسخة");
                        }
                      }}
                      className="text-sky-300 hover:text-white bg-sky-600/15 border border-sky-500/40 px-2 py-0.5 rounded-full font-bold cursor-pointer"
                      title="تحميل نسخة من الإعدادات والسجل والجدولات"
                    >
                      💾 نسخة احتياطية
                    </button>
                    <label
                      className="text-slate-300 hover:text-white bg-slate-800 border border-slate-700 px-2 py-0.5 rounded-full font-bold cursor-pointer"
                      title="استعادة نسخة سابقة (تستبدل البيانات الحالية)"
                    >
                      📥 استعادة
                      <input
                        type="file"
                        accept=".json,application/json"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (!confirm("استعادة النسخة؟ سيتم استبدال الإعدادات والسجل والجدولات الحالية.")) {
                            e.target.value = "";
                            return;
                          }
                          try {
                            await restoreBackup(file);
                            pushToast("تمت الاستعادة بنجاح ✅");
                            loadHistoryData();
                            loadSchedules();
                            loadQueue();
                            checkServerHealth();
                          } catch (err: unknown) {
                            setError(err instanceof Error ? err.message : "فشل الاستعادة");
                          } finally {
                            e.target.value = "";
                          }
                        }}
                      />
                    </label>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                <button
                  onClick={handleRefreshStats}
                  disabled={loadingStats}
                  className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold text-emerald-300 bg-emerald-600/15 hover:bg-emerald-600/30 border border-emerald-500/40 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
                  title="جلب المشاهدات والإعجابات من يوتيوب"
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>{loadingStats ? "يجلب..." : "📊 الإحصائيات"}</span>
                </button>
                <button
                  onClick={() => setStep("input")}
                  className="flex-1 sm:flex-none gradient-btn px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>فيديو جديد</span>
                </button>
              </div>
            </div>

            {loadingHistory ? (
              <div className="py-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                <span>جاري تحميل السجل...</span>
              </div>
            ) : historyItems.length === 0 ? (
              <div className="glass-panel p-8 rounded-2xl text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-slate-900 mx-auto flex items-center justify-center text-slate-500">
                  <Film className="w-6 h-6" />
                </div>
                <p className="text-xs text-slate-400">لم يتم إنتاج أي فيديو بعد. ابدأ بإنشاء أول فيديو الآن!</p>
                <button
                  onClick={() => setStep("input")}
                  className="gradient-btn px-5 py-2 rounded-xl text-xs font-bold text-white"
                >
                  إنشاء فيديو جديد ✨
                </button>
              </div>
            ) : (
              <>
              <div className="glass-panel p-3 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={historyQuery}
                    onChange={(e) => setHistoryQuery(e.target.value)}
                    placeholder="ابحث بعنوان الفيديو..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pr-9 pl-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-500"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {(["all", "published", "ready"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setHistoryFilter(f)}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                        historyFilter === f
                          ? "bg-indigo-600/30 border-indigo-500 text-indigo-200"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-600"
                      }`}
                    >
                      {f === "all" ? "الكل" : f === "published" ? "منشور" : "جاهز"}
                    </button>
                  ))}
                  <select
                    value={historySort}
                    onChange={(e) => setHistorySort(e.target.value as "new" | "old" | "long")}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-[11px] text-slate-300 focus:outline-none cursor-pointer"
                    title="ترتيب العرض"
                  >
                    <option value="new">الأحدث</option>
                    <option value="old">الأقدم</option>
                    <option value="long">الأطول</option>
                  </select>
                </div>
              </div>
              {orderedHistory.length === 0 ? (
                <p className="text-center text-xs text-slate-500 py-8">لا نتائج مطابقة — جرّب بحثاً مختلفاً 🔍</p>
              ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {orderedHistory.map((item, i) => (
                  <div key={item.video_id} className={`history-card glass-panel rounded-2xl overflow-hidden border border-slate-800 flex flex-col justify-between animate-fade-up stagger-${Math.min(i % 4 + 1, 4)}`}>
                    <div className="relative aspect-[9/16] max-h-[320px] w-full max-w-[250px] mx-auto sm:max-w-none bg-black overflow-hidden flex items-center justify-center">
                      <video
                        src={getVideoMediaUrl(item.video_id)}
                        poster={getVideoThumbUrl(item.video_id)}
                        controls
                        playsInline
                        preload="none"
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute top-2 right-2 text-[10px] font-bold bg-black/60 backdrop-blur px-2 py-0.5 rounded-full text-indigo-200 border border-white/10 pointer-events-none">
                        {item.duration}s
                      </span>
                    </div>

                    <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                          <span>{item.created_at}</span>
                          <span className="bg-indigo-500/15 text-indigo-300 border border-indigo-500/25 px-2 py-0.5 rounded-full">{item.category}</span>
                        </div>
                        <h4 className="font-bold text-xs sm:text-sm text-white line-clamp-2">{item.title}</h4>
                      </div>

                      <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-x-2 gap-y-2">
                        {item.published_url ? (
                          <div className="space-y-1 min-w-0">
                            <a
                              href={item.published_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] font-bold text-red-400 hover:underline flex items-center gap-1"
                            >
                              <YouTubeIcon className="w-3.5 h-3.5" />
                              <span>منشور على يوتيوب</span>
                            </a>
                            {(() => {
                              const yid = extractYoutubeId(item);
                              const st = yid ? statsMap[yid] : undefined;
                              return st ? (
                                <span className="text-[10px] text-slate-300 flex items-center gap-1.5">
                                  <span>👁 {formatCompact(st.views)}</span>
                                  <span>👍 {formatCompact(st.likes)}</span>
                                </span>
                              ) : null;
                            })()}
                          </div>
                        ) : (
                          <span className="text-[10px] text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded">
                            جاهز للنشر
                          </span>
                        )}

                        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                          {item.scenes && item.scenes.length > 0 && (
                            <button
                              onClick={() => handleReuseHistory(item)}
                              className="p-1.5 rounded-lg bg-indigo-600/20 border border-indigo-500/40 text-indigo-300 hover:bg-indigo-600/40"
                              title="إعادة استخدام هذا السكريبت (تعديل وإعادة إنتاج)"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleCopy(`cap-${item.video_id}`, `${item.title}\n${(item.tags || []).map(t => `#${String(t).replace(/\s+/g, "_")}`).join(" ")}`)}
                            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                            title="نسخ كابشن تيك توك (العنوان + الهاشتاجات)"
                          >
                            {copiedField === `cap-${item.video_id}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                          {item.has_subtitles && (
                            <a
                              href={getSrtDownloadUrl(item.video_id)}
                              download={`short_${item.video_id}.srt`}
                              className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                              title="تحميل ملف الترجمة SRT (للرفع على تيك توك/يوتيوب)"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <a
                            href={getVideoMediaUrl(item.video_id)}
                            download={`video_${item.video_id}.mp4`}
                            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                            title="تحميل"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>

                          <button
                            onClick={() => handleDeleteHistory(item.video_id)}
                            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-rose-400"
                            title="حذف"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              )}
              </>
            )}
          </div>
        )}

        {/* STEP: RENDER QUEUE */}
        {step === "queue" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg sm:text-2xl font-extrabold text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-amber-400" />
                  <span>طابور الإنتاج المتسلسل ({queueItems.length})</span>
                </h2>
                <p className="text-xs text-slate-400">تُنتج الفيديوهات واحداً تلو الآخر تلقائياً في الخلفية — أضف من شاشة المراجعة</p>
              </div>
              <button
                onClick={() => setStep("input")}
                className="gradient-btn px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>فيديو جديد</span>
              </button>
            </div>

            {queueItems.length === 0 ? (
              <div className="glass-panel p-8 rounded-2xl text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-slate-900 mx-auto flex items-center justify-center text-slate-500">
                  <Layers className="w-6 h-6" />
                </div>
                <p className="text-xs text-slate-400">الطابور فارغ. جهّز سكريبت واضغط «إضافة للطابور ➕» لإنتاج عدة فيديوهات متتالية.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {queueItems.map((q) => (
                  <div key={q.queue_id} className={`glass-panel p-3.5 sm:p-4 rounded-2xl flex items-center justify-between gap-3 animate-fade-up ${q.status === "processing" ? "border-indigo-500/60 shadow-lg shadow-indigo-600/20" : ""}`}>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-xs sm:text-sm text-white truncate">{q.title}</h4>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                        <span>{q.created_at}</span>
                        <span className="bg-slate-800 px-2 py-0.5 rounded">{q.category}</span>
                        {q.status === "queued" && <span className="pill-queued text-amber-300 bg-amber-950/50 border border-amber-700/50 px-2 py-0.5 rounded-full font-bold">⏳ بالانتظار</span>}
                        {q.status === "processing" && <span className="pill-processing text-indigo-300 bg-indigo-950/50 border border-indigo-700/50 px-2 py-0.5 rounded-full font-bold animate-pulse">⚙️ يُنتج الآن</span>}
                        {q.status === "done" && <span className="text-emerald-300 bg-emerald-950/50 border border-emerald-700/50 px-2 py-0.5 rounded-full font-bold">✅ تم</span>}
                        {q.status === "failed" && <span className="text-rose-300 bg-rose-950/50 border border-rose-700/50 px-2 py-0.5 rounded-full font-bold" title={q.error || ""}>❌ فشل</span>}
                      </div>
                      {q.status === "failed" && q.error && (
                        <p className="text-[10px] text-rose-400 mt-1 truncate">{q.error}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {(q.status === "failed" || q.status === "done") && (
                        <button
                          onClick={() => handleRetryQueue(q.queue_id)}
                          className="p-1.5 rounded-lg bg-indigo-600/20 border border-indigo-500/40 text-indigo-300 hover:bg-indigo-600/40"
                          title="إعادة التشغيل في الطابور"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {q.status === "done" && q.video_id && (
                        <a
                          href={getVideoMediaUrl(q.video_id)}
                          download={`video_${q.video_id}.mp4`}
                          className="p-1.5 rounded-lg bg-emerald-600/20 border border-emerald-500/40 text-emerald-300"
                          title="تحميل الفيديو المنتج"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      )}
                      {q.status !== "processing" && (
                        <button
                          onClick={() => handleRemoveQueue(q.queue_id)}
                          className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-rose-400"
                          title="حذف من الطابور"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* STEP: AUTOPILOT (daily scheduled production) */}
        {step === "autopilot" && (
          <div className="max-w-3xl mx-auto space-y-4">
            <div className="text-center space-y-1.5">
              <h2 className="text-xl sm:text-3xl font-extrabold tracking-tight">
                الطيار الآلي <span className="text-gradient">⏰</span>
              </h2>
              <p className="text-slate-400 text-xs sm:text-sm max-w-lg mx-auto">
                فيديو جديد كل يوم تلقائياً (بتوقيت السيرفر): سيناريو + إنتاج + نشر اختياري — وأنت نائم
              </p>
            </div>

            <form onSubmit={handleCreateSchedule} className="glass-panel-glow p-4 sm:p-6 rounded-2xl space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {NICHES.map((n) => {
                  const IconComponent = n.icon;
                  const sel = apNiche === n.id;
                  return (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => setApNiche(n.id)}
                      className={`select-card p-2.5 rounded-xl border text-right cursor-pointer flex items-center gap-2 ${
                        sel ? "select-card-selected bg-slate-900/90 border-violet-500" : "bg-slate-950/60 border-slate-800/80 hover:border-violet-500/50"
                      }`}
                    >
                      <span className={`w-7 h-7 rounded-lg bg-gradient-to-tr ${n.color} flex items-center justify-center text-white shrink-0`}>
                        <IconComponent className="w-3.5 h-3.5" />
                      </span>
                      <span className="font-bold text-[11px] text-white leading-tight">{n.title}</span>
                    </button>
                  );
                })}
              </div>

              <textarea
                rows={2}
                value={apPrompt}
                onChange={(e) => setApPrompt(e.target.value)}
                placeholder="موضوع الفيديو اليومي... (لعدة مواضيع متناوبة افصل بينها بسطر: --- )"
                className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl p-3 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 text-slate-100 placeholder:text-slate-500"
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">⏰ وقت التنفيذ اليومي:</label>
                  <input
                    type="time"
                    value={apTime}
                    onChange={(e) => setApTime(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 [color-scheme:dark]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">النشر التلقائي:</label>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setApAutoPublish(false)}
                      className={`flex-1 px-2 py-2 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                        !apAutoPublish ? "bg-emerald-500/20 border-emerald-500 text-emerald-300" : "bg-slate-950 border-slate-800 text-slate-400"
                      }`}
                    >
                      📝 مسودة فقط (آمن)
                    </button>
                    <button
                      type="button"
                      onClick={() => setApAutoPublish(true)}
                      className={`flex-1 px-2 py-2 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                        apAutoPublish ? "bg-red-500/20 border-red-500 text-red-300" : "bg-slate-950 border-slate-800 text-slate-400"
                      }`}
                    >
                      🚀 نشر تلقائي
                    </button>
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-slate-500">
                {apAutoPublish
                  ? "⚠️ سيُنشر كـ «غير مدرج» تلقائياً — راجعه من السجل وحوّله لعام."
                  : "الوضع الآمن: يُنتج الفيديو ويبقى في السجل بانتظار مراجعتك ونشرك اليدوي."}
              </p>

              <button
                type="submit"
                disabled={creatingSchedule || !apPrompt.trim()}
                className="w-full gradient-btn btn-shine py-3 rounded-xl font-bold text-xs sm:text-sm text-white shadow-xl shadow-violet-600/30 disabled:opacity-50 cursor-pointer"
              >
                {creatingSchedule ? "جاري الحفظ..." : "⏰ تفعيل الجدولة اليومية"}
              </button>
            </form>

            <div className="space-y-2.5">
              {schedules.length === 0 ? (
                <p className="text-center text-xs text-slate-500 py-4">لا توجد جدولات بعد — أنشئ أول جدولة يومية بالأعلى.</p>
              ) : (
                schedules.map((s) => (
                  <div key={s.id} className={`glass-panel p-3.5 rounded-2xl flex items-center justify-between gap-3 animate-fade-up ${s.enabled ? "border-violet-500/40" : "opacity-70"}`}>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-xs sm:text-sm text-white truncate">{s.prompt}</h4>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400 flex-wrap">
                        <span className="bg-violet-600/20 text-violet-200 border border-violet-500/30 px-2 py-0.5 rounded-full font-bold">⏰ {s.time} يومياً</span>
                        <span className="bg-slate-800 px-2 py-0.5 rounded">{s.category}</span>
                        <span>{s.auto_publish ? "🚀 نشر تلقائي" : "📝 مسودة"}</span>
                        {s.last_run && (
                          <span className={s.last_status === "completed" ? "text-emerald-400" : "text-rose-400"}>
                            {s.last_status === "completed" ? `✅ ${s.last_run}` : `❌ ${s.last_run}`}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleRunScheduleNow(s.id)}
                        className="p-1.5 rounded-lg bg-indigo-600/20 border border-indigo-500/40 text-indigo-300 hover:bg-indigo-600/40"
                        title="تشغيل فوري الآن"
                      >
                        <Play className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleToggleSchedule(s)}
                        className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold border cursor-pointer transition-all ${
                          s.enabled ? "bg-emerald-500/20 border-emerald-500 text-emerald-300" : "bg-slate-800 border-slate-700 text-slate-400"
                        }`}
                        title={s.enabled ? "إيقاف مؤقت" : "تفعيل"}
                      >
                        {s.enabled ? "مفعّلة" : "متوقفة"}
                      </button>
                      <button
                        onClick={() => handleDeleteSchedule(s.id)}
                        className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-rose-400"
                        title="حذف الجدولة"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        </div>

        {/* Osama Studio Brand Footer */}
        <footer className="mt-14 pt-8 pb-10 border-t border-[#272727] text-center text-xs text-[#717171] space-y-2">
          <div className="flex items-center justify-center gap-2 font-bold text-[#aaa]">
            <div className="w-5 h-5 rounded-md bg-red-600 flex items-center justify-center text-white text-[10px] font-black">
              OS
            </div>
            <span className="text-white font-extrabold">Osama Studio</span>
            <span>•</span>
            <span>استوديو أسامة للإنتاج المرئي والذكاء الاصطناعي</span>
          </div>
          <p className="text-[11px] text-[#555]">
            منصة أتمتة متكاملة لصناعة ونشر الفيديوهات القصيرة على YouTube Shorts و TikTok
          </p>
        </footer>

        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          onSettingsSaved={checkServerHealth}
        />
      </main>

      {/* Toasts */}
      <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-[60] flex flex-col items-center gap-2 pointer-events-none px-4 w-full max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast-item pointer-events-auto flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold shadow-2xl border backdrop-blur-lg ${
              t.kind === "success"
                ? "bg-[#1a1a1a] border-green-600/40 text-green-400"
                : "bg-[#1a1a1a] border-[#3ea6ff]/40 text-[#3ea6ff]"
            }`}
          >
            <Check className="w-3.5 h-3.5 shrink-0" />
            <span>{t.text}</span>
          </div>
        ))}
      </div>

      {/* Mobile Sticky Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0f0f0f]/95 backdrop-blur-lg border-t border-[#272727] px-4 py-2 flex items-center justify-around text-[10px] font-semibold text-[#717171]">
        <button
          onClick={() => setStep("input")}
          className={`flex flex-col items-center gap-1 ${step !== "history" && step !== "queue" ? "text-white" : "hover:text-white"}`}
        >
          <Film className="w-4 h-4" />
          <span>إنشاء فيديو</span>
        </button>

        <button
          onClick={() => {
            setStep("history");
            loadHistoryData();
          }}
          className={`flex flex-col items-center gap-1 ${step === "history" ? "text-white" : "hover:text-white"}`}
        >
          <Folder className="w-4 h-4" />
          <span>المكتبة ({historyItems.length})</span>
        </button>

        <button
          onClick={() => {
            setStep("queue");
            loadQueue();
          }}
          className={`flex flex-col items-center gap-1 relative ${step === "queue" ? "text-white" : "hover:text-white"}`}
        >
          <Layers className="w-4 h-4" />
          <span>الطابور</span>
          {queueItems.filter(q => q.status === "queued" || q.status === "processing").length > 0 && (
            <span className="absolute -top-1.5 -left-1 bg-red-600 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
              {queueItems.filter(q => q.status === "queued" || q.status === "processing").length}
            </span>
          )}
        </button>

        <button
          onClick={() => setIsSettingsOpen(true)}
          className="flex flex-col items-center gap-1 hover:text-white"
        >
          <Settings2 className="w-4 h-4" />
          <span>الإعدادات</span>
        </button>
      </nav>
    </div>
  );
}
