import React, { useState, useEffect } from "react";
import { 
  Award, Zap, Trophy, Shield, Calendar, Mail, 
  Sparkles, Camera, Check, AlertCircle, Clock, CheckCircle, 
  TrendingUp, Users, Heart, Crown, ChevronRight, HelpCircle
} from "lucide-react";
import { User } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { audioSynth } from "../lib/audio";

interface UserProfileProps {
  currentUser: User | null;
  token: string | null;
  conversionsCount: number;
  onUpdateUser: (updatedUser: User) => void;
  onOpenPremium: () => void;
  onOpenAuth: () => void;
  activeSubTab?: "overview" | "edit" | "premium";
}

const PRESET_AVATARS = [
  "🎧", "🚀", "👾", "🔥", "👑", "🦊", 
  "😎", "🎵", "🧙‍♂️", "🐼", "🦁", "🐱", 
  "🌟", "⚡", "🎸", "🍕", "🎮", "🛸",
  "👾", "💎", "🦖", "🍩", "🥊", "🎷"
];

// Fun Levels structure based on download count
const getLevelInfo = (downloads: number) => {
  const xpPerDownload = 15;
  const currentXp = downloads * xpPerDownload;
  
  // Levels are every 100 XP
  const level = Math.floor(currentXp / 100) + 1;
  const nextLevelXp = level * 100;
  const prevLevelXp = (level - 1) * 100;
  const levelProgress = ((currentXp - prevLevelXp) / (nextLevelXp - prevLevelXp)) * 100;
  
  let title = "Yeni Dinleyici";
  let color = "text-neutral-400";
  let bg = "bg-neutral-900/50";
  let desc = "Ses dünyasına yeni adım attın. İlk adımlar!";
  
  if (level >= 15) {
    title = "MP3 İmparatoru 👑";
    color = "text-red-500";
    bg = "bg-red-500/10 border-red-500/30";
    desc = "Durdurulamaz bir arşivci ve ses kütüphanesinin tek hakimi!";
  } else if (level >= 10) {
    title = "Ses Koleksiyoncusu 💎";
    color = "text-amber-500";
    bg = "bg-amber-500/10 border-amber-500/30";
    desc = "Devasa bir müzik kütüphanesine ve yüksek müzik kulağına sahipsin!";
  } else if (level >= 6) {
    title = "Melodi Meraklısı 🎵";
    color = "text-cyan-400";
    bg = "bg-cyan-500/10 border-cyan-500/20";
    desc = "Ritimleri takip etmeyi seviyor ve her gün yeni parçalar keşfediyorsun.";
  } else if (level >= 3) {
    title = "Ritim Takipçisi 🎧";
    color = "text-emerald-400";
    bg = "bg-emerald-500/10 border-emerald-500/20";
    desc = "Dönüştürme hızın harika! Müzik listeni genişletmeye başladın.";
  }

  return { level, title, currentXp, nextLevelXp, levelProgress, color, bg, desc };
};

export function UserProfile({
  currentUser,
  token,
  conversionsCount = 0,
  onUpdateUser,
  onOpenPremium,
  onOpenAuth,
  activeSubTab = "overview"
}: UserProfileProps) {
  const [subTab, setSubTab] = useState<"overview" | "edit" | "premium">(activeSubTab);
  
  // Editing states
  const [editName, setEditName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState("");
  const [customUrl, setCustomUrl] = useState("");
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const isCreator = currentUser?.email.toLowerCase() === "tumayisildak700@gmail.com";
  const isPremium = currentUser?.isPremium || currentUser?.role === "admin";
  
  const levelInfo = getLevelInfo(conversionsCount);

  // Initialize form when user details change
  useEffect(() => {
    if (currentUser) {
      setEditName(currentUser.name || "");
      setEditUsername(currentUser.username || "");
      setSelectedAvatar(currentUser.avatar || "");
      const isUrl = currentUser.avatar && (
        currentUser.avatar.startsWith("http://") || 
        currentUser.avatar.startsWith("https://") || 
        currentUser.avatar.startsWith("/")
      );
      setCustomUrl(isUrl ? currentUser.avatar : "");
      setErrorMsg("");
      setSuccessMsg("");
    }
  }, [currentUser, subTab]);

  if (!currentUser) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center max-w-md mx-auto" id="profile-unauth-container">
        <div className="h-16 w-16 bg-neutral-900 border border-neutral-850 rounded-2xl flex items-center justify-center mb-6 shadow-xl">
          <Crown className="h-8 w-8 text-neutral-500" />
        </div>
        <h2 className="text-2xl font-black text-white mb-2 tracking-tight">Profilini Görüntüle</h2>
        <p className="text-sm text-neutral-400 mb-6 leading-relaxed">
          Sıralamalarda yer almak, özel kullanıcı adı belirlemek ve kişiselleştirilmiş istatistiklerini takip etmek için hemen giriş yap veya kayıt ol.
        </p>
        <button
          onClick={() => {
            onOpenAuth();
            audioSynth.playClick();
          }}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-red-950/20 transition cursor-pointer"
        >
          Giriş Yap / Üye Ol
        </button>
      </div>
    );
  }

  const handleSaveProfile = async () => {
    setUpdatingProfile(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const avatarValue = customUrl.trim() || selectedAvatar;
      const response = await fetch("/api/auth/update-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          avatar: avatarValue, 
          name: editName, 
          username: editUsername 
        }),
      });

      const data = await response.json();
      if (response.ok) {
        onUpdateUser(data);
        setSuccessMsg("Profiliniz başarıyla güncellendi!");
        audioSynth.playSuccess("crystalline");
        // Clear success msg after 4s
        setTimeout(() => setSuccessMsg(""), 4000);
      } else {
        setErrorMsg(data.error || "Profil güncellenirken bir sorun oluştu.");
      }
    } catch (e) {
      setErrorMsg("Sunucu bağlantısı sırasında bir hata meydana geldi.");
    } finally {
      setUpdatingProfile(false);
    }
  };

  // Cooldown countdown details for changing username
  const getCooldownDetails = () => {
    if (!currentUser.lastUsernameUpdateAt) return null;
    const lastUpdate = new Date(currentUser.lastUsernameUpdateAt).getTime();
    const cooldownPeriod = 7 * 24 * 60 * 60 * 1000; // 7 days
    const nextChangeAllowed = lastUpdate + cooldownPeriod;
    const now = Date.now();
    
    if (now >= nextChangeAllowed) return null;
    
    const remainingMs = nextChangeAllowed - now;
    const remainingDays = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
    return {
      days: remainingDays,
      percent: Math.min(100, (remainingMs / cooldownPeriod) * 100)
    };
  };

  const cooldown = getCooldownDetails();

  const renderAvatarPreview = () => {
    const isUrl = customUrl && (customUrl.startsWith("http") || customUrl.startsWith("/"));
    return (
      <div className={`relative flex h-24 w-24 items-center justify-center rounded-2xl font-black border-2 overflow-hidden shadow-2xl shrink-0 ${
        isPremium ? "border-amber-500 bg-amber-950/20 text-amber-400" : "border-neutral-800 bg-neutral-900 text-red-500 text-3xl"
      }`}>
        {isUrl ? (
          <img 
            src={customUrl} 
            alt="Profil" 
            className="h-full w-full object-cover" 
            onError={() => setErrorMsg("Girdiğiniz görsel linki geçerli bir resim yüklemedi.")}
            referrerPolicy="no-referrer" 
          />
        ) : selectedAvatar ? (
          <span className="text-4xl select-none leading-none">{selectedAvatar}</span>
        ) : (
          <span className="text-3xl font-extrabold">{editName ? editName.charAt(0).toUpperCase() : currentUser.name.charAt(0).toUpperCase()}</span>
        )}
      </div>
    );
  };

  return (
    <div className="w-full bg-neutral-950 rounded-3xl border border-neutral-900 p-6 md:p-8 relative overflow-hidden text-left shadow-2xl" id="profile-dashboard-panel">
      {/* Visual background flares */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-red-600/5 rounded-full blur-[100px] pointer-events-none" />
      {isPremium && (
        <div className="absolute -left-10 -bottom-10 w-96 h-96 bg-amber-500/5 rounded-full blur-[120px] pointer-events-none" />
      )}

      {/* Profile Header Block */}
      <div className="flex flex-col md:flex-row items-center md:items-start gap-6 pb-6 border-b border-neutral-900 relative z-10">
        {/* Large Avatar Visual */}
        <div className="relative group">
          <div className={`flex h-20 w-20 items-center justify-center rounded-2xl font-black text-2xl border-2 overflow-hidden shadow-xl ${
            isPremium ? "border-amber-500 bg-amber-950/20 text-amber-400" : "border-neutral-800 bg-neutral-900 text-red-500"
          }`}>
            {currentUser.avatar && (currentUser.avatar.startsWith("http") || currentUser.avatar.startsWith("/")) ? (
              <img 
                src={currentUser.avatar} 
                alt={currentUser.name} 
                className="h-full w-full object-cover" 
                referrerPolicy="no-referrer"
              />
            ) : currentUser.avatar ? (
              <span className="text-3xl select-none leading-none">{currentUser.avatar}</span>
            ) : (
              <span>{currentUser.name.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <button
            onClick={() => {
              setSubTab("edit");
              audioSynth.playClick();
            }}
            className="absolute -bottom-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800 transition shadow-md cursor-pointer"
            title="Görseli Düzenle"
          >
            <Camera className="h-3 w-3" />
          </button>
        </div>

        {/* Name and Basic badges */}
        <div className="text-center md:text-left flex-1 space-y-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-center md:justify-start">
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center justify-center md:justify-start gap-1.5">
              {currentUser.name}
              {currentUser.badge === "altin" ? "🥇" : currentUser.badge === "gumus" ? "🥈" : currentUser.badge === "bronz" ? "🥉" : ""}
              {isCreator && <Trophy className="h-4.5 w-4.5 text-amber-500 fill-amber-500/10 shrink-0" />}
            </h1>
            <div className="flex items-center gap-1.5 justify-center">
              {isCreator ? (
                <span className="flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-500">
                  <Award className="h-3 w-3 fill-amber-500" /> Kurucu
                </span>
              ) : isPremium ? (
                <span className="flex items-center gap-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 text-[10px] font-black text-amber-500 animate-pulse">
                  👑 Premium
                </span>
              ) : currentUser.role === "admin" ? (
                <span className="rounded-full bg-red-500/10 border border-red-500/30 px-2.5 py-0.5 text-[10px] font-bold text-red-500">
                  Yönetici
                </span>
              ) : (
                <span className="rounded-full bg-neutral-900 border border-neutral-800 px-2.5 py-0.5 text-[10px] font-semibold text-neutral-400">
                  Üye
                </span>
              )}
            </div>
          </div>

          {currentUser.username && (
            <p className="text-sm font-bold text-amber-500">@{currentUser.username}</p>
          )}

          <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-1.5 text-xs text-neutral-400 pt-1 font-medium">
            <span className="flex items-center gap-1">
              <Mail className="h-3.5 w-3.5 text-neutral-500" /> {currentUser.email}
            </span>
            <span className="hidden sm:inline text-neutral-700">•</span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-neutral-500" /> Katılım: {new Date(currentUser.createdAt || "2026-01-01").toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}
            </span>
          </div>
        </div>

        {/* Upgrade Call to action */}
        {!isPremium && (
          <button
            onClick={() => {
              onOpenPremium();
              audioSynth.playClick();
            }}
            className="mt-2 md:mt-0 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 font-black text-xs text-neutral-950 transition cursor-pointer flex items-center gap-1.5 shadow-xl shadow-amber-950/20 hover:scale-102"
          >
            <Sparkles className="h-4 w-4 fill-neutral-950" />
            Sınırsız Premium'a Geç
          </button>
        )}
      </div>

      {/* Horizontal Dashboard Navigation Tabs */}
      <div className="flex items-center border-b border-neutral-900 overflow-x-auto scrollbar-none py-1 relative z-10">
        <button
          onClick={() => {
            setSubTab("overview");
            audioSynth.playClick();
          }}
          className={`px-4 py-3 text-xs sm:text-sm font-bold transition-all relative cursor-pointer ${
            subTab === "overview" ? "text-white" : "text-neutral-500 hover:text-neutral-300"
          }`}
        >
          Genel Bakış & İstatistik
          {subTab === "overview" && (
            <motion.div layoutId="subtab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600" />
          )}
        </button>

        <button
          onClick={() => {
            setSubTab("edit");
            audioSynth.playClick();
          }}
          className={`px-4 py-3 text-xs sm:text-sm font-bold transition-all relative cursor-pointer ${
            subTab === "edit" ? "text-white" : "text-neutral-500 hover:text-neutral-300"
          }`}
        >
          Profil Bilgilerini Düzenle
          {subTab === "edit" && (
            <motion.div layoutId="subtab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600" />
          )}
        </button>

        <button
          onClick={() => {
            setSubTab("premium");
            audioSynth.playClick();
          }}
          className={`px-4 py-3 text-xs sm:text-sm font-bold transition-all relative cursor-pointer ${
            subTab === "premium" ? "text-white" : "text-neutral-500 hover:text-neutral-300"
          }`}
        >
          Hesap & Abonelik Plânları
          {subTab === "premium" && (
            <motion.div layoutId="subtab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600" />
          )}
        </button>
      </div>

      {/* Subtab Content Panels */}
      <div className="py-6 relative z-10" id="profile-subtab-panel-container">
        <AnimatePresence mode="wait">
          {subTab === "overview" && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="space-y-6"
            >
              {/* Stat Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-neutral-900/40 border border-neutral-850 p-4 rounded-2xl">
                  <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">Toplam Dönüşüm</span>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className="text-3xl font-black font-mono text-white">{conversionsCount}</span>
                    <span className="text-sm font-bold text-neutral-500 font-sans">MP3 Dosyası</span>
                  </div>
                  <p className="text-[10px] text-neutral-400 mt-1.5">Şu ana kadar dönüştürdüğün toplam YouTube videosu.</p>
                </div>

                <div className="bg-neutral-900/40 border border-neutral-850 p-4 rounded-2xl">
                  <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">Kazanılan Süre</span>
                  <div className="flex items-baseline gap-0.5 mt-2">
                    <span className="text-3xl font-black font-mono text-emerald-400">
                      {isPremium ? (conversionsCount * 1.5).toFixed(1) : (conversionsCount * 0.3).toFixed(1)}
                    </span>
                    <span className="text-sm font-bold text-neutral-500 font-sans">Dakika</span>
                  </div>
                  <p className="text-[10px] text-neutral-400 mt-1.5">Sunucuda beklemeden doğrudan elde ettiğin zaman kazancı.</p>
                </div>

                <div className="bg-neutral-900/40 border border-neutral-850 p-4 rounded-2xl">
                  <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">Sıralama Lig Derecesi</span>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-xl font-black ${
                      currentUser.badge === "altin" ? "text-amber-500" : currentUser.badge === "gumus" ? "text-neutral-400" : currentUser.badge === "bronz" ? "text-amber-700" : "text-neutral-400"
                    }`}>
                      {currentUser.badge === "altin" ? "Altın Lig" : currentUser.badge === "gumus" ? "Gümüş Lig" : currentUser.badge === "bronz" ? "Bronz Lig" : "Lig Dışı"}
                    </span>
                    <span className="text-xl">{currentUser.badge === "altin" ? "🥇" : currentUser.badge === "gumus" ? "🥈" : currentUser.badge === "bronz" ? "🥉" : "⚔️"}</span>
                  </div>
                  <p className="text-[10px] text-neutral-400 mt-1.5">Sıralama tablosundaki diğer üyelere göre performans dereceniz.</p>
                </div>
              </div>

              {/* Progress Level Section */}
              <div className="bg-neutral-900/30 border border-neutral-850 p-5 rounded-2xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-left">
                  <div>
                    <span className="text-[10px] font-extrabold text-neutral-500 uppercase tracking-wider block">Kullanıcı Seviyesi</span>
                    <h3 className="text-lg font-black text-white mt-1 flex items-center gap-2">
                      <span>Seviye {levelInfo.level}</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded border ${levelInfo.color} ${levelInfo.bg}`}>
                        {levelInfo.title}
                      </span>
                    </h3>
                  </div>
                  <div className="text-left sm:text-right font-mono">
                    <span className="text-sm font-black text-white">{levelInfo.currentXp}</span>
                    <span className="text-xs text-neutral-500"> / {levelInfo.nextLevelXp} XP</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="w-full bg-neutral-900 rounded-full h-2.5 overflow-hidden border border-neutral-800">
                    <div 
                      className="bg-gradient-to-r from-red-600 to-amber-500 h-full rounded-full transition-all duration-500" 
                      style={{ width: `${levelInfo.levelProgress}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-neutral-500 font-semibold">
                    <span>Mevcut Seviye XP</span>
                    <span>Seviye Atlamak İçin %{Math.round(levelInfo.levelProgress)} Tamamlandı</span>
                  </div>
                </div>

                <div className="p-3 bg-neutral-950/40 rounded-xl border border-neutral-900 flex items-start gap-2.5 text-xs text-neutral-400 leading-normal">
                  <TrendingUp className="h-4.5 w-4.5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-white block mb-0.5">Mevcut Seviye Durumu:</span>
                    {levelInfo.desc} Her YouTube ses indirme işlemi profilinize **15 XP** kazandırır.
                  </div>
                </div>
              </div>

              {/* Badges / Achievements Shelf */}
              <div className="space-y-3 text-left">
                <h3 className="text-sm font-extrabold text-white">Rozetler ve Başarımlar</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-start gap-3 bg-neutral-900/20 border border-neutral-850 p-3.5 rounded-2xl">
                    <div className="h-10 w-10 rounded-xl bg-neutral-900 flex items-center justify-center shrink-0 border border-neutral-800 text-xl shadow-lg">
                      🥇
                    </div>
                    <div>
                      <span className="text-xs font-black text-white flex items-center gap-1.5">
                        Sıralama Lideri
                        {currentUser.badge === "altin" && <CheckCircle className="h-3.5 w-3.5 text-emerald-400 fill-emerald-400/10 shrink-0" />}
                      </span>
                      <p className="text-[10px] text-neutral-400 mt-0.5">En yüksek indirme hacmiyle Altın Lige yerleşerek bu şampiyon rozetini al.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 bg-neutral-900/20 border border-neutral-850 p-3.5 rounded-2xl">
                    <div className="h-10 w-10 rounded-xl bg-neutral-900 flex items-center justify-center shrink-0 border border-neutral-800 text-xl shadow-lg">
                      👑
                    </div>
                    <div>
                      <span className="text-xs font-black text-white flex items-center gap-1.5">
                        Yüksek Elit Ayrıcalığı
                        {isPremium && <CheckCircle className="h-3.5 w-3.5 text-emerald-400 fill-emerald-400/10 shrink-0" />}
                      </span>
                      <p className="text-[10px] text-neutral-400 mt-0.5">Premium plana sahip olan veya kurucu ekibinde olan elit üyelere verilir.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 bg-neutral-900/20 border border-neutral-850 p-3.5 rounded-2xl">
                    <div className="h-10 w-10 rounded-xl bg-neutral-900 flex items-center justify-center shrink-0 border border-neutral-800 text-xl shadow-lg">
                      ⚡
                    </div>
                    <div>
                      <span className="text-xs font-black text-white flex items-center gap-1.5">
                        Ritim Canavarı
                        {conversionsCount >= 5 && <CheckCircle className="h-3.5 w-3.5 text-emerald-400 fill-emerald-400/10 shrink-0" />}
                      </span>
                      <p className="text-[10px] text-neutral-400 mt-0.5">Bugüne kadar en az 5 adet YouTube videosunu başarıyla MP3'e dönüştür.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 bg-neutral-900/20 border border-neutral-850 p-3.5 rounded-2xl">
                    <div className="h-10 w-10 rounded-xl bg-neutral-900 flex items-center justify-center shrink-0 border border-neutral-800 text-xl shadow-lg">
                      🦊
                    </div>
                    <div>
                      <span className="text-xs font-black text-white flex items-center gap-1.5">
                        Sosyal Kelebek
                        {currentUser.username && <CheckCircle className="h-3.5 w-3.5 text-emerald-400 fill-emerald-400/10 shrink-0" />}
                      </span>
                      <p className="text-[10px] text-neutral-400 mt-0.5">Kendine özgü bir kullanıcı adı oluşturarak diğer insanlarla arkadaşlık kurmaya başla.</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {subTab === "edit" && (
            <motion.div
              key="edit"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="space-y-6"
            >
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Form fields */}
                <div className="flex-1 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-neutral-400 block uppercase tracking-wider">Profil Görünüm Adı</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => {
                        setEditName(e.target.value);
                        setErrorMsg("");
                      }}
                      placeholder="Profil adınız"
                      className="w-full rounded-xl bg-neutral-900 border border-neutral-800 px-3.5 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-red-500/50"
                    />
                    <span className="text-[10px] text-neutral-500 block leading-tight">Sitede, sosyal alanda ve arkadaş listelerinde görünecek ana adınız.</span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-neutral-400 block uppercase tracking-wider">Özgün Kullanıcı Adı (@)</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-neutral-500">@</span>
                      <input
                        type="text"
                        value={editUsername}
                        onChange={(e) => {
                          setEditUsername(e.target.value);
                          setErrorMsg("");
                        }}
                        disabled={!!cooldown}
                        placeholder="kullanici_adi"
                        className="w-full rounded-xl bg-neutral-900 border border-neutral-800 pl-8 pr-3.5 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-red-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </div>
                    {cooldown ? (
                      <div className="p-3 rounded-xl bg-amber-950/15 border border-amber-500/10 flex items-start gap-2.5 text-[10px] text-amber-500 mt-1.5 leading-normal">
                        <Clock className="h-4 w-4 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold block">Ad Değişikliği Kısıtlaması</span>
                          Kullanıcı adınızı yakın zamanda güncellediniz. Tekrar değiştirebilmek için **{cooldown.days} gün** daha beklemelisiniz.
                        </div>
                      </div>
                    ) : (
                      <span className="text-[10px] text-neutral-500 block leading-tight">Yalnızca harfler, rakamlar ve alt çizgi içerebilir. Diğer kullanıcılar sizi bu isimle ekleyebilir.</span>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-neutral-400 block uppercase tracking-wider">Kendi Profil Fotoğrafı Linki (URL)</label>
                    <input
                      type="url"
                      value={customUrl}
                      onChange={(e) => {
                        setCustomUrl(e.target.value);
                        setSelectedAvatar("");
                        setErrorMsg("");
                      }}
                      placeholder="https://site.com/gorsel.jpg"
                      className="w-full rounded-xl bg-neutral-900 border border-neutral-800 px-3.5 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-red-500/50"
                    />
                    <span className="text-[10px] text-neutral-500 block leading-tight">İnternette yer alan herhangi bir resim linkini yapıştırabilirsiniz.</span>
                  </div>

                  {/* Clear / Reset option */}
                  {(selectedAvatar || customUrl) && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedAvatar("");
                        setCustomUrl("");
                        setErrorMsg("");
                        audioSynth.playClick();
                      }}
                      className="text-xs text-red-400 hover:text-red-300 transition flex items-center gap-1 cursor-pointer font-bold pt-1"
                    >
                      Varsayılan Baş Harfe Geri Dön
                    </button>
                  )}
                </div>

                {/* Live Preview and Preset Grids */}
                <div className="w-full lg:w-72 bg-neutral-900/30 border border-neutral-850 p-5 rounded-2xl flex flex-col justify-between space-y-4">
                  <div className="space-y-2.5 text-center">
                    <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block text-left">Görünüm Önizlemesi</span>
                    <div className="flex items-center gap-4 bg-neutral-950/40 p-3 rounded-xl border border-neutral-900 text-left">
                      {renderAvatarPreview()}
                      <div className="min-w-0 flex-1">
                        <span className="text-sm font-black text-white block truncate">
                          {editName || currentUser.name}
                        </span>
                        {editUsername && (
                          <span className="text-xs text-amber-500 font-bold block truncate">
                            @{editUsername}
                          </span>
                        )}
                        <span className="text-[10px] text-neutral-500 block mt-0.5">Seviye {levelInfo.level} {levelInfo.title.split(" ")[0]}</span>
                      </div>
                    </div>
                  </div>

                  {/* Emojis Grid */}
                  <div className="space-y-2 text-left">
                    <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">Emoji Seç</span>
                    <div className="grid grid-cols-6 gap-1.5">
                      {PRESET_AVATARS.map((emoji) => {
                        const isSelected = selectedAvatar === emoji && !customUrl;
                        return (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => {
                              setSelectedAvatar(emoji);
                              setCustomUrl("");
                              setErrorMsg("");
                              audioSynth.playClick();
                            }}
                            className={`flex h-8 w-8 items-center justify-center rounded-lg text-lg transition select-none cursor-pointer ${
                              isSelected
                                ? "bg-red-500/20 border-2 border-red-500 text-white scale-110"
                                : "bg-neutral-900 border border-neutral-850 hover:bg-neutral-800 hover:border-neutral-750 text-neutral-300"
                            }`}
                          >
                            {emoji}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Status responses */}
              {errorMsg && (
                <div className="p-3 rounded-xl bg-red-950/25 border border-red-500/20 flex items-center gap-2.5 text-xs text-red-500">
                  <AlertCircle className="h-4.5 w-4.5 shrink-0" />
                  <span className="font-semibold">{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-3 rounded-xl bg-emerald-950/25 border border-emerald-500/20 flex items-center gap-2.5 text-xs text-emerald-400 animate-pulse">
                  <CheckCircle className="h-4.5 w-4.5 shrink-0" />
                  <span className="font-semibold">{successMsg}</span>
                </div>
              )}

              {/* Submit panel */}
              <div className="pt-2 flex items-center gap-4">
                <button
                  type="button"
                  disabled={updatingProfile}
                  onClick={handleSaveProfile}
                  className="px-6 py-3 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-xs font-black text-white transition cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-red-950/20 hover:scale-101"
                >
                  {updatingProfile ? "Kaydediliyor..." : "Profil Bilgilerini Kaydet"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditName(currentUser.name);
                    setEditUsername(currentUser.username || "");
                    setSelectedAvatar(currentUser.avatar || "");
                    const isUrl = currentUser.avatar && (currentUser.avatar.startsWith("http") || currentUser.avatar.startsWith("/"));
                    setCustomUrl(isUrl ? currentUser.avatar : "");
                    setErrorMsg("");
                    setSuccessMsg("");
                    audioSynth.playClick();
                  }}
                  className="px-4 py-3 rounded-xl bg-neutral-900 hover:bg-neutral-850 text-xs font-bold text-neutral-400 transition cursor-pointer"
                >
                  Değişiklikleri Geri Al
                </button>
              </div>
            </motion.div>
          )}

          {subTab === "premium" && (
            <motion.div
              key="premium"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="space-y-6"
            >
              {/* Premium Hero Status Display */}
              {isPremium ? (
                <div className="bg-gradient-to-r from-amber-500/10 to-yellow-500/5 border border-amber-500/30 p-6 rounded-3xl text-left relative overflow-hidden">
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-10 pointer-events-none">
                    <Crown className="h-44 w-44 text-amber-500 fill-amber-500/20" />
                  </div>
                  <div className="space-y-2 relative z-10">
                    <div className="flex items-center gap-2">
                      <Crown className="h-6 w-6 text-amber-500 fill-amber-500/20" />
                      <span className="text-lg font-black text-amber-500 uppercase tracking-wide">Aktif Premium Üyelik</span>
                    </div>
                    <p className="text-sm text-neutral-300 max-w-lg leading-relaxed">
                      Hesabınızda reklamsız limitsiz dönüşümler, 10x Turbo ses dönüştürme modu, öncelikli bekleme hattı ve elit lig katılımı gibi tüm premium avantajlar şu an tam kapasiteyle aktiftir!
                    </p>
                    <div className="flex items-center gap-1.5 text-xs text-amber-500/80 pt-1 font-bold">
                      <Check className="h-4 w-4 shrink-0" /> Sınırsız Günlük İndirme Aktif
                      <span className="text-neutral-700">•</span>
                      <Check className="h-4 w-4 shrink-0" /> 10x Turbo Hız Aktif
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-neutral-900/40 border border-neutral-850 p-6 rounded-3xl text-left flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="space-y-1.5 flex-1">
                    <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-1.5">
                      <Sparkles className="h-5 w-5 text-amber-500 fill-amber-500/10 animate-pulse" />
                      Premium İle Sınırları Kaldırın!
                    </h3>
                    <p className="text-xs text-neutral-400 max-w-xl leading-relaxed">
                      Günlük 5 indirme sınırına takılmadan, sunucudaki en öncelikli bekleme hattını (10x Turbo Modu) kullanarak yüksek kaliteli 320kbps MP3 indirmeleri anında gerçekleştirebilirsiniz.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      onOpenPremium();
                      audioSynth.playClick();
                    }}
                    className="w-full md:w-auto px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 font-extrabold text-xs text-neutral-950 transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xl shadow-amber-950/20"
                  >
                    <Sparkles className="h-4 w-4 fill-neutral-950" />
                    Plânları İncele & Yükselt
                  </button>
                </div>
              )}

              {/* Direct feature comparison */}
              <div className="space-y-3 text-left">
                <h4 className="text-sm font-extrabold text-white">Üyelik Modelleri Karşılaştırması</h4>
                <div className="border border-neutral-900 rounded-2xl overflow-hidden bg-neutral-900/10">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-neutral-950 border-b border-neutral-900 text-neutral-400 font-bold">
                        <th className="p-3.5 sm:p-4">Özellik</th>
                        <th className="p-3.5 sm:p-4 text-center">Standart Üye</th>
                        <th className="p-3.5 sm:p-4 text-center text-amber-500">Premium Elit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-900">
                      <tr>
                        <td className="p-3.5 sm:p-4 font-semibold text-white">Günlük Dönüştürme Limiti</td>
                        <td className="p-3.5 sm:p-4 text-center text-neutral-400">Günde 5 Kez</td>
                        <td className="p-3.5 sm:p-4 text-center font-bold text-amber-500">Sınırsız & Sonsuz</td>
                      </tr>
                      <tr>
                        <td className="p-3.5 sm:p-4 font-semibold text-white">Dönüştürme Hızı</td>
                        <td className="p-3.5 sm:p-4 text-center text-neutral-400">Standart Hat</td>
                        <td className="p-3.5 sm:p-4 text-center font-bold text-amber-500 flex items-center justify-center gap-1">
                          <Zap className="h-3.5 w-3.5 fill-amber-500/10" /> 10x Turbo Hat
                        </td>
                      </tr>
                      <tr>
                        <td className="p-3.5 sm:p-4 font-semibold text-white">Ses İndirme Kalitesi</td>
                        <td className="p-3.5 sm:p-4 text-center text-neutral-400">128kbps / 192kbps</td>
                        <td className="p-3.5 sm:p-4 text-center font-bold text-amber-500">320kbps HD Stereo</td>
                      </tr>
                      <tr>
                        <td className="p-3.5 sm:p-4 font-semibold text-white">Sıralama Ligi Katılımı</td>
                        <td className="p-3.5 sm:p-4 text-center text-neutral-400">Var</td>
                        <td className="p-3.5 sm:p-4 text-center font-bold text-amber-500">Garantili Rozet</td>
                      </tr>
                      <tr>
                        <td className="p-3.5 sm:p-4 font-semibold text-white">Özel Profil Linki Desteği</td>
                        <td className="p-3.5 sm:p-4 text-center text-neutral-400">Yok (Yalnızca Emoji)</td>
                        <td className="p-3.5 sm:p-4 text-center font-bold text-amber-500">Sınırsız Link Desteği</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
