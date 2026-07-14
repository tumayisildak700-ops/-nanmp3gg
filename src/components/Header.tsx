import React, { useState, useEffect } from "react";
import { Youtube, Bell, History, ShieldAlert, LogOut, LogIn, Award, Sparkles, Megaphone, Calendar, Zap, Check, ChevronDown, Shield, Trophy, Camera, ChevronLeft, Users, MessageSquare } from "lucide-react";
import { User } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { audioSynth } from "../lib/audio";

interface HeaderProps {
  currentUser: User | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenAuth: () => void;
  onOpenPremium: () => void;
  onLogout: () => void;
  announcementCount: number;
  isMaintenanceMode?: boolean;
  conversionsCount?: number;
  onUpdateUser?: (updatedUser: User) => void;
  unreadMessagesCount?: number;
}

const PRESET_AVATARS = [
  "🎧", "🚀", "👾", "🔥", "👑", "🦊", 
  "😎", "🎵", "🧙‍♂️", "🐼", "🦁", "🐱", 
  "🌟", "⚡", "🎸", "🍕", "🎮", "🛸"
];

export default function Header({
  currentUser,
  activeTab,
  setActiveTab,
  onOpenAuth,
  onOpenPremium,
  onLogout,
  announcementCount,
  isMaintenanceMode = false,
  conversionsCount = 0,
  onUpdateUser,
  unreadMessagesCount = 0,
}: HeaderProps) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [avatarEditing, setAvatarEditing] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState("");
  const [customUrl, setCustomUrl] = useState("");
  const [updatingAvatar, setUpdatingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const [editName, setEditName] = useState("");
  const [editUsername, setEditUsername] = useState("");

  const isCreator = currentUser?.email.toLowerCase() === "tumayisildak700@gmail.com";
  const isPremium = currentUser?.isPremium || currentUser?.role === "admin";

  useEffect(() => {
    if (profileOpen && currentUser) {
      setSelectedAvatar(currentUser.avatar || "");
      const isUrl = currentUser.avatar && (currentUser.avatar.startsWith("http://") || currentUser.avatar.startsWith("https://") || currentUser.avatar.startsWith("/"));
      setCustomUrl(isUrl ? currentUser.avatar : "");
      setEditName(currentUser.name || "");
      setEditUsername(currentUser.username || "");
      setAvatarEditing(false);
      setAvatarError("");
    }
  }, [profileOpen, currentUser]);

  const renderAvatar = (user: User, sizeClass: string = "h-9 w-9 text-sm") => {
    const isPremiumUser = user.isPremium || user.role === "admin";
    const avatar = user.avatar;
    const isUrl = avatar && (avatar.startsWith("http://") || avatar.startsWith("https://") || avatar.startsWith("/"));

    return (
      <div className={`relative flex items-center justify-center rounded-full font-bold border shrink-0 overflow-hidden ${sizeClass} ${
        isPremiumUser ? "border-amber-500/60 bg-amber-950/40 text-amber-400" : "border-neutral-700 bg-neutral-800 text-red-500"
      }`}>
        {isUrl ? (
          <img src={avatar} alt={user.name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
        ) : avatar ? (
          <span className="leading-none select-none">{avatar}</span>
        ) : (
          <span>{user.name.charAt(0).toUpperCase()}</span>
        )}
        {isPremiumUser && (
          <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-500 text-[8px] font-black text-neutral-950 border border-neutral-950">
            ★
          </span>
        )}
      </div>
    );
  };

  const handleSaveProfile = async (avatarValue: string, nameValue: string, usernameValue: string) => {
    setUpdatingAvatar(true);
    setAvatarError("");
    try {
      const token = localStorage.getItem("yt_converter_token");
      const response = await fetch("/api/auth/update-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ avatar: avatarValue, name: nameValue, username: usernameValue }),
      });
      if (response.ok) {
        const updatedUser = await response.json();
        if (onUpdateUser) {
          onUpdateUser(updatedUser);
        }
        setAvatarEditing(false);
        audioSynth.playSuccess();
      } else {
        const errData = await response.json().catch(() => ({}));
        setAvatarError(errData.error || "Güncellenirken bir hata oluştu.");
      }
    } catch (error) {
      setAvatarError("Sunucu bağlantı hatası.");
    } finally {
      setUpdatingAvatar(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-800 bg-neutral-950/80 backdrop-blur-md" id="app-header">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Logo & Status */}
          <div className="flex items-center gap-3">
            <div 
              onClick={() => setActiveTab("converter")}
              className="flex items-center gap-2 cursor-pointer group"
              id="header-logo"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-600 group-hover:bg-red-700 transition">
                <Youtube className="h-5 w-5 text-white fill-white" />
              </div>
              <span className="text-lg font-bold tracking-tight text-white block">
                İnan<span className="text-red-500">mp3gg</span>
              </span>
            </div>

            {/* Glowing Status Indicator */}
            <div 
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-mono select-none transition-all duration-300 ${
                isMaintenanceMode 
                  ? "bg-red-950/30 border-red-900/40 text-red-400" 
                  : "bg-emerald-950/30 border-emerald-900/40 text-emerald-400"
              }`} 
              id="header-status-indicator"
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isMaintenanceMode ? "bg-red-400" : "bg-emerald-400"}`}></span>
                <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${isMaintenanceMode ? "bg-red-500" : "bg-emerald-500"}`}></span>
              </span>
              <span className="font-semibold hidden xs:inline uppercase tracking-wider">
                {isMaintenanceMode ? "Maintenance Active" : "Server: Operational"}
              </span>
              <span className="font-semibold xs:hidden uppercase tracking-wider">
                {isMaintenanceMode ? "Bakım" : "Online"}
              </span>
            </div>
          </div>

          {/* Desktop Navigation - Hidden on mobile, shown on lg+ */}
          <nav className="hidden lg:flex items-center space-x-1 sm:space-x-2" id="header-nav-desktop">
            <button
              onClick={() => setActiveTab("converter")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition cursor-pointer ${
                activeTab === "converter"
                  ? "bg-neutral-800 text-white"
                  : "text-neutral-400 hover:bg-neutral-900 hover:text-white"
              }`}
              id="nav-converter"
            >
              <Youtube className="h-4 w-4" />
              <span>Dönüştürücü</span>
            </button>

            <button
              onClick={() => setActiveTab("announcements")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition relative cursor-pointer ${
                activeTab === "announcements"
                  ? "bg-neutral-800 text-white"
                  : "text-neutral-400 hover:bg-neutral-900 hover:text-white"
              }`}
              id="nav-announcements"
            >
              <Bell className="h-4 w-4" />
              <span>Duyurular</span>
              {announcementCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white">
                  {announcementCount}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                if (!currentUser) {
                  onOpenAuth();
                } else {
                  setActiveTab("social");
                }
                audioSynth.playClick();
              }}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition relative cursor-pointer ${
                activeTab === "social"
                  ? "bg-neutral-800 text-white"
                  : "text-neutral-400 hover:bg-neutral-900 hover:text-white"
              }`}
              id="nav-social"
            >
              <Users className="h-4 w-4 text-red-400" />
              <span>Sosyal / Mesajlaşma</span>
              {unreadMessagesCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-extrabold text-neutral-950 animate-bounce">
                  {unreadMessagesCount}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setActiveTab("leaderboard");
                audioSynth.playClick();
              }}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition cursor-pointer ${
                activeTab === "leaderboard"
                  ? "bg-neutral-800 text-white"
                  : "text-neutral-400 hover:bg-neutral-900 hover:text-white"
              }`}
              id="nav-leaderboard"
            >
              <Trophy className="h-4 w-4 text-amber-500 fill-amber-500/10" />
              <span>Sıralama</span>
            </button>

            {currentUser && (
              <button
                onClick={() => {
                  setActiveTab("profile");
                  audioSynth.playClick();
                }}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition cursor-pointer ${
                  activeTab === "profile"
                    ? "bg-neutral-800 text-white"
                    : "text-neutral-400 hover:bg-neutral-900 hover:text-white"
                }`}
                id="nav-profile"
              >
                <Award className="h-4 w-4 text-amber-500 fill-amber-500/10" />
                <span>Profilim</span>
              </button>
            )}



            <button
              onClick={() => setActiveTab("advertise")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition cursor-pointer ${
                activeTab === "advertise"
                  ? "bg-neutral-800 text-white"
                  : "text-neutral-400 hover:bg-neutral-900 hover:text-white"
              }`}
              id="nav-advertise"
            >
              <Megaphone className="h-4 w-4 text-red-400" />
              <span>Reklam Ver</span>
            </button>

            {/* Premium Plans shortcut */}
            <button
              onClick={onOpenPremium}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition cursor-pointer"
              id="nav-premium-plans"
            >
              <Sparkles className="h-4 w-4 fill-amber-500/20" />
              <span>Premium Al</span>
            </button>

            {currentUser?.role === "admin" && (
              <button
                onClick={() => setActiveTab("admin")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium border border-red-950/60 transition cursor-pointer ${
                  activeTab === "admin"
                    ? "bg-red-950/40 border-red-800 text-red-400 font-semibold"
                    : "text-red-400/80 hover:bg-red-950/20 hover:text-red-400"
                }`}
                id="nav-admin"
              >
                <ShieldAlert className="h-4 w-4" />
                <span>Yönetici</span>
              </button>
            )}
          </nav>

          {/* Right Section: User Profile / Auth Actions */}
          <div className="flex items-center gap-3" id="header-actions">
            {currentUser ? (
              <div className="flex items-center gap-2 sm:gap-3" id="user-profile-badge-container">
                <div className="relative" id="user-profile-dropdown-wrapper">
                  {/* Trigger Button */}
                  <button
                    onClick={() => {
                      setProfileOpen(!profileOpen);
                      audioSynth.playClick();
                    }}
                    className={`flex items-center gap-2.5 rounded-xl p-1.5 text-left transition select-none cursor-pointer ${
                      profileOpen ? "bg-neutral-900 border border-neutral-800" : "hover:bg-neutral-900 border border-transparent"
                    }`}
                    id="user-profile-badge"
                  >
                    {/* User Identity info */}
                    <div className="hidden md:flex flex-col items-end text-right">
                      <div className="flex items-center gap-1.5">
                        {currentUser.badge && (
                          <span className="text-xs" title="Haftalık Sıralama Rozeti">
                            {currentUser.badge === "altin" ? "🥇" : currentUser.badge === "gumus" ? "🥈" : "🥉"}
                          </span>
                        )}
                        <span className="text-sm font-medium text-white">{currentUser.name}</span>
                        {isCreator ? (
                          <span className="flex items-center gap-1 rounded bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 text-[10px] font-bold text-amber-500">
                            <Award className="h-3 w-3 fill-amber-500" /> Kurucu
                          </span>
                        ) : isPremium ? (
                          <span className="flex items-center gap-0.5 rounded bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 text-[10px] font-black text-amber-500 animate-pulse">
                            👑 Premium
                          </span>
                        ) : currentUser.role === "admin" ? (
                          <span className="rounded bg-red-500/10 border border-red-500/30 px-1.5 py-0.5 text-[10px] font-bold text-red-500">
                            Yönetici
                          </span>
                        ) : (
                          <span className="rounded bg-neutral-800 border border-neutral-700 px-1.5 py-0.5 text-[10px] font-medium text-neutral-400">
                            Üye
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-neutral-500">{currentUser.email}</span>
                    </div>

                    {/* Profile Avatar using renderAvatar */}
                    {renderAvatar(currentUser, "h-9 w-9 text-sm")}
                    <ChevronDown className={`h-4 w-4 text-neutral-500 hidden md:block transition-transform duration-250 ${profileOpen ? "rotate-180" : ""}`} />
                  </button>

                  {/* Dropdown Menu / Popover Panel with detailed data */}
                  <AnimatePresence>
                    {profileOpen && (
                      <>
                        {/* Invisible backdrop for closing */}
                        <div className="fixed inset-0 z-40 cursor-default" onClick={() => setProfileOpen(false)} />
                        
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          transition={{ duration: 0.15 }}
                          className={`absolute right-0 mt-2.5 w-[310px] sm:w-[340px] rounded-2xl border bg-neutral-950 p-5 shadow-2xl z-50 overflow-hidden ${
                            isPremium ? "border-amber-500/30 shadow-amber-950/15" : "border-neutral-850 shadow-black"
                          }`}
                          id="profile-dropdown-panel"
                        >
                          {/* Golden backdrop accent for premium */}
                          {isPremium && (
                            <div className="absolute -right-16 -top-16 h-36 w-36 rounded-full bg-amber-500/5 blur-2xl pointer-events-none" />
                          )}

                          {/* Top Identity Header with interactive Avatar Change Button */}
                          <div className="flex items-center gap-3 pb-4 border-b border-neutral-900">
                            <div className="relative group/avatar">
                              {renderAvatar(currentUser, "h-12 w-12 text-base font-extrabold")}
                              <button
                                type="button"
                                onClick={() => {
                                  setAvatarEditing(!avatarEditing);
                                  audioSynth.playClick();
                                }}
                                className="absolute -bottom-1 -right-1 flex h-5.5 w-5.5 items-center justify-center rounded-full bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 hover:border-neutral-700 hover:text-white transition cursor-pointer text-neutral-400 shadow-md"
                                title="Fotoğraf / Avatar Değiştir"
                              >
                                <Camera className="h-3 w-3" />
                              </button>
                            </div>
                            <div className="text-left min-w-0 flex-1">
                              <h4 className="text-sm font-bold text-white truncate flex items-center gap-1.5">
                                {currentUser.name}
                                {currentUser.badge === "altin" ? "🥇" : currentUser.badge === "gumus" ? "🥈" : currentUser.badge === "bronz" ? "🥉" : ""}
                                {isCreator && <Trophy className="h-3.5 w-3.5 text-amber-500 fill-amber-500/10 shrink-0" />}
                              </h4>
                              {currentUser.username && (
                                <p className="text-[11px] font-bold text-amber-500 leading-none">@{currentUser.username}</p>
                              )}
                              <p className="text-xs text-neutral-400 truncate">{currentUser.email}</p>
                              <span className="text-[10px] font-mono text-neutral-500 block mt-0.5 flex items-center gap-1">
                                <Calendar className="h-3 w-3" /> Katılım: {new Date(currentUser.createdAt || "2026-01-01").toLocaleDateString("tr-TR", { month: "short", year: "numeric" })}
                              </span>
                            </div>
                          </div>

                          {avatarEditing ? (
                            /* --- Avatar & Username Edit / Customization View --- */
                            <div className="py-4 border-b border-neutral-900 space-y-4 text-left">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-neutral-300">Profili Düzenle</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAvatarEditing(false);
                                    audioSynth.playClick();
                                  }}
                                  className="text-[11px] text-neutral-400 hover:text-neutral-200 transition flex items-center gap-0.5 cursor-pointer font-semibold"
                                >
                                  <ChevronLeft className="h-3.5 w-3.5" /> Geri Dön
                                </button>
                              </div>

                              {/* Display Name Input */}
                              <div className="space-y-1.5">
                                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">Profil Adı</span>
                                <input
                                  type="text"
                                  placeholder="Profil adınız"
                                  value={editName}
                                  onChange={(e) => {
                                    setEditName(e.target.value);
                                    setAvatarError("");
                                  }}
                                  className="w-full rounded-xl bg-neutral-900 border border-neutral-850 px-3 py-2 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20"
                                />
                              </div>

                              {/* Username input */}
                              <div className="space-y-1.5">
                                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">Kullanıcı Adı (@)</span>
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-500">@</span>
                                  <input
                                    type="text"
                                    placeholder="kullanici_adi"
                                    value={editUsername}
                                    onChange={(e) => {
                                      setEditUsername(e.target.value);
                                      setAvatarError("");
                                    }}
                                    className="w-full rounded-xl bg-neutral-900 border border-neutral-850 pl-7 pr-3 py-2 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20"
                                  />
                                </div>
                                <span className="text-[9px] text-neutral-500 block leading-tight">
                                  Kullanıcı adınızı sadece 7 günde bir değiştirebilirsiniz.
                                </span>
                              </div>

                              {/* Preview Area */}
                              <div className="flex items-center gap-3 bg-neutral-900/40 p-2.5 rounded-xl border border-neutral-850/60">
                                <div className="shrink-0">
                                  <div className={`relative flex h-11 w-11 items-center justify-center rounded-full font-bold border shrink-0 overflow-hidden ${
                                    isPremium ? "border-amber-500/60 bg-amber-950/40 text-amber-400" : "border-neutral-700 bg-neutral-800 text-red-500"
                                  }`}>
                                    {customUrl ? (
                                      <img 
                                        src={customUrl} 
                                        alt="Önizleme" 
                                        className="h-full w-full object-cover" 
                                        onError={() => setAvatarError("Girdiğiniz link geçerli bir resim yüklemedi.")}
                                        referrerPolicy="no-referrer" 
                                      />
                                    ) : selectedAvatar ? (
                                      <span className="leading-none text-xl select-none">{selectedAvatar}</span>
                                    ) : (
                                      <span>{editName ? editName.charAt(0).toUpperCase() : currentUser.name.charAt(0).toUpperCase()}</span>
                                    )}
                                  </div>
                                </div>
                                <div className="text-left min-w-0">
                                  <span className="text-xs font-bold text-white block truncate">
                                    {editName || currentUser.name}
                                  </span>
                                  {editUsername && (
                                    <span className="text-[10px] text-amber-500 font-semibold block leading-tight truncate">
                                      @{editUsername}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Emoji Presets Grid */}
                              <div className="space-y-1.5">
                                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">Hazır Avatarlar</span>
                                <div className="grid grid-cols-6 gap-2">
                                  {PRESET_AVATARS.map((emoji) => {
                                    const isSelected = selectedAvatar === emoji && !customUrl;
                                    return (
                                      <button
                                        key={emoji}
                                        type="button"
                                        onClick={() => {
                                          setSelectedAvatar(emoji);
                                          setCustomUrl("");
                                          setAvatarError("");
                                          audioSynth.playClick();
                                        }}
                                        className={`flex h-8 w-8 items-center justify-center rounded-lg text-lg transition select-none cursor-pointer ${
                                          isSelected
                                            ? "bg-amber-500/20 border-2 border-amber-500 text-white scale-110"
                                            : "bg-neutral-900 border border-neutral-850 hover:bg-neutral-850 hover:border-neutral-750 text-neutral-300"
                                        }`}
                                      >
                                        {emoji}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Custom URL input */}
                              <div className="space-y-1.5">
                                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">Veya Özel Profil Fotoğrafı Linki</span>
                                <input
                                  type="url"
                                  placeholder="https://site.com/resim.jpg"
                                  value={customUrl}
                                  onChange={(e) => {
                                    setCustomUrl(e.target.value);
                                    setSelectedAvatar("");
                                    setAvatarError("");
                                  }}
                                  className="w-full rounded-xl bg-neutral-900 border border-neutral-850 px-3 py-2 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-amber-500/50"
                                />
                              </div>

                              {/* Clear / Reset option */}
                              {(selectedAvatar || customUrl) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedAvatar("");
                                    setCustomUrl("");
                                    setAvatarError("");
                                    audioSynth.playClick();
                                  }}
                                  className="text-[11px] text-red-400 hover:text-red-300 transition flex items-center gap-1 cursor-pointer font-medium"
                                >
                                  Varsayılan Harfe Geri Dön
                                </button>
                              )}

                              {avatarError && (
                                <p className="text-[10px] font-semibold text-red-500 leading-normal">{avatarError}</p>
                              )}

                              {/* Save / Cancel buttons */}
                              <div className="grid grid-cols-2 gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAvatarEditing(false);
                                    audioSynth.playClick();
                                  }}
                                  className="py-2 rounded-xl bg-neutral-900 hover:bg-neutral-850 text-xs font-semibold text-neutral-300 border border-neutral-800 transition cursor-pointer"
                                >
                                  Vazgeç
                                </button>
                                <button
                                  type="button"
                                  disabled={updatingAvatar}
                                  onClick={() => handleSaveProfile(customUrl || selectedAvatar, editName, editUsername)}
                                  className="py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-xs font-extrabold text-neutral-950 transition cursor-pointer flex items-center justify-center gap-1.5"
                                >
                                  {updatingAvatar ? "Kaydediliyor..." : "Kaydet"}
                                </button>
                              </div>
                            </div>
                          ) : (
                            /* --- Regular Stats and Limits View --- */
                            <>
                              {/* Fikir 2: Dashboard Statistics Panel */}
                              <div className="py-4 border-b border-neutral-900 space-y-3">
                                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block text-left">Dönüşüm İstatistikleri</span>
                                <div className="grid grid-cols-2 gap-2.5">
                                  <div className="bg-neutral-900/50 border border-neutral-850/60 p-2.5 rounded-xl text-left">
                                    <span className="text-[10px] text-neutral-500 block">Dönüştürülen</span>
                                    <span className="text-base font-bold font-mono text-white flex items-baseline gap-1 mt-0.5">
                                      {conversionsCount} <span className="text-xs font-medium text-neutral-500 font-sans">MP3</span>
                                    </span>
                                  </div>
                                  <div className="bg-neutral-900/50 border border-neutral-850/60 p-2.5 rounded-xl text-left">
                                    <span className="text-[10px] text-neutral-500 block">Süre Kazancı</span>
                                    <span className="text-base font-bold font-mono text-emerald-400 flex items-baseline gap-0.5 mt-0.5">
                                      {isPremium ? (conversionsCount * 1.5).toFixed(1) : (conversionsCount * 0.3).toFixed(1)}
                                      <span className="text-[10px] font-medium text-neutral-500 font-sans">dk</span>
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Fikir 3: Limit Progress Bar / Speed Multiplier */}
                              <div className="py-4 border-b border-neutral-900 space-y-2.5 text-left">
                                {isPremium ? (
                                  <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Kullanım Limiti</span>
                                      <span className="text-[10px] font-extrabold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">Sınırsız</span>
                                    </div>
                                    <div className="flex items-center justify-between bg-amber-950/10 border border-amber-500/15 p-2.5 rounded-xl">
                                      <div className="flex items-center gap-2">
                                        <Zap className="h-4 w-4 text-amber-500 animate-pulse fill-amber-500/20" />
                                        <div>
                                          <span className="text-xs font-bold text-neutral-200 block">10x Turbo Modu</span>
                                          <span className="text-[10px] text-neutral-400 block">Öncelikli dönüşüm hattı aktif.</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Günlük Limit</span>
                                      <span className="text-[10px] font-mono font-bold text-neutral-300">
                                        {Math.min(conversionsCount, 5)} / 5 İndirme
                                      </span>
                                    </div>
                                    {/* Progress bar */}
                                    <div className="w-full bg-neutral-900 rounded-full h-1.5 overflow-hidden border border-neutral-850">
                                      <div 
                                        className="bg-red-500 h-full rounded-full transition-all duration-500" 
                                        style={{ width: `${Math.min((conversionsCount / 5) * 100, 100)}%` }}
                                      />
                                    </div>
                                    <p className="text-[10px] text-neutral-400 leading-normal">
                                      Günlük indirme limitiniz her gece sıfırlanır. Limiti kaldırmak için Premium'a geçebilirsiniz.
                                    </p>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setProfileOpen(false);
                                        onOpenPremium();
                                        audioSynth.playClick();
                                      }}
                                      className="w-full mt-1.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-xs font-extrabold text-neutral-950 transition cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-amber-950/20"
                                    >
                                      <Sparkles className="h-3.5 w-3.5 fill-neutral-950" />
                                      Premium'a Yükselt
                                    </button>
                                  </div>
                                )}
                              </div>
                            </>
                          )}

                          {/* Dropdown Options */}
                          <div className="pt-3 space-y-1">
                            <button
                              onClick={() => {
                                setProfileOpen(false);
                                setActiveTab("profile");
                                audioSynth.playClick();
                              }}
                              className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl text-left transition cursor-pointer ${
                                activeTab === "profile" ? "bg-amber-950/20 text-amber-400" : "text-neutral-400 hover:bg-neutral-900 hover:text-white"
                              }`}
                            >
                              <Award className="h-4 w-4 text-amber-500 fill-amber-500/10 shrink-0" />
                              Gelişmiş Profil Paneli 🌟
                            </button>

                            {currentUser.role === "admin" && (
                              <button
                                onClick={() => {
                                  setProfileOpen(false);
                                  setActiveTab("admin");
                                  audioSynth.playClick();
                                }}
                                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl text-left transition cursor-pointer ${
                                  activeTab === "admin" ? "bg-red-950/20 text-red-400" : "text-neutral-400 hover:bg-neutral-900 hover:text-white"
                                }`}
                              >
                                <Shield className="h-4 w-4 shrink-0" />
                                Yönetici Paneli
                              </button>
                            )}
                            
                            <button
                              onClick={() => {
                                setProfileOpen(false);
                                onLogout();
                                audioSynth.playClick();
                              }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl text-left text-neutral-400 hover:bg-red-950/20 hover:text-red-400 transition cursor-pointer"
                            >
                              <LogOut className="h-4 w-4 shrink-0" />
                              Güvenli Çıkış
                            </button>
                          </div>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="flex items-center gap-2 rounded-lg bg-red-600 hover:bg-red-700 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-red-950/10 transition cursor-pointer"
                id="header-login-trigger"
              >
                <LogIn className="h-4 w-4" />
                <span>Giriş Yap</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation Row - Horizontal scrollable, shown only on screens smaller than lg */}
        <div className="lg:hidden border-t border-neutral-900/40 py-2">
          <nav className="flex items-center space-x-2 overflow-x-auto whitespace-nowrap scrollbar-none pb-1 px-1 flex-nowrap" id="header-nav-mobile">
            <button
              onClick={() => setActiveTab("converter")}
              className={`flex items-center gap-1 rounded-full px-3.5 py-1.5 text-xs font-semibold transition shrink-0 cursor-pointer ${
                activeTab === "converter"
                  ? "bg-red-600 text-white font-bold"
                  : "bg-neutral-900 text-neutral-400 hover:text-white"
              }`}
              id="nav-converter-mobile"
            >
              <Youtube className="h-3.5 w-3.5" />
              <span>Dönüştürücü</span>
            </button>

            <button
              onClick={() => setActiveTab("announcements")}
              className={`flex items-center gap-1 rounded-full px-3.5 py-1.5 text-xs font-semibold transition shrink-0 relative cursor-pointer ${
                activeTab === "announcements"
                  ? "bg-red-600 text-white font-bold"
                  : "bg-neutral-900 text-neutral-400 hover:text-white"
              }`}
              id="nav-announcements-mobile"
            >
              <Bell className="h-3.5 w-3.5" />
              <span>Duyurular</span>
              {announcementCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-red-600 border-2 border-neutral-950 text-[9px] font-black text-white">
                  {announcementCount}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                if (!currentUser) {
                   onOpenAuth();
                } else {
                  setActiveTab("social");
                }
                audioSynth.playClick();
              }}
              className={`flex items-center gap-1 rounded-full px-3.5 py-1.5 text-xs font-semibold transition shrink-0 relative cursor-pointer ${
                activeTab === "social"
                  ? "bg-red-600 text-white font-bold"
                  : "bg-neutral-900 text-neutral-400 hover:text-white"
              }`}
              id="nav-social-mobile"
            >
              <Users className="h-3.5 w-3.5 text-red-400" />
              <span>Sosyal</span>
              {unreadMessagesCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-amber-500 border-2 border-neutral-950 text-[9px] font-black text-neutral-950 animate-bounce">
                  {unreadMessagesCount}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setActiveTab("leaderboard");
                audioSynth.playClick();
              }}
              className={`flex items-center gap-1 rounded-full px-3.5 py-1.5 text-xs font-semibold transition shrink-0 cursor-pointer ${
                activeTab === "leaderboard"
                  ? "bg-red-600 text-white font-bold"
                  : "bg-neutral-900 text-neutral-400 hover:text-white"
              }`}
              id="nav-leaderboard-mobile"
            >
              <Trophy className="h-3.5 w-3.5 text-amber-500 fill-amber-500/10" />
              <span>Sıralama</span>
            </button>

            {currentUser && (
              <button
                onClick={() => {
                  setActiveTab("profile");
                  audioSynth.playClick();
                }}
                className={`flex items-center gap-1 rounded-full px-3.5 py-1.5 text-xs font-semibold transition shrink-0 cursor-pointer ${
                  activeTab === "profile"
                    ? "bg-red-600 text-white font-bold"
                    : "bg-neutral-900 text-neutral-400 hover:text-white"
                }`}
                id="nav-profile-mobile"
              >
                <Award className="h-3.5 w-3.5 text-amber-500 fill-amber-500/10" />
                <span>Profilim</span>
              </button>
            )}



            <button
              onClick={() => setActiveTab("advertise")}
              className={`flex items-center gap-1 rounded-full px-3.5 py-1.5 text-xs font-semibold transition shrink-0 cursor-pointer ${
                activeTab === "advertise"
                  ? "bg-red-600 text-white font-bold"
                  : "bg-neutral-900 text-neutral-400 hover:text-white"
              }`}
              id="nav-advertise-mobile"
            >
              <Megaphone className="h-3.5 w-3.5 text-red-400" />
              <span>Reklam Ver</span>
            </button>

            <button
              onClick={onOpenPremium}
              className="flex items-center gap-1 rounded-full px-3.5 py-1.5 text-xs font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition shrink-0 cursor-pointer"
              id="nav-premium-plans-mobile"
            >
              <Sparkles className="h-3.5 w-3.5 fill-amber-500/20" />
              <span>Premium Al</span>
            </button>

            {currentUser?.role === "admin" && (
              <button
                onClick={() => setActiveTab("admin")}
                className={`flex items-center gap-1 rounded-full px-3.5 py-1.5 text-xs font-semibold border transition shrink-0 cursor-pointer ${
                  activeTab === "admin"
                    ? "bg-red-950/40 border-red-800 text-red-400 font-bold"
                    : "bg-neutral-900 border-neutral-800 text-red-400 hover:bg-red-950/20"
                }`}
                id="nav-admin-mobile"
              >
                <ShieldAlert className="h-3.5 w-3.5" />
                <span>Yönetici</span>
              </button>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
