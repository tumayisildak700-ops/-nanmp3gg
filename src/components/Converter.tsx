import React, { useState, useEffect } from "react";
import { Youtube, Music, Video, ArrowRight, Download, RefreshCw, AlertTriangle, Terminal, Info, CheckCircle2, Sparkles, Volume2, VolumeX, Smartphone, Lock, QrCode } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ConversionRecord, User } from "../types";
import { audioSynth } from "../lib/audio";

interface ConverterProps {
  token: string | null;
  currentUser: User | null;
  onSuccessConversion: () => void;
  onOpenPremium: (plan?: "monthly" | "yearly") => void;
  isMaintenanceMode?: boolean;
}

export default function Converter({ token, currentUser, onSuccessConversion, onOpenPremium, isMaintenanceMode = false }: ConverterProps) {
  const [videoUrl, setVideoUrl] = useState("");
  const [format, setFormat] = useState<"mp3" | "mp4">("mp3");
  const [quality, setQuality] = useState("320kbps");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeAds, setActiveAds] = useState<any[]>([]);

  // Premium Smart Sound FX states
  const [soundEffectsEnabled, setSoundEffectsEnabled] = useState(() => {
    return localStorage.getItem("premium_sfx_enabled") !== "false";
  });
  const [sfxVolume, setSfxVolume] = useState(() => {
    return parseFloat(localStorage.getItem("premium_sfx_volume") || "0.4");
  });
  const [selectedSfxStyle, setSelectedSfxStyle] = useState(() => {
    return localStorage.getItem("premium_sfx_style") || "crystalline";
  });

  // Sync sound engine options
  useEffect(() => {
    localStorage.setItem("premium_sfx_enabled", String(soundEffectsEnabled));
    localStorage.setItem("premium_sfx_volume", String(sfxVolume));
    localStorage.setItem("premium_sfx_style", selectedSfxStyle);
    audioSynth.setVolume(sfxVolume);
  }, [soundEffectsEnabled, sfxVolume, selectedSfxStyle]);
  
  // Active conversion tracking
  const [activeConv, setActiveConv] = useState<ConversionRecord | null>(null);
  const [logMessage, setLogMessage] = useState("");

  const handleAdClick = (adId: string) => {
    fetch(`/api/advertisements/${adId}/click`, { method: "POST" }).catch(() => {});
  };

  // Fetch active sponsor advertisements on mount
  useEffect(() => {
    fetch("/api/advertisements")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setActiveAds(data);
          // Increment views for loaded sponsor advertisements
          data.forEach((ad: any) => {
            fetch(`/api/advertisements/${ad.id}/view`, { method: "POST" }).catch(() => {});
          });
        }
      })
      .catch(() => {});
  }, []);

  const isPremiumUser = currentUser?.isPremium || currentUser?.role === "admin";
  const isSelectedPremiumQuality = 
    (format === "mp3" && quality === "320kbps") ||
    (format === "mp4" && (quality === "1440p" || quality === "2160p"));

  // Keep quality in sync with format changes
  useEffect(() => {
    if (format === "mp3") {
      setQuality("320kbps");
    } else {
      setQuality("1080p");
    }
  }, [format]);

  // Dynamic log message based on progress
  useEffect(() => {
    if (!activeConv) return;
    const p = activeConv.progress;
    if (p === 0) {
      setLogMessage("YouTube sunucularıyla bağlantı kuruluyor...");
    } else if (p > 0 && p <= 25) {
      setLogMessage(`Video başlığı ve meta verileri alınıyor... [${p}%]`);
    } else if (p > 25 && p <= 50) {
      setLogMessage(`Video akışı indiriliyor ve tampona alınıyor... [${p}%]`);
    } else if (p > 50 && p <= 75) {
      setLogMessage(
        format === "mp3"
          ? `Ses akışı ayrıştırılıyor ve 44.1kHz frekansına dönüştürülüyor... [${p}%]`
          : `Görüntü ve ses akışları senkronize ediliyor... [${p}%]`
      );
    } else if (p > 75 && p < 100) {
      setLogMessage(`FFmpeg ile yüksek kaliteli çıktı oluşturuluyor... [${p}%]`);
    } else if (p >= 100) {
      setLogMessage("İşlem tamamlandı! Dosyanız hazır.");
    }
  }, [activeConv, format]);

  // Polling logic for active conversion
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (activeConv && activeConv.status === "processing") {
      intervalId = setInterval(async () => {
        try {
          const response = await fetch(`/api/convert/status/${activeConv.id}`);
          if (!response.ok) throw new Error();
          const data = await response.json();
          setActiveConv(data);

          if (data.status === "completed") {
            setLoading(false);
            if (isPremiumUser && soundEffectsEnabled) {
              audioSynth.playSuccess(selectedSfxStyle);
            }
            onSuccessConversion(); // Refresh history
          } else if (data.status === "failed") {
            setError("Dönüştürme işlemi başarısız oldu. Lütfen tekrar deneyin.");
            setLoading(false);
            if (isPremiumUser && soundEffectsEnabled) {
              audioSynth.playError();
            }
            setActiveConv(null);
          }
        } catch (err) {
          // Fail silently and retry on next interval
        }
      }, 700);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [activeConv, onSuccessConversion, isPremiumUser, soundEffectsEnabled, selectedSfxStyle]);

  // Extract YouTube ID for real thumbnail
  const getYoutubeId = (url: string): string | null => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  const videoId = getYoutubeId(videoUrl);
  const thumbnailUrl = videoId 
    ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
    : null;

  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (isMaintenanceMode) {
      setError("Sistemimiz şu anda bakım çalışması nedeniyle geçici olarak dönüştürme işlemlerine kapatılmıştır. Sabrınız için teşekkür ederiz.");
      return;
    }
    
    if (!videoUrl) {
      setError("Lütfen geçerli bir YouTube URL'si yapıştırın.");
      return;
    }

    const isYoutube = videoUrl.includes("youtube.com") || videoUrl.includes("youtu.be");
    if (!isYoutube) {
      setError("Dönüştürücü yalnızca geçerli YouTube linklerini destekler.");
      return;
    }

    // Intercept premium qualities for non-premium users before wasting server cycles
    if (isSelectedPremiumQuality && !isPremiumUser) {
      setError("320kbps MP3 veya 2K/4K MP4 kaliteleri yalnızca Premium üyelerimize özeldir. Hemen üyeliğinizi başlatın!");
      onOpenPremium("monthly");
      return;
    }

    setLoading(true);
    if (isPremiumUser && soundEffectsEnabled) {
      audioSynth.playStart();
    }

    try {
      const response = await fetch("/api/convert", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ videoUrl, format, quality }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error === "premium_required") {
          onOpenPremium("monthly");
        }
        throw new Error(data.message || data.error || "Dönüştürme isteği başlatılamadı.");
      }

      setActiveConv(data);
    } catch (err: any) {
      setError(err.message || "Bağlantı hatası oluştu.");
      setLoading(false);
      if (isPremiumUser && soundEffectsEnabled) {
        audioSynth.playError();
      }
    }
  };

  const resetConverter = () => {
    setVideoUrl("");
    setActiveConv(null);
    setError("");
  };

  return (
    <div className="mx-auto max-w-3xl py-8 px-4" id="converter-container">
      {/* Intro Hero Section */}
      <div className="text-center mb-10" id="converter-hero">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 border border-red-500/30 px-3 py-1 text-xs font-semibold text-red-500"
        >
          <Youtube className="h-4 w-4" /> YouTube Dönüştürücü
        </motion.div>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl" id="app-headline">
          Saniyeler İçinde <span className="text-red-500">Ses & Video</span> İndirin
        </h1>
        <p className="mt-3 text-base text-neutral-400">
          YouTube linklerini reklamsız, beklemeden ve sınırsız bir şekilde MP3 veya MP4 formatına dönüştürün.
        </p>
      </div>

      {/* Live Approved Sponsor Advertisements (Hidden for Premium users) */}
      {!isPremiumUser && activeAds.length > 0 && (
        <div className="mb-8 space-y-3" id="public-sponsor-ads">
          <div className="flex items-center justify-between text-[10px] font-bold text-neutral-500 uppercase tracking-widest px-1">
            <span>Önerilen Sponsorlu Bağlantılar</span>
            <span className="text-amber-500/80 hover:underline cursor-pointer" onClick={() => onOpenPremium()}>
              👑 Reklamları Kapat (Premium)
            </span>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {activeAds.map((ad: any) => (
              <div key={ad.id} className="rounded-xl border border-neutral-800 bg-neutral-900/40 overflow-hidden relative shadow-md">
                {ad.templateStyle === "clean" && (
                  <div className="p-4 bg-gradient-to-r from-neutral-900 to-neutral-950 text-white flex items-center justify-between border-l-4 border-red-500">
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-bold text-red-500 uppercase tracking-widest block">SPONSORLU</span>
                      <h5 className="text-xs font-extrabold text-neutral-100">{ad.companyName}</h5>
                      <p className="text-[10px] text-neutral-400 line-clamp-1">Yüksek hız, güvenli dönüştürme ve kesintisiz müzik.</p>
                    </div>
                    <a href={ad.websiteUrl} onClick={() => handleAdClick(ad.id)} target="_blank" referrerPolicy="no-referrer" className="rounded bg-white hover:bg-neutral-200 px-3 py-1.5 text-[10px] font-bold text-neutral-950 transition shrink-0 ml-3">
                      Ziyaret Et
                    </a>
                  </div>
                )}

                {ad.templateStyle === "spotify" && (
                  <div className="p-4 bg-gradient-to-r from-[#121212] to-[#1ED760]/5 text-white flex items-center justify-between border-l-4 border-[#1ED760]">
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-bold text-[#1ED760] uppercase tracking-widest flex items-center gap-0.5">
                        ★ SPOTIFY TAVSİYESİ
                      </span>
                      <h5 className="text-xs font-extrabold text-white">{ad.companyName}</h5>
                      <p className="text-[10px] text-[#b3b3b3] line-clamp-1">Sıradaki hit parçayı hemen şimdi listene ekle.</p>
                    </div>
                    <a href={ad.websiteUrl} onClick={() => handleAdClick(ad.id)} target="_blank" referrerPolicy="no-referrer" className="rounded-full bg-[#1ED760] hover:bg-[#1db954] px-4 py-1.5 text-[10px] font-extrabold text-black transition shrink-0 ml-3 uppercase">
                      DİNLE
                    </a>
                  </div>
                )}

                {ad.templateStyle === "neon" && (
                  <div className="p-4 bg-gradient-to-r from-neutral-950 via-[#ff0055]/5 to-neutral-950 text-white flex items-center justify-between border border-[#ff0055]/30 shadow-[0_0_15px_rgba(255,0,85,0.05)]">
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-bold text-[#ff0055] uppercase tracking-widest block">NEON BEAT</span>
                      <h5 className="text-xs font-black text-white tracking-wide uppercase">{ad.companyName}</h5>
                      <p className="text-[10px] text-neutral-400 font-mono line-clamp-1">Sınırları aşan ritimler ve tınılar.</p>
                    </div>
                    <a href={ad.websiteUrl} onClick={() => handleAdClick(ad.id)} target="_blank" referrerPolicy="no-referrer" className="rounded bg-transparent px-3 py-1.5 text-[10px] font-bold text-[#ff0055] border border-[#ff0055] transition shrink-0 ml-3">
                      KATIL
                    </a>
                  </div>
                )}

                {ad.templateStyle === "retro" && (
                  <div className="p-4 bg-[#1a1512] text-[#f4eae1] flex items-center justify-between border-l-4 border-[#8b5a2b]">
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-bold text-[#8b5a2b] uppercase tracking-widest block">VINTAGE VINYL</span>
                      <h5 className="text-xs font-serif font-bold text-[#f4eae1]">{ad.companyName}</h5>
                      <p className="text-[10px] text-[#c5b3a3] font-serif italic line-clamp-1">Plak sıcaklığı ve analog müziğin büyüsü.</p>
                    </div>
                    <a href={ad.websiteUrl} onClick={() => handleAdClick(ad.id)} target="_blank" referrerPolicy="no-referrer" className="rounded bg-[#8b5a2b] hover:bg-[#6f4520] px-3 py-1.5 text-[10px] font-bold text-[#f4eae1] transition shrink-0 ml-3">
                      PLAKLAR
                    </a>
                  </div>
                )}

                {ad.templateStyle === "custom" && (
                  <a href={ad.websiteUrl} onClick={() => handleAdClick(ad.id)} target="_blank" referrerPolicy="no-referrer" className="block relative group overflow-hidden">
                    {ad.bannerUrl ? (
                      <img
                        src={ad.bannerUrl}
                        alt={ad.companyName}
                        className="w-full h-20 object-cover group-hover:scale-[1.01] transition"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=1200&auto=format&fit=crop";
                        }}
                      />
                    ) : (
                      <div className="h-20 w-full bg-neutral-950 flex flex-col items-center justify-center border border-dashed border-neutral-800">
                        <span className="text-[10px] text-neutral-500 font-bold">Özel Sponsor: {ad.companyName}</span>
                      </div>
                    )}
                    <div className="absolute top-2 right-2 rounded bg-black/60 px-1.5 py-0.5 text-[8px] font-bold text-white uppercase">
                      Sponsorlu
                    </div>
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-6 rounded-xl bg-amber-950/20 border border-amber-800/60 p-4 flex gap-3 text-amber-400 text-sm"
          id="converter-error-box"
        >
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />
          <div>
            <span className="font-semibold">Hata oluştu:</span> {error}
          </div>
        </motion.div>
      )}

      <AnimatePresence mode="wait">
        {/* Step 1: Input / Setup View */}
        {!activeConv && (
          <motion.div
            key="input-form"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="rounded-2xl border border-neutral-800 bg-neutral-900/60 backdrop-blur-md p-6 sm:p-8 shadow-xl"
            id="converter-form-card"
          >
            {isMaintenanceMode ? (
              <div className="text-center py-10 space-y-5" id="maintenance-panel">
                <div className="mx-auto w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500 animate-pulse">
                  <Terminal className="h-8 w-8" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-white uppercase tracking-wider">
                    ⚙️ SİSTEM BAKIM MODUNDADIR
                  </h3>
                  <p className="text-xs text-neutral-400 max-w-md mx-auto leading-relaxed">
                    Sistemimiz daha hızlı ve kaliteli hizmet verebilmek amacıyla şu anda planlı bakım çalışmasındadır. Dönüştürme işlemleri geçici olarak askıya alınmıştır. En kısa sürede tekrar aktif edilecektir.
                  </p>
                </div>
                <div className="pt-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-950 border border-neutral-800 text-[10px] font-mono text-neutral-500 uppercase tracking-widest">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping" />
                    Status: MAINTENANCE
                  </span>
                </div>
              </div>
            ) : (
              <form onSubmit={handleConvert} className="space-y-6">
              {/* URL Input */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-neutral-300">
                  YouTube Video Linki
                </label>
                <div className="relative">
                  <input
                    type="url"
                    required
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full rounded-xl border border-neutral-800 bg-neutral-950 py-3.5 pl-4 pr-24 text-sm text-white placeholder-neutral-600 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 transition"
                    id="youtube-url-input"
                  />
                  {videoUrl && (
                    <button
                      type="button"
                      onClick={() => setVideoUrl("")}
                      className="absolute right-16 top-1/2 -translate-y-1/2 rounded-md bg-neutral-900 px-2.5 py-1 text-xs text-neutral-400 hover:text-white"
                      id="url-clear-btn"
                    >
                      Temizle
                    </button>
                  )}
                  <button
                    type="submit"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-red-600 hover:bg-red-700 p-2 text-white transition cursor-pointer"
                    id="url-submit-btn"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Format & Quality Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Format tab */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-neutral-300">
                    Çıktı Formatı
                  </label>
                  <div className="grid grid-cols-2 gap-2 bg-neutral-950 p-1 rounded-xl border border-neutral-800">
                    <button
                      type="button"
                      onClick={() => setFormat("mp3")}
                      className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition cursor-pointer ${
                        format === "mp3"
                          ? "bg-neutral-800 text-white"
                          : "text-neutral-500 hover:text-neutral-300"
                      }`}
                      id="format-mp3-btn"
                    >
                      <Music className="h-4 w-4" /> MP3 (Ses)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormat("mp4")}
                      className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition cursor-pointer ${
                        format === "mp4"
                          ? "bg-neutral-800 text-white"
                          : "text-neutral-500 hover:text-neutral-300"
                      }`}
                      id="format-mp4-btn"
                    >
                      <Video className="h-4 w-4" /> MP4 (Video)
                    </button>
                  </div>
                </div>

                {/* Quality Selector */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-neutral-300">
                    Ses / Görüntü Kalitesi
                  </label>
                  <select
                    value={quality}
                    onChange={(e) => setQuality(e.target.value)}
                    className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-300 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 transition cursor-pointer"
                    id="quality-select"
                  >
                    {format === "mp3" ? (
                      <>
                        <option value="320kbps">320 kbps (👑 Premium - Stüdyo Kalitesi)</option>
                        <option value="256kbps">256 kbps (Çok İyi Kalite)</option>
                        <option value="192kbps">192 kbps (Standart Kalite)</option>
                        <option value="128kbps">128 kbps (Düşük Boyut)</option>
                      </>
                    ) : (
                      <>
                        <option value="2160p">2160p / 4K (👑 Premium - Ultra HD Görüntü)</option>
                        <option value="1440p">1440p / 2K (👑 Premium - QHD Görüntü)</option>
                        <option value="1080p">1080p (Full HD - Yüksek Kalite)</option>
                        <option value="720p">720p (HD Kalite)</option>
                        <option value="480p">480p (Standart Kalite)</option>
                        <option value="360p">360p (Düşük Çözünürlük)</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              {/* Premium quality reminder banner */}
              {isSelectedPremiumQuality && !isPremiumUser && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-500 text-xs"
                  id="premium-gating-banner"
                >
                  <div className="flex gap-2.5 items-start sm:items-center">
                    <Sparkles className="h-4.5 w-4.5 text-amber-500 shrink-0 animate-bounce" />
                    <div>
                      <span className="font-bold block">Premium Kalite Seçtiniz!</span>
                      <span>Seçtiğiniz kalite ({quality === "320kbps" ? "320kbps MP3" : quality === "1440p" ? "2K MP4" : "4K MP4"}) yalnızca Premium üyelerimiz için geçerlidir.</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenPremium("monthly")}
                    className="shrink-0 rounded-lg bg-amber-500 hover:bg-amber-600 px-3 py-1.5 text-xs font-bold text-neutral-950 transition cursor-pointer self-start sm:self-auto"
                  >
                    👑 Şimdi Premium Al
                  </button>
                </motion.div>
              )}

              {/* Dynamic Preview for valid YouTube link */}
              {thumbnailUrl && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-4 flex gap-4 items-center"
                  id="url-preview-card"
                >
                  <img
                    referrerPolicy="no-referrer"
                    src={thumbnailUrl}
                    alt="Video Önizleme"
                    className="h-16 w-28 object-cover rounded-lg bg-neutral-900 border border-neutral-800 shrink-0"
                    id="preview-img"
                  />
                  <div>
                    <h4 className="text-sm font-semibold text-white line-clamp-1">
                      YouTube Videosu Tespit Edildi
                    </h4>
                    <p className="text-xs text-neutral-500 mt-0.5 font-mono">
                      Video ID: {videoId}
                    </p>
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1 font-medium">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                      Dönüştürmeye Hazır
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Action Submit */}
              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 py-3.5 text-base font-bold text-white shadow-lg shadow-red-950/20 active:scale-[0.99] disabled:opacity-50 transition cursor-pointer"
                id="convert-submit-btn"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-5 w-5 animate-spin" /> Analiz Ediliyor...
                  </>
                ) : (
                  <>
                    Dönüştür ve İndir <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>
            </form>
            )}
          </motion.div>
        )}

        {/* Step 2: Active Processing View */}
        {activeConv && activeConv.status === "processing" && (
          <motion.div
            key="processing-view"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 sm:p-8 text-center"
            id="processing-card"
          >
            <div className="flex justify-center mb-4">
              <div className="relative flex items-center justify-center h-20 w-20 rounded-full bg-red-950/50 border border-red-500/20">
                <RefreshCw className="h-8 w-8 text-red-500 animate-spin" />
                <span className="absolute text-xs font-bold text-white">{activeConv.progress}%</span>
              </div>
            </div>

            <h3 className="text-lg font-bold text-white" id="processing-title">
              Videonuz İşleniyor
            </h3>
            <p className="text-sm text-neutral-400 mt-1 font-medium line-clamp-1 max-w-lg mx-auto">
              "{activeConv.videoTitle}"
            </p>

            {/* Custom Progress bar */}
            <div className="mt-6 max-w-md mx-auto">
              <div className="h-2 w-full rounded-full bg-neutral-950 overflow-hidden border border-neutral-800">
                <motion.div
                  className="h-full bg-red-600 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.5)]"
                  style={{ width: `${activeConv.progress}%` }}
                />
              </div>
            </div>

            {/* Live Terminal Log Mimicking ffmpeg */}
            <div className="mt-6 max-w-lg mx-auto text-left rounded-lg bg-black p-4 border border-neutral-800 font-mono text-xs text-green-500 overflow-hidden shadow-inner" id="terminal-logs">
              <div className="flex items-center gap-1.5 border-b border-neutral-900 pb-2 mb-2 text-neutral-500 text-[10px] tracking-wider uppercase font-bold">
                <Terminal className="h-3.5 w-3.5" /> Konsol Günlükleri (FFmpeg Logs)
              </div>
              <div className="space-y-1" id="terminal-content">
                <div className="text-neutral-500">&gt; yt-dlp --extract-audio --audio-format {activeConv.format} ...</div>
                <div className="text-neutral-400">&gt; Durum: {logMessage}</div>
                <div className="animate-pulse font-bold text-neutral-600">█</div>
              </div>
            </div>

            <div className="mt-6 text-xs text-neutral-500 flex items-center justify-center gap-1.5">
              <Info className="h-4 w-4" />
              Lütfen bu sayfayı kapatmayın veya yenilemeyin.
            </div>
          </motion.div>
        )}

        {/* Step 3: Success Download Ready View */}
        {activeConv && activeConv.status === "completed" && (
          <motion.div
            key="success-view"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 sm:p-8"
            id="success-card"
          >
            <div className="text-center mb-6">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-green-950/60 border border-green-800 p-2.5 text-green-400 mb-3">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-white">Dönüştürme Başarılı!</h3>
              <p className="text-sm text-neutral-400 mt-1">
                Dosyanız sunucuda başarıyla paketlendi ve indirilmeye hazır.
              </p>
            </div>

            {/* Ready details */}
            <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4 sm:p-5 flex flex-col sm:flex-row gap-5 items-center justify-between mb-6">
              <div className="flex gap-4 items-center w-full">
                {thumbnailUrl ? (
                  <img
                    referrerPolicy="no-referrer"
                    src={thumbnailUrl}
                    alt="Video Resmi"
                    className="h-16 w-28 object-cover rounded-lg bg-neutral-900 border border-neutral-800 shrink-0"
                    id="success-img-preview"
                  />
                ) : (
                  <div className="h-16 w-28 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center text-red-500 shrink-0">
                    {activeConv.format === "mp3" ? <Music className="h-8 w-8" /> : <Video className="h-8 w-8" />}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-bold text-white line-clamp-2 leading-snug">
                    {activeConv.videoTitle}
                  </h4>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="rounded bg-red-950/60 border border-red-800 px-2 py-0.5 text-[10px] font-bold text-red-400 uppercase">
                      {activeConv.format}
                    </span>
                    <span className="rounded bg-neutral-900 border border-neutral-800 px-2 py-0.5 text-[10px] font-semibold text-neutral-400">
                      Kalite: {activeConv.quality}
                    </span>
                    <span className="rounded bg-neutral-900 border border-neutral-800 px-2 py-0.5 text-[10px] font-semibold text-neutral-400">
                      Boyut: {activeConv.fileSize}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <a
                href={activeConv.downloadUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 rounded-xl bg-green-600 hover:bg-green-700 py-3.5 text-base font-bold text-white shadow-lg shadow-green-950/20 active:scale-[0.99] transition cursor-pointer"
                id="direct-download-anchor"
              >
                <Download className="h-5 w-5" /> Dosyayı İndir
              </a>
              <button
                onClick={resetConverter}
                className="flex items-center justify-center gap-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 py-3.5 text-base font-bold text-neutral-200 border border-neutral-700 active:scale-[0.99] transition cursor-pointer"
                id="convert-new-btn"
              >
                <RefreshCw className="h-4 w-4" /> Yeni Dönüştürme
              </button>
            </div>

            {/* QR Code to Phone Feature (Premium Exclusive) */}
            <div className="mt-6 pt-6 border-t border-neutral-800" id="qr-phone-panel">
              <div className="flex items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5 text-red-500" />
                  <h4 className="text-sm font-bold text-white">📱 Telefona QR Kod ile Gönder</h4>
                </div>
                <span className="rounded-full bg-red-500/10 border border-red-500/30 px-2.5 py-0.5 text-[10px] font-bold text-red-500 tracking-wide">
                  👑 PREMIUM
                </span>
              </div>

              {isPremiumUser ? (
                <div className="flex flex-col md:flex-row items-center gap-5 bg-neutral-950/40 p-4 rounded-xl border border-neutral-800/60">
                  <div className="bg-white p-2 rounded-xl shrink-0 shadow-lg border border-neutral-200 flex items-center justify-center">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&color=220-38-38&data=${encodeURIComponent(window.location.origin + activeConv.downloadUrl)}`}
                      alt="Dönüştürme QR Kodu"
                      className="h-28 w-28 object-contain"
                      id="download-qr-code-img"
                    />
                  </div>
                  <div className="text-left space-y-2 flex-1">
                    <p className="text-xs text-neutral-300 font-medium leading-relaxed">
                      Dosyayı cep telefonunuza anında indirmek için yukarıdaki QR kodu telefonunuzun kamerası veya bir QR okuyucu uygulaması ile taratın.
                    </p>
                    <p className="text-[11px] text-neutral-500 font-mono break-all bg-neutral-950 p-2 rounded border border-neutral-900">
                      Bağlantı: <span className="text-red-400 select-all font-semibold">{window.location.origin + activeConv.downloadUrl}</span>
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(window.location.origin + activeConv.downloadUrl);
                          if (soundEffectsEnabled) audioSynth.playClick();
                          alert("İndirme bağlantısı panoya kopyalandı!");
                        }}
                        className="rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 px-3 py-1.5 text-[11px] font-bold text-neutral-300 transition cursor-pointer"
                      >
                        Bağlantıyı Kopyala 📋
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative overflow-hidden rounded-xl bg-neutral-950/40 p-4 border border-neutral-800/60 flex flex-col md:flex-row items-center gap-5">
                  {/* Blurred mock QR Code representing the locked feature */}
                  <div className="relative shrink-0 flex items-center justify-center p-2 bg-neutral-900/50 rounded-xl select-none filter blur-[4px] opacity-30">
                    <div className="h-28 w-28 bg-neutral-800 border border-neutral-700 rounded-lg flex flex-col items-center justify-center text-[10px] text-neutral-500 font-bold uppercase tracking-wider">
                      QR Code
                    </div>
                  </div>

                  {/* Absolute lock overlay in center on mobile, or adjacent text */}
                  <div className="text-left flex-1 space-y-2.5 z-10">
                    <h5 className="text-xs font-bold text-amber-500 flex items-center gap-1.5">
                      <Lock className="h-4 w-4 shrink-0" /> Telefona Kolay Aktarım Kilitli
                    </h5>
                    <p className="text-xs text-neutral-400 leading-relaxed">
                      Kablolarla veya dosya transfer servisleriyle uğraşmaya son! Dönüştürülen tüm dosyalarınızı tek tıkla QR kod oluşturup doğrudan telefonunuza indirin.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        if (soundEffectsEnabled && isPremiumUser) audioSynth.playClick();
                        else audioSynth.playClick(); // play standard click
                        onOpenPremium("monthly");
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 px-3.5 py-1.5 text-xs font-bold text-neutral-950 transition cursor-pointer shadow-md shadow-amber-500/10"
                    >
                      👑 Premium ile QR Kod Kilidini Aç
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Premium Smart Sound Effects Console */}
      <div className="mt-8 rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5 backdrop-blur-md relative overflow-hidden" id="premium-sfx-console">
        {/* Decorative background glow for Premium, or a dark locked mask for non-premium */}
        {isPremiumUser ? (
          <div className="absolute -right-10 -bottom-10 h-32 w-32 rounded-full bg-red-500/5 blur-2xl pointer-events-none" />
        ) : (
          <div className="absolute top-0 right-0 bg-red-600/10 text-red-500 text-[9px] font-bold px-2.5 py-0.5 rounded-bl-lg uppercase tracking-wider border-l border-b border-neutral-800">
            🔒 PREMİUM ÖZEL
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1 text-left">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <Sparkles className={`h-4 w-4 ${isPremiumUser ? "text-amber-400 animate-pulse" : "text-neutral-500"}`} />
              👑 Akıllı Ses Efektleri & Özelleştirme <span className="text-[10px] font-mono text-neutral-400 bg-neutral-950 px-1.5 py-0.5 rounded border border-neutral-800">v1.5</span>
            </h3>
            <p className="text-xs text-neutral-400">
              Dönüşüm işlemlerine ve arayüz etkileşimlerine fütüristik ses efektleri ekleyin.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-auto">
            {/* Enable Toggle (only interactive for Premium users) */}
            <button
              type="button"
              disabled={!isPremiumUser}
              onClick={() => {
                const newState = !soundEffectsEnabled;
                setSoundEffectsEnabled(newState);
                audioSynth.playClick();
              }}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer select-none ${
                !isPremiumUser
                  ? "bg-neutral-950 text-neutral-600 border border-neutral-800/60 cursor-not-allowed"
                  : soundEffectsEnabled
                  ? "bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-950/20"
                  : "bg-neutral-800 hover:bg-neutral-750 text-neutral-300"
              }`}
            >
              {soundEffectsEnabled ? (
                <>
                  <Volume2 className="h-3.5 w-3.5" /> Sesler Açık
                </>
              ) : (
                <>
                  <VolumeX className="h-3.5 w-3.5" /> Sesler Kapalı
                </>
              )}
            </button>
          </div>
        </div>

        {/* Console Interactive Controls */}
        <div className="mt-4 pt-4 border-t border-neutral-800/60 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Volume Control */}
          <div className={`space-y-1.5 text-left ${!isPremiumUser ? "opacity-50 pointer-events-none" : ""}`}>
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Ses Seviyesi</span>
            <div className="flex items-center gap-3">
              <VolumeX className="h-3.5 w-3.5 text-neutral-500" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                disabled={!isPremiumUser || !soundEffectsEnabled}
                value={sfxVolume}
                onChange={(e) => setSfxVolume(parseFloat(e.target.value))}
                className="w-full h-1 bg-neutral-950 rounded-lg appearance-none cursor-pointer accent-red-600 disabled:opacity-30 disabled:cursor-not-allowed"
              />
              <Volume2 className="h-3.5 w-3.5 text-neutral-300" />
              <span className="text-[10px] font-mono font-bold text-neutral-400 w-8 text-right">
                {Math.round(sfxVolume * 100)}%
              </span>
            </div>

            {/* Quick Demo triggers */}
            <div className="pt-3">
              <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider block mb-2">Sistem Seslerini Test Et</span>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    audioSynth.playStart();
                  }}
                  className="rounded-lg bg-neutral-950 hover:bg-neutral-900 border border-neutral-800 py-1.5 text-[10px] font-bold text-neutral-300 transition cursor-pointer hover:text-white"
                  title="Dönüşüm Başlatma Sesi"
                >
                  ▶ Başlat Sesi
                </button>
                <button
                  type="button"
                  onClick={() => {
                    audioSynth.playError();
                  }}
                  className="rounded-lg bg-neutral-950 hover:bg-neutral-900 border border-neutral-800 py-1.5 text-[10px] font-bold text-neutral-300 transition cursor-pointer hover:text-white"
                  title="Hata Uyarı Sesi"
                >
                  ⚠️ Hata Sesi
                </button>
                <button
                  type="button"
                  onClick={() => {
                    audioSynth.playClick();
                  }}
                  className="rounded-lg bg-neutral-950 hover:bg-neutral-900 border border-neutral-800 py-1.5 text-[10px] font-bold text-neutral-300 transition cursor-pointer hover:text-white"
                  title="Arayüz Tık Tınısı"
                >
                  🔘 Tık Tınısı
                </button>
              </div>
            </div>
          </div>

          {/* Premium Success Sound Theme Selector */}
          <div className="space-y-2 text-left">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                Tamamlanma Ses Teması
              </span>
              {!isPremiumUser && (
                <span className="text-amber-500 font-bold text-[9px] bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                  👑 Premium Özel
                </span>
              )}
            </div>

            <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
              {[
                { id: "crystalline", name: "Kristal Melodi 💎", desc: "Klasik, pürüzsüz ve yükselen fütüristik majör arpej tınısı." },
                { id: "retro", name: "8-Bit Nostalji 🎮", desc: "Nostaljik atari tınılarıyla süslenmiş hızlı ve eğlenceli bitiş melodisi." },
                { id: "cyber_rise", name: "Siber Yükseliş ⚡", desc: "Göz alıcı lazer tınıları, sub bass ve tiz çınlamanın kusursuz birleşimi." },
                { id: "cosmic", name: "Kozmik Dalga 🪐", desc: "Derin uzay ve ortam filtresiyle oluşturulan lüks ve akıcı ses dalgası." }
              ].map((styleOpt) => {
                const isSelected = selectedSfxStyle === styleOpt.id;
                return (
                  <div
                    key={styleOpt.id}
                    className={`p-2.5 rounded-xl border transition flex items-center justify-between gap-3 ${
                      isSelected && isPremiumUser
                        ? "bg-red-950/20 border-red-500/40 animate-pulse"
                        : "bg-neutral-950/50 border-neutral-850 hover:border-neutral-800"
                    }`}
                  >
                    <div className="space-y-0.5 text-left">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white">{styleOpt.name}</span>
                        {isSelected && isPremiumUser && (
                          <span className="rounded bg-red-500/15 border border-red-500/35 px-1.5 py-0.5 text-[8px] font-bold text-red-500 uppercase tracking-wider">
                            Aktif
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-neutral-400 leading-normal">{styleOpt.desc}</p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Play Preview Button (Available to all users so they can hear it!) */}
                      <button
                        type="button"
                        onClick={() => {
                          audioSynth.playSuccess(styleOpt.id);
                        }}
                        className="rounded-lg bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 px-2 py-1 text-[9px] font-extrabold text-neutral-300 hover:text-white transition cursor-pointer"
                        title="Sesi Önizle"
                      >
                        🔊 Dinle
                      </button>

                      {/* Select Button */}
                      {isPremiumUser ? (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedSfxStyle(styleOpt.id);
                            audioSynth.playClick();
                          }}
                          className={`rounded-lg px-2.5 py-1 text-[9px] font-black transition cursor-pointer ${
                            isSelected
                              ? "bg-red-600 text-white shadow-md shadow-red-950/50"
                              : "bg-neutral-800 hover:bg-neutral-700 text-neutral-200"
                          }`}
                        >
                          Seç
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onOpenPremium("monthly")}
                          className="rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-500 hover:bg-amber-500 hover:text-neutral-950 px-2.5 py-1 text-[9px] font-black transition cursor-pointer flex items-center gap-0.5"
                          title="Kilidi Aç"
                        >
                          🔒 Seç
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Lock Overlay Banner for Non-Premium Users */}
        {!isPremiumUser && (
          <div className="mt-4 p-3 rounded-xl bg-amber-500/5 border border-amber-500/25 flex items-center justify-between gap-3 text-left animate-fade-in">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider block">🔒 PREMIUM SES ENTEGRASYONU</span>
              <p className="text-[10px] text-neutral-400">
                Fütüristik tınılardan dilediğinizi seçerek mp3 indirme deneyimini zirveye taşıyın. Ücretsiz olarak sesleri yukarıdan test edebilirsiniz!
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpenPremium("monthly")}
              className="shrink-0 rounded-lg bg-amber-500 hover:bg-amber-600 px-3 py-1.5 text-[10px] font-black text-neutral-950 transition cursor-pointer uppercase"
            >
              👑 Kilidi Kaldır
            </button>
          </div>
        )}
      </div>

      {/* Security note / Info Banner */}
      <div className="mt-8 rounded-xl border border-neutral-800 bg-neutral-950/40 p-4 text-xs text-neutral-500 leading-relaxed flex gap-2.5 items-start">
        <Info className="h-4 w-4 text-neutral-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-neutral-400 block mb-1">Dönüştürücü Hakkında Bilgi</span>
          Dönüştürücümüz en yüksek kalitede ses ve video dönüştürme sunar. Üye girişi yaparak indirme geçmişinizi kaydedebilir, tüm cihazlarınızda indirdiklerinize tekrar erişebilirsiniz. Kayıt olmak tamamen ücretsizdir!
        </div>
      </div>
    </div>
  );
}
