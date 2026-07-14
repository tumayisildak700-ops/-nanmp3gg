import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Trophy, Award, Download, Sparkles, User, Zap, RefreshCw, Crown, ShieldAlert } from "lucide-react";

interface LeaderboardUser {
  id: string;
  name: string;
  username?: string;
  avatar: string;
  isPremium: boolean;
  downloadsCount: number;
  rank: number;
  badge: string;
}

export function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchLeaderboard = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/leaderboard");
      if (response.ok) {
        const data = await response.json();
        setLeaderboard(data);
      } else {
        setError("Liderlik tablosu yüklenemedi.");
      }
    } catch (e) {
      setError("Sunucuya bağlanılamadı.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const renderBadgeIcon = (badge: string) => {
    if (badge === "altin") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold bg-gradient-to-r from-amber-500 to-yellow-400 text-neutral-950 border border-amber-400 shadow shadow-amber-500/20" title="Altın Rozet (Haftalık Şampiyon)">
          🥇 Altın Rozet
        </span>
      );
    }
    if (badge === "gumus") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold bg-gradient-to-r from-neutral-300 to-neutral-400 text-neutral-950 border border-neutral-200" title="Gümüş Rozet">
          🥈 Gümüş Rozet
        </span>
      );
    }
    if (badge === "bronz") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold bg-gradient-to-r from-amber-700 to-amber-800 text-amber-100 border border-amber-800" title="Bronz Rozet">
          🥉 Bronz Rozet
        </span>
      );
    }
    return null;
  };

  const renderRankMedal = (rank: number) => {
    if (rank === 1) return <Crown className="h-6 w-6 text-amber-500 animate-pulse fill-amber-500/20" />;
    if (rank === 2) return <Trophy className="h-5.5 w-5.5 text-neutral-300" />;
    if (rank === 3) return <Trophy className="h-5 w-5 text-amber-700" />;
    return <span className="text-xs font-mono font-bold text-neutral-500">#{rank}</span>;
  };

  const renderAvatar = (name: string, avatar: string, isPremium: boolean, size: string = "h-10 w-10") => {
    const isUrl = avatar && (avatar.startsWith("http://") || avatar.startsWith("https://") || avatar.startsWith("/"));
    return (
      <div className={`relative flex items-center justify-center rounded-full font-bold border shrink-0 overflow-hidden ${size} ${
        isPremium ? "border-amber-500/60 bg-amber-950/40 text-amber-400" : "border-neutral-700 bg-neutral-800 text-red-500"
      }`}>
        {isUrl ? (
          <img src={avatar} alt={name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
        ) : avatar ? (
          <span className="leading-none select-none text-base">{avatar}</span>
        ) : (
          <span>{name.charAt(0).toUpperCase()}</span>
        )}
        {isPremium && (
          <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-500 text-[8px] font-black text-neutral-950 border border-neutral-950">
            ★
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6" id="leaderboard-view">
      {/* Top Banner introducing the award system */}
      <div className="relative overflow-hidden rounded-3xl border border-amber-500/20 bg-gradient-to-br from-neutral-950 to-neutral-900/60 p-6 sm:p-8 shadow-2xl" id="leaderboard-info-banner">
        <div className="absolute -right-12 -bottom-12 h-44 w-44 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -top-12 h-44 w-44 rounded-full bg-red-500/5 blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3 max-w-2xl text-left">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-500 border border-amber-500/20">
                <Trophy className="h-3.5 w-3.5 fill-amber-500/10" /> Haftalık Ödül Sistemi
              </span>
              <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider">Otomatik Rozetler</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Dönüşüm Şampiyonları <span className="text-amber-500">🏆</span>
            </h1>
            <p className="text-sm text-neutral-400 leading-relaxed">
              Sistemimizde en çok YouTube videosu dönüştüren (MP3/MP4) ilk 10 kullanıcımıza haftalık sıralamalarına göre otomatik unvan rozetleri atanır! Profilinizde ve arkadaş listelerinde parıldayın.
            </p>
          </div>

          <button
            onClick={fetchLeaderboard}
            className="self-start md:self-auto flex items-center gap-2 rounded-xl bg-neutral-900 border border-neutral-800 hover:bg-neutral-850 hover:text-white px-4 py-2.5 text-xs font-bold text-neutral-400 transition cursor-pointer"
            id="leaderboard-refresh-button"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-amber-500" : ""}`} />
            <span>Yenile</span>
          </button>
        </div>

        {/* Prize Scheme Visual Container */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-6 border-t border-neutral-900" id="leaderboard-prizes">
          <div className="flex items-start gap-3 bg-neutral-950/40 p-3 rounded-2xl border border-amber-500/10 text-left">
            <span className="text-2xl">🥇</span>
            <div>
              <h4 className="text-xs font-extrabold text-amber-500">Altın Şampiyon Rozeti</h4>
              <p className="text-[11px] text-neutral-500 mt-0.5">Sıralamada 1. sırada bulunan kullanıcıya verilir.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 bg-neutral-950/40 p-3 rounded-2xl border border-neutral-850 text-left">
            <span className="text-2xl">🥈</span>
            <div>
              <h4 className="text-xs font-extrabold text-neutral-300">Gümüş Yıldız Rozeti</h4>
              <p className="text-[11px] text-neutral-500 mt-0.5">Sıralamada 2. ve 3. sıradaki kullanıcılara verilir.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 bg-neutral-950/40 p-3 rounded-2xl border border-neutral-850 text-left">
            <span className="text-2xl">🥉</span>
            <div>
              <h4 className="text-xs font-extrabold text-amber-700">Bronz Savaşçı Rozeti</h4>
              <p className="text-[11px] text-neutral-500 mt-0.5">Sıralamada 4 ile 10. sıradaki kullanıcılara verilir.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Leaderboard List */}
      <div className="bg-neutral-950 border border-neutral-900 rounded-3xl p-5 sm:p-6" id="leaderboard-list-container">
        <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-wider mb-4 flex items-center gap-2 text-left">
          <Award className="h-4 w-4 text-amber-500" />
          <span>En Çok İndiren Top 10 Üye</span>
        </h3>

        {loading ? (
          <div className="py-12 text-center" id="leaderboard-loading">
            <RefreshCw className="h-8 w-8 animate-spin text-amber-500 mx-auto" />
            <p className="text-neutral-500 text-sm mt-3 font-semibold">Şampiyonlar sıralaması yükleniyor...</p>
          </div>
        ) : error ? (
          <div className="py-10 text-center border border-red-950/40 bg-red-950/10 rounded-2xl" id="leaderboard-error">
            <ShieldAlert className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-red-400 text-xs font-semibold">{error}</p>
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="py-12 text-center border border-dashed border-neutral-850 rounded-2xl" id="leaderboard-empty">
            <Trophy className="h-8 w-8 text-neutral-700 mx-auto mb-2" />
            <p className="text-neutral-500 text-sm font-medium">Henüz kayıtlı indirme geçmişi bulunmuyor.</p>
            <p className="text-[11px] text-neutral-600 mt-1">İlk indirmeyi başlatıp zirveye yerleşen sen ol!</p>
          </div>
        ) : (
          <div className="space-y-2.5" id="leaderboard-list">
            {leaderboard.map((user, index) => {
              const isTopThree = user.rank <= 3;
              return (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  key={user.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl border transition-all duration-300 ${
                    user.rank === 1
                      ? "bg-gradient-to-r from-amber-500/10 to-transparent border-amber-500/30 shadow-lg shadow-amber-950/5"
                      : user.rank === 2
                      ? "bg-gradient-to-r from-neutral-500/5 to-transparent border-neutral-500/20"
                      : user.rank === 3
                      ? "bg-gradient-to-r from-amber-900/5 to-transparent border-amber-900/20"
                      : "bg-neutral-900/30 border-neutral-900/60 hover:bg-neutral-900/50"
                  }`}
                  id={`leaderboard-user-${user.id}`}
                >
                  {/* Left Identity Container */}
                  <div className="flex items-center gap-3 text-left">
                    {/* Rank Number / Icon */}
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-900 border border-neutral-850">
                      {renderRankMedal(user.rank)}
                    </div>

                    {/* Avatar */}
                    {renderAvatar(user.name, user.avatar, user.isPremium)}

                    {/* User name & dynamic badge */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-white truncate max-w-[140px] sm:max-w-[200px]">
                          {user.name}
                        </span>
                        {user.isPremium && (
                          <span className="flex items-center gap-0.5 rounded bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 text-[9px] font-black text-amber-500">
                            👑 Premium
                          </span>
                        )}
                        {renderBadgeIcon(user.badge)}
                      </div>
                      {user.username && (
                        <span className="text-xs font-semibold text-amber-500/90 block mt-0.5">
                          @{user.username}
                        </span>
                      )}
                      <span className="text-[9px] font-mono text-neutral-500 block mt-0.5">
                        Kullanıcı ID: {user.id.slice(0, 8)}...
                      </span>
                    </div>
                  </div>

                  {/* Right Stats Container */}
                  <div className="flex items-center justify-between sm:justify-end gap-6 pl-11 sm:pl-0 border-t border-neutral-900 sm:border-0 pt-2 sm:pt-0">
                    <span className="text-[10px] font-mono text-neutral-500 sm:hidden">İndirme Miktarı</span>
                    <div className="flex items-center gap-2 bg-neutral-950 border border-neutral-900 px-3 py-1.5 rounded-xl">
                      <Download className="h-3.5 w-3.5 text-neutral-500" />
                      <span className="text-xs font-black font-mono text-white">
                        {user.downloadsCount}
                      </span>
                      <span className="text-[10px] font-medium text-neutral-500">indirme</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Extra motivational card */}
      <div className="rounded-2xl border border-neutral-850 bg-neutral-900/20 p-5 text-left flex items-start gap-4">
        <Zap className="h-5 w-5 text-red-500 shrink-0 mt-0.5 animate-pulse" />
        <div>
          <h4 className="text-xs font-bold text-white">Nasıl Sıralamaya Girerim?</h4>
          <p className="text-[11px] text-neutral-400 mt-1 leading-relaxed">
            YouTube to MP3 veya MP4 servisimizi kullanarak her başarılı dönüştürme tamamladığınızda skorunuz otomatik olarak 1 artar. Sıralama her pazar gecesi saat 23:59'da kilitlenir ve şampiyonların rozetleri otomatik olarak güncellenir.
          </p>
        </div>
      </div>
    </div>
  );
}
