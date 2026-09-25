"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Settings2,
  Brain,
  Volume2,
  Film,
  Save,
  Check,
  Key,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  Send
} from "lucide-react";
import { fetchSettings, updateSettings, testNotify, PublicSettings } from "@/lib/api";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsSaved: () => void;
}

export default function SettingsModal({ isOpen, onClose, onSettingsSaved }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<"llm" | "voice" | "media" | "publishing">("llm");
  const [settings, setSettings] = useState<PublicSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [testingNotify, setTestingNotify] = useState(false);

  // Form Fields
  const [llmProvider, setLlmProvider] = useState<string>("gemini");
  const [geminiKey, setGeminiKey] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");
  const [groqKey, setGroqKey] = useState("");
  const [openrouterKey, setOpenrouterKey] = useState("");
  const [llmModel, setLlmModel] = useState("");

  const [voiceProvider, setVoiceProvider] = useState<string>("edge_tts");
  const [elevenlabsKey, setElevenlabsKey] = useState("");
  const [elevenlabsVoiceId, setElevenlabsVoiceId] = useState("");
  const [openaiTtsKey, setOpenaiTtsKey] = useState("");

  const [mediaProvider, setMediaProvider] = useState<string>("pexels");
  const [pexelsKey, setPexelsKey] = useState("");
  const [pixabayKey, setPixabayKey] = useState("");

  const [tgToken, setTgToken] = useState("");
  const [tgChatId, setTgChatId] = useState("");

  useEffect(() => {
    if (isOpen) {
      loadCurrentSettings();
    }
  }, [isOpen]);

  const loadCurrentSettings = async () => {
    setLoading(true);
    try {
      const data = await fetchSettings();
      setSettings(data);
      setLlmProvider(data.llm.provider);
      setLlmModel(data.llm.model_name);
      setVoiceProvider(data.voice.provider);
      setElevenlabsVoiceId(data.voice.elevenlabs_voice_id || "21m00Tcm4TlvDq8ikWAM");
      setMediaProvider(data.media.provider);
      setTgChatId(data.publishing?.telegram_chat_id || "");
    } catch (err) {
      console.error("Error loading settings:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg(null);

    const payload: Record<string, any> = {
      llm: {
        provider: llmProvider,
        model_name: llmModel,
      },
      voice: {
        provider: voiceProvider,
        elevenlabs_voice_id: elevenlabsVoiceId,
      },
      media: {
        provider: mediaProvider,
      },
    };

    if (geminiKey) payload.llm.gemini_api_key = geminiKey;
    if (openaiKey) payload.llm.openai_api_key = openaiKey;
    if (groqKey) payload.llm.groq_api_key = groqKey;
    if (openrouterKey) payload.llm.openrouter_api_key = openrouterKey;

    if (elevenlabsKey) payload.voice.elevenlabs_api_key = elevenlabsKey;
    if (openaiTtsKey) payload.voice.openai_api_key = openaiTtsKey;

    if (pexelsKey) payload.media.pexels_api_key = pexelsKey;
    if (pixabayKey) payload.media.pixabay_api_key = pixabayKey;

    payload.publishing = {};
    if (tgToken) payload.publishing.telegram_bot_token = tgToken;
    if (tgChatId) payload.publishing.telegram_chat_id = tgChatId;

    try {
      const res = await updateSettings(payload);
      setSettings(res.settings);
      setSuccessMsg("تم حفظ الإعدادات وتحديث المزودين بنجاح!");
      onSettingsSaved();
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err) {
      console.error("Error saving settings:", err);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0f0f0f] border border-[#272727] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col font-sans">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#272727] flex items-center justify-between bg-[#1a1a1a]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#272727] text-white border border-[#3f3f3f] flex items-center justify-center">
              <Settings2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-extrabold text-white text-base">إعدادات مزودي استوديو أسامة</h2>
              <p className="text-xs text-[#717171]">Osama Studio · اختر مزودي الذكاء الاصطناعي، الصوت، والمرئيات وقم بربط المفاتيح</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#272727] text-[#aaa] hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#272727] bg-[#0f0f0f] px-6 pt-2 gap-2 text-xs font-semibold">
          <button
            onClick={() => setActiveTab("llm")}
            className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-all ${
              activeTab === "llm"
                ? "border-white text-white"
                : "border-transparent text-[#717171] hover:text-[#aaa]"
            }`}
          >
            <Brain className="w-4 h-4" />
            <span>1. توليد السيناريو (LLM)</span>
          </button>

          <button
            onClick={() => setActiveTab("voice")}
            className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-all ${
              activeTab === "voice"
                ? "border-white text-white"
                : "border-transparent text-[#717171] hover:text-[#aaa]"
            }`}
          >
            <Volume2 className="w-4 h-4" />
            <span>2. توليد الصوت (TTS)</span>
          </button>

          <button
            onClick={() => setActiveTab("media")}
            className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-all ${
              activeTab === "media"
                ? "border-white text-white"
                : "border-transparent text-[#717171] hover:text-[#aaa]"
            }`}
          >
            <Film className="w-4 h-4" />
            <span>3. لقطات المرئيات (Footage)</span>
          </button>

          <button
            onClick={() => setActiveTab("publishing")}
            className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-all ${
              activeTab === "publishing"
                ? "border-white text-white"
                : "border-transparent text-[#717171] hover:text-[#aaa]"
            }`}
          >
            <Send className="w-4 h-4" />
            <span>4. النشر والتنبيهات</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
          {successMsg && (
            <div className="p-3.5 rounded-xl bg-green-950/30 border border-green-800/50 text-green-400 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* TAB 1: LLM */}
          {activeTab === "llm" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  المزود النشط لكتابة السيناريو:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: "gemini", label: "Google Gemini", sub: "2.5 Flash / 2.0" },
                    { id: "openai", label: "OpenAI", sub: "GPT-4o / mini" },
                    { id: "groq", label: "Groq", sub: "Llama 3.3 (فائق السرعة)" },
                    { id: "openrouter", label: "OpenRouter", sub: "DeepSeek / Claude" },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setLlmProvider(p.id)}
                      className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
                        llmProvider === p.id
                          ? "bg-indigo-600/20 border-indigo-500 text-white shadow-sm"
                          : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      <div className="font-bold text-xs">{p.label}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{p.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Conditional Inputs */}
              {llmProvider === "gemini" && (
                <div className="space-y-2 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                  <label className="block text-xs font-semibold text-slate-200">
                    Gemini API Key:
                  </label>
                  <input
                    type="password"
                    value={geminiKey}
                    onChange={(e) => setGeminiKey(e.target.value)}
                    placeholder={settings?.llm.has_gemini_key ? `محفوظ مسبقاً (${settings.llm.gemini_key_masked})` : "أدخل مفتاح Gemini API"}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                  />
                  <p className="text-[11px] text-slate-400 flex items-center justify-between">
                    <span>احصل عليه مجاناً من Google AI Studio</span>
                    <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline inline-flex items-center gap-1">
                      <span>فتح AI Studio</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </p>
                </div>
              )}

              {llmProvider === "openai" && (
                <div className="space-y-2 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                  <label className="block text-xs font-semibold text-slate-200">
                    OpenAI API Key:
                  </label>
                  <input
                    type="password"
                    value={openaiKey}
                    onChange={(e) => setOpenaiKey(e.target.value)}
                    placeholder={settings?.llm.has_openai_key ? `محفوظ مسبقاً (${settings.llm.openai_key_masked})` : "sk-..."}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                  />
                  <div className="pt-2">
                    <label className="block text-xs text-slate-300 mb-1">اسم النموذج (Model):</label>
                    <input
                      type="text"
                      value={llmModel || "gpt-4o-mini"}
                      onChange={(e) => setLlmModel(e.target.value)}
                      placeholder="gpt-4o-mini أو gpt-4o"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white font-mono"
                    />
                  </div>
                </div>
              )}

              {llmProvider === "groq" && (
                <div className="space-y-2 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                  <label className="block text-xs font-semibold text-slate-200">
                    Groq API Key:
                  </label>
                  <input
                    type="password"
                    value={groqKey}
                    onChange={(e) => setGroqKey(e.target.value)}
                    placeholder={settings?.llm.has_groq_key ? `محفوظ مسبقاً (${settings.llm.groq_key_masked})` : "gsk_..."}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                  />
                  <div className="pt-2">
                    <label className="block text-xs text-slate-300 mb-1">اسم النموذج (Model):</label>
                    <input
                      type="text"
                      value={llmModel || "llama-3.3-70b-versatile"}
                      onChange={(e) => setLlmModel(e.target.value)}
                      placeholder="llama-3.3-70b-versatile"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white font-mono"
                    />
                  </div>
                </div>
              )}

              {llmProvider === "openrouter" && (
                <div className="space-y-2 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                  <label className="block text-xs font-semibold text-slate-200">
                    OpenRouter API Key:
                  </label>
                  <input
                    type="password"
                    value={openrouterKey}
                    onChange={(e) => setOpenrouterKey(e.target.value)}
                    placeholder={settings?.llm.has_openrouter_key ? `محفوظ مسبقاً (${settings.llm.openrouter_key_masked})` : "sk-or-v1-..."}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                  />
                  <div className="pt-2">
                    <label className="block text-xs text-slate-300 mb-1">اسم النموذج (Model):</label>
                    <input
                      type="text"
                      value={llmModel || "deepseek/deepseek-chat"}
                      onChange={(e) => setLlmModel(e.target.value)}
                      placeholder="deepseek/deepseek-chat أو anthropic/claude-3.5-sonnet"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white font-mono"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: VOICE (TTS) */}
          {activeTab === "voice" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  المزود النشط للتعليق الصوتي:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { id: "edge_tts", label: "Edge TTS", sub: "مجاني 100% · ممتاز للعربية", tag: "افتراضي" },
                    { id: "elevenlabs", label: "ElevenLabs", sub: "أصوات واقعية وفخمة", tag: "مدفوع" },
                    { id: "openai_tts", label: "OpenAI Audio", sub: "tts-1 نماذج صوتية سريعة", tag: "مدفوع" },
                  ].map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setVoiceProvider(v.id)}
                      className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
                        voiceProvider === v.id
                          ? "bg-indigo-600/20 border-indigo-500 text-white shadow-sm"
                          : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs">{v.label}</span>
                        <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded font-medium">{v.tag}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">{v.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              {voiceProvider === "edge_tts" && (
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                    <ShieldCheck className="w-4 h-4" />
                    <span>مفعّل ومجاني بدون الحاجة إلى أي مفاتيح</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    يعتمد على خوادم Microsoft Neural Speech لتوليد أصوات عربية طبيعية (سعودي، مصري، إماراتي) مع دعم استخراج توقيت الكلمات بالمللي ثانية لمزامنة النصوص.
                  </p>
                </div>
              )}

              {voiceProvider === "elevenlabs" && (
                <div className="space-y-3 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div>
                    <label className="block text-xs font-semibold text-slate-200 mb-1">
                      ElevenLabs API Key:
                    </label>
                    <input
                      type="password"
                      value={elevenlabsKey}
                      onChange={(e) => setElevenlabsKey(e.target.value)}
                      placeholder={settings?.voice.has_elevenlabs_key ? `محفوظ مسبقاً (${settings.voice.elevenlabs_key_masked})` : "xi-api-key..."}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-200 mb-1">
                      Voice ID (معرف الصوت المخصص):
                    </label>
                    <input
                      type="text"
                      value={elevenlabsVoiceId}
                      onChange={(e) => setElevenlabsVoiceId(e.target.value)}
                      placeholder="21m00Tcm4TlvDq8ikWAM"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white font-mono"
                    />
                  </div>
                </div>
              )}

              {voiceProvider === "openai_tts" && (
                <div className="space-y-2 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                  <label className="block text-xs font-semibold text-slate-200">
                    OpenAI API Key:
                  </label>
                  <input
                    type="password"
                    value={openaiTtsKey}
                    onChange={(e) => setOpenaiTtsKey(e.target.value)}
                    placeholder="يمكن تركه فارغاً إذا كنت تستخدم نفس مفتاح OpenAI للسيناريو"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                  />
                </div>
              )}
            </div>
          )}

          {/* TAB 3: MEDIA / FOOTAGE */}
          {activeTab === "media" && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/50 text-[11px] text-emerald-200 leading-relaxed">
                <span className="font-bold">🏎️ وضع السيارات الحقيقية:</span> خيارا (ستوك حقيقي + AI واقعي) يعملان تلقائياً —
                الستوك يحتاج مفتاح Pexels/Pixabay، وعند غيابه يُستخدم التوليد الواقعي مجاناً بدون مفاتيح.
                خيار الكرتون 3D يبقى متاحاً من نيش الأطفال في الشاشة الرئيسية.
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  المزود النشط للفيديوهات الرأسية (9:16):
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: "pexels", label: "Pexels API", sub: "مكتبة ضخمة لمقاطع 9:16 رأسية بجودة 1080p", free: true },
                    { id: "pixabay", label: "Pixabay API", sub: "مكتبة مقاطع وفيديوهات عالية الجودة كبديل", free: true },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMediaProvider(m.id)}
                      className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
                        mediaProvider === m.id
                          ? "bg-indigo-600/20 border-indigo-500 text-white shadow-sm"
                          : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      <div className="font-bold text-xs">{m.label}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{m.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              {mediaProvider === "pexels" && (
                <div className="space-y-2 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                  <label className="block text-xs font-semibold text-slate-200">
                    Pexels API Key:
                  </label>
                  <input
                    type="password"
                    value={pexelsKey}
                    onChange={(e) => setPexelsKey(e.target.value)}
                    placeholder={settings?.media.has_pexels_key ? `محفوظ مسبقاً (${settings.media.pexels_key_masked})` : "أدخل مفتاح Pexels API"}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                  />
                  <p className="text-[11px] text-slate-400 flex items-center justify-between">
                    <span>مجاني تماماً وبدون بطاقة بنكية</span>
                    <a href="https://www.pexels.com/api/" target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline inline-flex items-center gap-1">
                      <span>صفحة Pexels API</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </p>
                </div>
              )}

              {mediaProvider === "pixabay" && (
                <div className="space-y-2 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                  <label className="block text-xs font-semibold text-slate-200">
                    Pixabay API Key:
                  </label>
                  <input
                    type="password"
                    value={pixabayKey}
                    onChange={(e) => setPixabayKey(e.target.value)}
                    placeholder={settings?.media.has_pixabay_key ? `محفوظ مسبقاً (${settings.media.pixabay_key_masked})` : "أدخل مفتاح Pixabay API"}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                  />
                  <p className="text-[11px] text-slate-400 flex items-center justify-between">
                    <span>احصل على المفتاح من صفحة Pixabay Docs</span>
                    <a href="https://pixabay.com/api/docs/" target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline inline-flex items-center gap-1">
                      <span>Pixabay API Docs</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: PUBLISHING & NOTIFICATIONS */}
          {activeTab === "publishing" && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 space-y-2">
                <div className="font-bold text-slate-200">📢 تنبيهات تيليجرام للمهام الخلفية</div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  استقبل رسالة فورية عند اكتمال/فشل فيديو في الطابور أو الطيار الآلي. أنشئ بوتاً عبر
                  <span className="text-indigo-300 font-mono"> @BotFather </span>
                  ثم أرسل له أي رسالة واجلب معرف المحادثة من
                  <span className="text-indigo-300 font-mono"> getUpdates </span>.
                </p>
              </div>

              <div className="space-y-3 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <div>
                  <label className="block text-xs font-semibold text-slate-200 mb-1">
                    Bot Token:
                  </label>
                  <input
                    type="password"
                    value={tgToken}
                    onChange={(e) => setTgToken(e.target.value)}
                    placeholder={settings?.publishing?.has_telegram_token ? `محفوظ مسبقاً (${settings.publishing.telegram_token_masked})` : "123456:ABC-DEF..."}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-200 mb-1">
                    Chat ID:
                  </label>
                  <input
                    type="text"
                    value={tgChatId}
                    onChange={(e) => setTgChatId(e.target.value)}
                    placeholder="مثال: 123456789"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                  />
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    setTestingNotify(true);
                    try {
                      await testNotify(tgToken || undefined, tgChatId || undefined);
                      setSuccessMsg("وصلت رسالة الاختبار إلى تيليجرام بنجاح! ✅");
                      setTimeout(() => setSuccessMsg(null), 3500);
                    } catch {
                      setSuccessMsg("تعذر الإرسال — احفظ الإعدادات أولاً ثم أعد المحاولة.");
                      setTimeout(() => setSuccessMsg(null), 3500);
                    } finally {
                      setTestingNotify(false);
                    }
                  }}
                  disabled={testingNotify}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-sky-300 bg-sky-600/15 hover:bg-sky-600/30 border border-sky-500/40 cursor-pointer disabled:opacity-50 transition-all"
                >
                  {testingNotify ? "جاري الإرسال..." : "📨 إرسال رسالة اختبار"}
                </button>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-4 border-t border-[#272727] flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-full text-xs font-semibold text-[#aaa] hover:text-white bg-[#272727] hover:bg-[#3f3f3f] transition-colors"
            >
              إلغاء
            </button>

            <button
              type="submit"
              disabled={saving}
              className="gradient-btn px-6 py-2.5 rounded-full text-xs font-bold text-white flex items-center gap-2 shadow-lg shadow-red-600/20 disabled:opacity-50 cursor-pointer"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>جاري الحفظ...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>حفظ التغييرات</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
