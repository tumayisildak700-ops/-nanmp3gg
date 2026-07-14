import React, { useState, useEffect, useRef } from "react";
import { 
  Users, UserPlus, UserMinus, Check, X, MessageSquare, Send, 
  Search, Shield, Sparkles, AlertCircle, RefreshCw, Trash2, Clock 
} from "lucide-react";
import { User } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { audioSynth } from "../lib/audio";

// Automatic Profanity Censorship Helper for Turkish Swear Words
function censorProfanity(text: string): string {
  if (!text) return "";
  const badWords = [
    "orospu çocuğu", "orospu cocugu", "amına koyayım", "amınakoyayım",
    "pezevenk", "orospu", "siktir", "sikeyim", "sikerim", "götveren", "gotveren",
    "amcık", "amcik", "yarrak", "yarak", "taşşak", "tassak", "kaltak", "gavat",
    "ibne", "kahpe", "amk", "aq", "piç", "pic", "göt", "got", "sik"
  ];

  let censored = text;
  const sorted = [...badWords].sort((a, b) => b.length - a.length);
  
  for (const word of sorted) {
    try {
      const escapedWord = word.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`(?<![a-zA-Z0-9ıİşŞğĞçÇöÖüÜ])${escapedWord}(?![a-zA-Z0-9ıİşŞğĞçÇöÖüÜ])`, 'gi');
      censored = censored.replace(regex, (match) => "*".repeat(match.length));
    } catch (e) {
      const escapedWord = word.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(escapedWord, 'gi');
      censored = censored.replace(regex, (match) => "*".repeat(match.length));
    }
  }
  return censored;
}

interface SocialHubProps {
  currentUser: User | null;
  token: string | null;
  onOpenAuth: () => void;
  onOpenPremium: () => void;
  onUnreadChange?: (count: number) => void;
}

interface FriendshipRequest {
  requestId: string;
  sender?: {
    id: string;
    name: string;
    email: string;
    avatar: string;
    isPremium: boolean;
    role: string;
  };
  receiver?: {
    id: string;
    name: string;
    email: string;
    avatar: string;
    isPremium: boolean;
    role: string;
  };
  createdAt: string;
}

interface PrivateMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

export default function SocialHub({
  currentUser,
  token,
  onOpenAuth,
  onOpenPremium,
  onUnreadChange,
}: SocialHubProps) {
  const [activeSubTab, setActiveSubTab] = useState<"friends" | "requests" | "find" | "chat">("friends");
  const [searchQuery, setSearchQuery] = useState("");
  const [friends, setFriends] = useState<User[]>([]);
  const [pendingSent, setPendingSent] = useState<FriendshipRequest[]>([]);
  const [pendingReceived, setPendingReceived] = useState<FriendshipRequest[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Chat State
  const [activeChatFriend, setActiveChatFriend] = useState<User | null>(null);
  const [chatMessages, setChatMessages] = useState<PrivateMessage[]>([]);
  const [newMessageText, setNewMessageText] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [totalUnread, setTotalUnread] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevUnreadCountRef = useRef<number>(0);

  // Fetch all friend data, requests, and other users
  const fetchSocialStatus = async (silent: boolean = false) => {
    if (!token) return;
    if (!silent) setLoading(true);
    try {
      const response = await fetch("/api/friends/status", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setFriends(data.friends || []);
        setPendingSent(data.pendingSent || []);
        setPendingReceived(data.pendingReceived || []);
        setAllUsers(data.allUsers || []);
        setError("");
      } else {
        const errData = await response.json().catch(() => ({}));
        setError(errData.error || "Arkadaş listesi güncellenemedi.");
      }
    } catch (err) {
      setError("Sunucuyla bağlantı kurulamadı.");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Fetch unread message counts
  const fetchUnreadCounts = async (silent: boolean = false) => {
    if (!token) return;
    try {
      const response = await fetch("/api/messages/unread", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setUnreadCounts(data.unreadCounts || {});
        
        const newTotal = data.totalUnread || 0;
        setTotalUnread(newTotal);
        if (onUnreadChange) {
          onUnreadChange(newTotal);
        }

        // Notify if unread count increases (new message notification!)
        if (newTotal > prevUnreadCountRef.current) {
          audioSynth.playSuccess("crystalline");
          // Flash page title or custom notification
          showInAppNotification("Yeni bir mesajınız var! 💬");
        }
        prevUnreadCountRef.current = newTotal;
      }
    } catch (e) {}
  };

  // Temporary In-App Banner/Notification State
  const [notificationBanner, setNotificationBanner] = useState("");
  const showInAppNotification = (msg: string) => {
    setNotificationBanner(msg);
    setTimeout(() => {
      setNotificationBanner("");
    }, 4000);
  };

  // Fetch messages with the active chat friend
  const fetchChatMessages = async (friendId: string, silent: boolean = false) => {
    if (!token) return;
    try {
      const response = await fetch(`/api/messages?friendId=${friendId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        // Only update if count or content differs to prevent visual flicker
        if (JSON.stringify(data) !== JSON.stringify(chatMessages)) {
          setChatMessages(data);
          // Auto-scroll to bottom
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
          }, 80);
        }
      }
    } catch (e) {}
  };

  // Initial and Polling Loops
  useEffect(() => {
    if (token) {
      fetchSocialStatus();
      fetchUnreadCounts();
    }
  }, [token]);

  // Periodic Polling
  useEffect(() => {
    if (!token) return;

    const interval = setInterval(() => {
      fetchSocialStatus(true);
      fetchUnreadCounts(true);

      if (activeChatFriend) {
        fetchChatMessages(activeChatFriend.id, true);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [token, activeChatFriend, chatMessages]);

  // Scroll to bottom whenever activeChatFriend changes
  useEffect(() => {
    if (activeChatFriend) {
      messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
    }
  }, [activeChatFriend]);

  // Handlers
  const handleSendRequest = async (receiverId: string) => {
    if (!token) return;
    setError("");
    setSuccessMsg("");
    try {
      const response = await fetch("/api/friends/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ receiverId }),
      });
      const data = await response.json();
      if (response.ok) {
        audioSynth.playSuccess("retro");
        setSuccessMsg(data.message || "Arkadaşlık isteği başarıyla gönderildi!");
        fetchSocialStatus(true);
      } else {
        audioSynth.playError();
        setError(data.error || "İstek gönderilemedi.");
      }
    } catch (err) {
      setError("Bağlantı hatası oluştu.");
    }
  };

  const handleRespondRequest = async (requestId: string, status: "accepted" | "declined") => {
    if (!token) return;
    setError("");
    setSuccessMsg("");
    try {
      const response = await fetch("/api/friends/respond", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ requestId, status }),
      });
      if (response.ok) {
        audioSynth.playSuccess(status === "accepted" ? "cosmic" : "retro");
        setSuccessMsg(status === "accepted" ? "Arkadaşlık isteği kabul edildi! 🎉" : "İstek reddedildi.");
        fetchSocialStatus(true);
        fetchUnreadCounts(true);
      } else {
        const data = await response.json();
        setError(data.error || "İşlem başarısız.");
      }
    } catch (err) {
      setError("Bağlantı hatası.");
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    if (!token) return;
    if (!window.confirm("Bu kişiyi arkadaşlarınızdan silmek istediğinize emin misiniz?")) return;
    setError("");
    setSuccessMsg("");
    try {
      const response = await fetch("/api/friends/remove", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ friendId }),
      });
      if (response.ok) {
        audioSynth.playClick();
        setSuccessMsg("Arkadaş başarıyla silindi.");
        if (activeChatFriend?.id === friendId) {
          setActiveChatFriend(null);
          setActiveSubTab("friends");
        }
        fetchSocialStatus(true);
      } else {
        const data = await response.json();
        setError(data.error || "Silme işlemi başarısız.");
      }
    } catch (err) {
      setError("Bağlantı hatası.");
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!token || !activeChatFriend || !newMessageText.trim()) return;

    setSendingMessage(true);
    const censoredContent = censorProfanity(newMessageText);
    const contentToSend = censoredContent;
    setNewMessageText(""); // Optimistic clear

    try {
      const response = await fetch("/api/messages/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ receiverId: activeChatFriend.id, content: contentToSend }),
      });
      if (response.ok) {
        const sentMsg = await response.json();
        setChatMessages(prev => [...prev, sentMsg]);
        audioSynth.playClick();
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 50);
      } else {
        const data = await response.json();
        setError(data.error || "Mesaj gönderilemedi.");
        setNewMessageText(contentToSend); // Restore text on failure
      }
    } catch (err) {
      setError("Mesaj gönderilemedi. Sunucu hatası.");
      setNewMessageText(contentToSend);
    } finally {
      setSendingMessage(false);
    }
  };

  const startChatWithFriend = (friend: User) => {
    audioSynth.playClick();
    setActiveChatFriend(friend);
    setChatMessages([]);
    fetchChatMessages(friend.id);
    setActiveSubTab("chat");
    // Clear unread immediately locally
    setUnreadCounts(prev => {
      const copy = { ...prev };
      delete copy[friend.id];
      return copy;
    });
  };

  // Helper to render beautiful user avatars consistently
  const renderUserAvatar = (user: User, sizeClass: string = "h-10 w-10 text-sm") => {
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
          <span className="leading-none select-none text-base">{avatar}</span>
        ) : (
          <span>{user.name.charAt(0).toUpperCase()}</span>
        )}
        {isPremiumUser && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-black text-neutral-950 border border-neutral-950 shadow-sm" title="Premium Üye">
            ★
          </span>
        )}
      </div>
    );
  };

  // Filter other users based on search query
  const filteredUsers = allUsers.filter(u => {
    const query = searchQuery.trim().toLowerCase();
    const cleanQuery = query.startsWith("@") ? query.slice(1) : query;
    return (
      u.name.toLowerCase().includes(cleanQuery) ||
      (u.username || "").toLowerCase().includes(cleanQuery)
    );
  });

  if (!currentUser) {
    return (
      <div className="mx-auto max-w-md bg-neutral-900/40 border border-neutral-850 p-8 rounded-3xl text-center shadow-xl space-y-6" id="social-unauth">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 text-red-400 mx-auto border border-red-500/20">
          <Users className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-extrabold text-white">Sosyal Kulübe Hoş Geldiniz!</h2>
          <p className="text-sm text-neutral-400 leading-relaxed">
            Arkadaş eklemek, kullanıcılar arası anlık özel mesajlaşmak ve canlı yeni mesaj bildirimleri almak için hemen giriş yapın veya kayıt olun.
          </p>
        </div>
        <button
          onClick={() => {
            onOpenAuth();
            audioSynth.playClick();
          }}
          className="w-full py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-sm font-bold text-white transition shadow-lg shadow-red-950/20 cursor-pointer"
        >
          Giriş Yap / Üye Ol
        </button>
      </div>
    );
  }

  return (
    <div className="w-full bg-neutral-900/30 border border-neutral-850/60 rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row min-h-[620px] max-h-[750px]" id="social-hub-container">
      
      {/* In-App Floating Notification Banner */}
      <AnimatePresence>
        {notificationBanner && (
          <motion.div
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 16 }}
            exit={{ opacity: 0, y: -40 }}
            className="fixed top-0 left-1/2 -translate-x-1/2 z-50 bg-amber-500 text-neutral-950 px-5 py-3 rounded-2xl font-bold shadow-xl border border-amber-400 flex items-center gap-2"
          >
            <MessageSquare className="h-4 w-4" />
            <span>{notificationBanner}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LEFT NAVIGATION / SIDEBAR */}
      <div className="w-full md:w-80 border-r border-neutral-850/80 bg-neutral-950/20 p-4 flex flex-col gap-4">
        
        {/* User Identity Banner */}
        <div className="flex items-center gap-3 p-3 bg-neutral-900/40 border border-neutral-850/40 rounded-2xl">
          {renderUserAvatar(currentUser, "h-11 w-11 text-base font-extrabold")}
          <div className="text-left min-w-0 flex-1">
            <h3 className="text-xs font-bold text-white truncate flex items-center gap-1">
              {currentUser.name}
              {(currentUser.isPremium || currentUser.role === "admin") && (
                <span className="text-[9px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1 rounded">PRO</span>
              )}
            </h3>
            <span className="text-[10px] text-neutral-500 truncate block">{currentUser.email}</span>
          </div>
          <button 
            onClick={() => {
              fetchSocialStatus();
              fetchUnreadCounts();
              audioSynth.playClick();
            }}
            className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition cursor-pointer"
            title="Yenile"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-red-500" : ""}`} />
          </button>
        </div>

        {/* Dynamic Category Navigation Buttons */}
        <div className="space-y-1.5 flex-1">
          <button
            onClick={() => { setActiveSubTab("friends"); audioSynth.playClick(); }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition text-left cursor-pointer ${
              activeSubTab === "friends"
                ? "bg-red-600 text-white"
                : "bg-neutral-900/20 text-neutral-400 hover:bg-neutral-900/60 hover:text-white"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Users className="h-4 w-4" />
              <span>Arkadaşlarım</span>
            </div>
            {friends.length > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${activeSubTab === "friends" ? "bg-white/20 text-white" : "bg-neutral-800 text-neutral-400"}`}>
                {friends.length}
              </span>
            )}
          </button>

          <button
            onClick={() => { setActiveSubTab("requests"); audioSynth.playClick(); }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition text-left cursor-pointer relative ${
              activeSubTab === "requests"
                ? "bg-red-600 text-white"
                : "bg-neutral-900/20 text-neutral-400 hover:bg-neutral-900/60 hover:text-white"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Clock className="h-4 w-4" />
              <span>İstekler</span>
            </div>
            {pendingReceived.length > 0 && (
              <span className="h-5 px-1.5 min-w-5 flex items-center justify-center rounded-full bg-amber-500 text-[10px] font-black text-neutral-950 animate-pulse">
                {pendingReceived.length}
              </span>
            )}
          </button>

          <button
            onClick={() => { setActiveSubTab("find"); audioSynth.playClick(); }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition text-left cursor-pointer ${
              activeSubTab === "find"
                ? "bg-red-600 text-white"
                : "bg-neutral-900/20 text-neutral-400 hover:bg-neutral-900/60 hover:text-white"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Search className="h-4 w-4" />
              <span>Kullanıcı Bul / Ekle</span>
            </div>
          </button>

          {/* Messages / Friends chat sidebar list */}
          <div className="pt-4 border-t border-neutral-850/60 space-y-2">
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block px-1 text-left">Özel Sohbetler</span>
            <div className="space-y-1 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin">
              {friends.length === 0 ? (
                <p className="text-[10px] text-neutral-500 italic p-2 text-left">Mesajlaşmak için önce arkadaş ekleyin.</p>
              ) : (
                friends.map(friend => {
                  const unread = unreadCounts[friend.id] || 0;
                  const isChattingWithThisUser = activeSubTab === "chat" && activeChatFriend?.id === friend.id;
                  return (
                    <button
                      key={friend.id}
                      onClick={() => startChatWithFriend(friend)}
                      className={`w-full flex items-center gap-2.5 p-2 rounded-xl transition text-left cursor-pointer ${
                        isChattingWithThisUser
                          ? "bg-neutral-800 border border-neutral-700 text-white"
                          : "hover:bg-neutral-900/50 text-neutral-400 hover:text-white"
                      }`}
                    >
                      {renderUserAvatar(friend, "h-8 w-8 text-xs")}
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-bold block truncate text-left">{friend.name}</span>
                        <span className="text-[10px] text-neutral-500 block truncate text-left">{friend.email}</span>
                      </div>
                      {unread > 0 && !isChattingWithThisUser && (
                        <span className="h-4 px-1.5 rounded-full bg-amber-500 text-[10px] font-black text-neutral-950 flex items-center justify-center shrink-0">
                          {unread}
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Bottom Banner */}
        <div className="p-3 bg-gradient-to-br from-amber-500/5 to-amber-500/10 border border-amber-500/15 rounded-2xl text-left">
          <div className="flex gap-2 items-start">
            <Sparkles className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <span className="text-[11px] font-bold text-amber-400 block">Sınırsız İletişim</span>
              <p className="text-[10px] text-neutral-400 leading-normal mt-0.5">
                Arkadaşlarınızla dilediğinizce mesajlaşın, anlık dönüştürme ipuçları paylaşın!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE CONTENT CONTAINER */}
      <div className="flex-1 bg-neutral-950/40 p-4 md:p-6 flex flex-col min-h-0">
        
        {/* Alerts / Error Messages */}
        {error && (
          <div className="mb-4 bg-red-950/30 border border-red-900/40 px-4 py-3 rounded-2xl text-red-400 text-xs flex items-center gap-2 text-left">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="mb-4 bg-emerald-950/30 border border-emerald-900/40 px-4 py-3 rounded-2xl text-emerald-400 text-xs flex items-center gap-2 text-left">
            <Check className="h-4 w-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* 1. MY FRIENDS TAB */}
        {activeSubTab === "friends" && (
          <div className="flex-1 flex flex-col space-y-4 text-left">
            <div>
              <h2 className="text-lg font-black text-white">Arkadaşlarım</h2>
              <p className="text-xs text-neutral-500">Eklediğiniz ve onaylanmış arkadaşlarınızın listesi.</p>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[480px] pr-1 space-y-2.5">
              {friends.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-center p-6 border border-dashed border-neutral-800 rounded-3xl space-y-3">
                  <Users className="h-10 w-10 text-neutral-700" />
                  <p className="text-xs text-neutral-400 max-w-xs">
                    Henüz hiç arkadaşınız yok. Diğer kullanıcıları arayıp eklemek için <strong>Kullanıcı Bul</strong> sekmesini kullanabilirsiniz.
                  </p>
                  <button
                    onClick={() => setActiveSubTab("find")}
                    className="px-4 py-2 bg-neutral-900 hover:bg-neutral-850 rounded-xl text-xs font-bold text-white border border-neutral-800 transition cursor-pointer"
                  >
                    Kullanıcı Ara
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {friends.map(friend => (
                    <div 
                      key={friend.id}
                      className="bg-neutral-900/50 border border-neutral-850/60 p-4 rounded-2xl flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {renderUserAvatar(friend, "h-10 w-10 text-sm")}
                        <div className="min-w-0 text-left">
                          <h4 className="text-sm font-bold text-white truncate flex items-center gap-1.5">
                            {friend.name}
                            {friend.badge === "altin" ? "🥇" : friend.badge === "gumus" ? "🥈" : friend.badge === "bronz" ? "🥉" : ""}
                          </h4>
                          {friend.username && (
                            <span className="text-[11px] text-amber-500/80 font-semibold block truncate">@{friend.username}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => startChatWithFriend(friend)}
                          className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                          title="Sohbet Başlat"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                          <span>Yaz</span>
                        </button>
                        <button
                          onClick={() => handleRemoveFriend(friend.id)}
                          className="p-2 rounded-xl bg-neutral-900 hover:bg-red-950/20 text-neutral-400 hover:text-red-400 border border-neutral-800 hover:border-red-900/30 transition cursor-pointer"
                          title="Arkadaşı Sil"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 2. FRIEND REQUESTS TAB */}
        {activeSubTab === "requests" && (
          <div className="flex-1 flex flex-col space-y-6 text-left">
            
            {/* Received Requests */}
            <div className="space-y-3">
              <div>
                <h3 className="text-base font-bold text-white">Gelen Arkadaşlık İstekleri</h3>
                <p className="text-xs text-neutral-500">Diğer kullanıcıların size gönderdiği istekler.</p>
              </div>

              <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                {pendingReceived.length === 0 ? (
                  <p className="text-xs text-neutral-500 italic p-3 bg-neutral-900/20 border border-neutral-850/40 rounded-2xl">
                    Bekleyen gelen istek bulunmuyor.
                  </p>
                ) : (
                  pendingReceived.map(req => (
                    req.sender && (
                      <div 
                        key={req.requestId}
                        className="bg-neutral-900/50 border border-neutral-850/60 p-3.5 rounded-2xl flex items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {renderUserAvatar(req.sender, "h-9 w-9 text-xs")}
                          <div className="min-w-0 text-left">
                            <span className="text-xs font-bold text-white flex items-center gap-1.5 truncate">
                              {req.sender.name}
                              {req.sender.badge === "altin" ? "🥇" : req.sender.badge === "gumus" ? "🥈" : req.sender.badge === "bronz" ? "🥉" : ""}
                            </span>
                            {req.sender.username && (
                              <span className="text-[10px] text-amber-500/80 font-semibold block truncate">@{req.sender.username}</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => handleRespondRequest(req.requestId, "accepted")}
                            className="p-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-neutral-950 transition cursor-pointer flex items-center gap-1 text-xs font-extrabold px-3 py-1.5"
                          >
                            <Check className="h-4 w-4" /> Kabul Et
                          </button>
                          <button
                            onClick={() => handleRespondRequest(req.requestId, "declined")}
                            className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-850 text-red-400 border border-neutral-800 transition cursor-pointer flex items-center gap-1 text-xs font-semibold px-3 py-1.5"
                          >
                            <X className="h-4 w-4" /> Reddet
                          </button>
                        </div>
                      </div>
                    )
                  ))
                )}
              </div>
            </div>

            {/* Sent Requests */}
            <div className="space-y-3 pt-4 border-t border-neutral-850/60">
              <div>
                <h3 className="text-base font-bold text-white">Giden Arkadaşlık İstekleri</h3>
                <p className="text-xs text-neutral-500">Sizin gönderdiğiniz, onay bekleyen istekler.</p>
              </div>

              <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                {pendingSent.length === 0 ? (
                  <p className="text-xs text-neutral-500 italic p-3 bg-neutral-900/20 border border-neutral-850/40 rounded-2xl">
                    Bekleyen giden istek bulunmuyor.
                  </p>
                ) : (
                  pendingSent.map(req => (
                    req.receiver && (
                      <div 
                        key={req.requestId}
                        className="bg-neutral-900/40 border border-neutral-850/40 p-3 rounded-2xl flex items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {renderUserAvatar(req.receiver, "h-8 w-8 text-xs")}
                          <div className="min-w-0 text-left">
                            <span className="text-xs font-bold text-white flex items-center gap-1.5 truncate">
                              {req.receiver.name}
                              {req.receiver.badge === "altin" ? "🥇" : req.receiver.badge === "gumus" ? "🥈" : req.receiver.badge === "bronz" ? "🥉" : ""}
                            </span>
                            {req.receiver.username && (
                              <span className="text-[10px] text-amber-500/80 font-semibold block truncate">@{req.receiver.username}</span>
                            )}
                          </div>
                        </div>

                        <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-full">
                          Onay Bekliyor
                        </span>
                      </div>
                    )
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* 3. FIND & ADD FRIENDS TAB */}
        {activeSubTab === "find" && (
          <div className="flex-1 flex flex-col space-y-4 text-left">
            <div>
              <h2 className="text-lg font-black text-white">Kullanıcı Bul</h2>
              <p className="text-xs text-neutral-500">Sitedeki diğer kullanıcıları kullanıcı adı ile aratıp ekleyin.</p>
            </div>

            {/* Search Box */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
              <input
                type="text"
                placeholder="Kullanıcı adı ile ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-neutral-900 border border-neutral-850 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-red-500/50"
              />
            </div>

            {/* Search Results */}
            <div className="flex-1 overflow-y-auto max-h-[380px] pr-1 space-y-2">
              {filteredUsers.length === 0 ? (
                <p className="text-xs text-neutral-500 italic p-6 text-center">Aradığınız kriterlere uygun kullanıcı bulunamadı.</p>
              ) : (
                filteredUsers.map(user => {
                  // Check status
                  const isFriend = friends.some(f => f.id === user.id);
                  const isSentPending = pendingSent.some(p => p.receiver?.id === user.id);
                  const isReceivedPending = pendingReceived.some(p => p.sender?.id === user.id);

                  return (
                    <div 
                      key={user.id}
                      className="bg-neutral-900/50 border border-neutral-850/60 p-3 rounded-2xl flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {renderUserAvatar(user, "h-9 w-9 text-xs")}
                        <div className="min-w-0 text-left">
                          <span className="text-xs font-bold text-white flex items-center gap-1.5 truncate">
                            {user.name}
                            {user.badge === "altin" ? "🥇" : user.badge === "gumus" ? "🥈" : user.badge === "bronz" ? "🥉" : ""}
                          </span>
                          {user.username && (
                            <span className="text-[10px] text-amber-500/80 font-semibold block truncate">@{user.username}</span>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0">
                        {isFriend ? (
                          <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-neutral-900 text-emerald-400 text-xs font-bold border border-neutral-800">
                            <Check className="h-3.5 w-3.5" />
                            <span>Arkadaş</span>
                          </div>
                        ) : isSentPending ? (
                          <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1.5 rounded-xl">
                            İstek İletildi
                          </span>
                        ) : isReceivedPending ? (
                          <button
                            onClick={() => setActiveSubTab("requests")}
                            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-neutral-950 text-xs font-bold transition cursor-pointer"
                          >
                            İsteği Yanıtla
                          </button>
                        ) : (
                          <button
                            onClick={() => handleSendRequest(user.id)}
                            className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                          >
                            <UserPlus className="h-3.5 w-3.5" />
                            <span>Ekle</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* 4. PRIVATE CHAT CONTAINER */}
        {activeSubTab === "chat" && activeChatFriend && (
          <div className="flex-1 flex flex-col min-h-0 bg-neutral-900/20 border border-neutral-850/40 rounded-2xl overflow-hidden">
            
            {/* Chat Window Header */}
            <div className="bg-neutral-900/60 border-b border-neutral-850 p-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {renderUserAvatar(activeChatFriend, "h-9 w-9 text-xs")}
                <div className="text-left min-w-0">
                  <h3 className="text-xs font-bold text-white truncate">{activeChatFriend.name}</h3>
                  <span className="text-[10px] text-neutral-500 block truncate">Özel Sohbet</span>
                </div>
              </div>

              <button
                onClick={() => handleRemoveFriend(activeChatFriend.id)}
                className="text-[10px] font-semibold text-neutral-500 hover:text-red-400 px-2 py-1 rounded hover:bg-red-950/20 transition cursor-pointer"
                title="Arkadaşlıktan Çıkar"
              >
                Arkadaşlıktan Çıkar
              </button>
            </div>

            {/* Chat Message Stream */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[250px] max-h-[400px] scrollbar-thin">
              {chatMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
                  <MessageSquare className="h-8 w-8 text-neutral-700" />
                  <p className="text-xs text-neutral-400">Sohbeti başlatın!</p>
                  <span className="text-[10px] text-neutral-500 leading-normal max-w-xs block">
                    Gönderdiğiniz mesajlar şifreli olarak veritabanında saklanır ve anında teslim edilir.
                  </span>
                </div>
              ) : (
                chatMessages.map(msg => {
                  const isMe = msg.senderId === currentUser.id;
                  const time = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  
                  return (
                    <div 
                      key={msg.id} 
                      className={`flex flex-col max-w-[75%] ${isMe ? "ml-auto items-end" : "mr-auto items-start"}`}
                    >
                      <div className={`p-3 rounded-2xl text-xs leading-relaxed text-left break-words ${
                        isMe 
                          ? "bg-red-600 text-white rounded-br-none" 
                          : "bg-neutral-900 text-neutral-200 border border-neutral-800 rounded-bl-none"
                      }`}>
                        {msg.content}
                      </div>
                      <span className="text-[9px] text-neutral-500 mt-1 flex items-center gap-1 px-1">
                        {time}
                        {isMe && (
                          <span className={msg.isRead ? "text-emerald-500" : "text-neutral-600"}>
                            {msg.isRead ? "✓✓ Görüldü" : "✓ İletildi"}
                          </span>
                        )}
                      </span>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Message Input form */}
            <div className="bg-neutral-900/40 border-t border-neutral-850/60 px-3 py-1.5 text-[10px] text-neutral-400 flex items-center justify-center gap-1 font-semibold select-none">
              <span>🔒 Sohbette küfürler ve argo kelimeler otomatik olarak sansürlenir.</span>
            </div>
            <form onSubmit={handleSendMessage} className="p-3 bg-neutral-900/60 border-t border-neutral-850/40 flex gap-2">
              <input
                type="text"
                placeholder="Mesajınızı buraya yazın..."
                value={newMessageText}
                onChange={(e) => setNewMessageText(e.target.value)}
                className="flex-1 bg-neutral-950 border border-neutral-850/80 rounded-xl px-3.5 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-red-500/50"
                disabled={sendingMessage}
              />
              <button
                type="submit"
                disabled={sendingMessage || !newMessageText.trim()}
                className="h-9 w-9 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white rounded-xl flex items-center justify-center shrink-0 transition cursor-pointer"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
