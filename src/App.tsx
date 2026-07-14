import React, { useState, useEffect, useRef } from "react";
import Header from "./components/Header";
import Converter from "./components/Converter";
import Announcements from "./components/Announcements";
import HistoryList from "./components/HistoryList";
import AdminPanel from "./components/AdminPanel";
import AdvertiseForm from "./components/AdvertiseForm";
import AuthModal from "./components/AuthModal";
import PremiumModal from "./components/PremiumModal";
import BanAppeal from "./components/BanAppeal";
import SocialHub from "./components/SocialHub";
import { Leaderboard } from "./components/Leaderboard";
import { UserProfile } from "./components/UserProfile";
import LiveSupport from "./components/LiveSupport";
import { User, Announcement, ConversionRecord } from "./types";
import { Sparkles, Play, Award, Github, Bell, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { audioSynth } from "./lib/audio";

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("converter");
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [conversions, setConversions] = useState<ConversionRecord[]>([]);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [premiumModalOpen, setPremiumModalOpen] = useState(false);
  const [initialPremiumPlan, setInitialPremiumPlan] = useState<"monthly" | "yearly">("monthly");
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [isBannedView, setIsBannedView] = useState(false);
  const [bannedUserEmail, setBannedUserEmail] = useState("");
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [activeToast, setActiveToast] = useState<Announcement | null>(null);

  const seenAnnouncementIdsRef = useRef<Set<string>>(new Set());
  const isFirstLoadRef = useRef<boolean>(true);

  const checkIpBanStatus = async () => {
    try {
      const response = await fetch("/api/auth/check-ip");
      if (response.ok) {
        const data = await response.json();
        if (data.isBanned) {
          setBannedUserEmail(data.email || "");
          setIsBannedView(true);
          localStorage.setItem("yt_converter_banned", "true");
          localStorage.setItem("yt_converter_banned_email", data.email || "");
        } else {
          localStorage.removeItem("yt_converter_banned");
          localStorage.removeItem("yt_converter_banned_email");
          setIsBannedView(false);
        }
      }
    } catch (e) {}
  };

  // Load token from localStorage and fetch current user
  useEffect(() => {
    const isBannedLocally = localStorage.getItem("yt_converter_banned") === "true";
    if (isBannedLocally) {
      setBannedUserEmail(localStorage.getItem("yt_converter_banned_email") || "");
      setIsBannedView(true);
    }

    checkIpBanStatus();

    const savedToken = localStorage.getItem("yt_converter_token");
    if (savedToken) {
      setToken(savedToken);
      fetchUserData(savedToken);
    }
    fetchAnnouncements();
    fetchConfig();
    fetchHistory(savedToken || undefined);
  }, []);

  // Poll announcements every 4 seconds to show live read count updates
  useEffect(() => {
    const interval = setInterval(() => {
      fetchAnnouncements();
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const fetchUnreadCount = async (authToken?: string) => {
    const activeToken = authToken || token;
    if (!activeToken) return;
    try {
      const response = await fetch("/api/messages/unread", {
        headers: {
          Authorization: `Bearer ${activeToken}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setUnreadMessagesCount(data.totalUnread || 0);
      }
    } catch (e) {}
  };

  // Poll unread messages count every 4 seconds when logged in
  useEffect(() => {
    if (!token) {
      setUnreadMessagesCount(0);
      return;
    }
    fetchUnreadCount(token);
    const interval = setInterval(() => {
      fetchUnreadCount(token);
    }, 4000);
    return () => clearInterval(interval);
  }, [token]);

  const fetchConfig = async () => {
    try {
      const response = await fetch("/api/premium/config");
      if (response.ok) {
        const data = await response.json();
        setIsMaintenanceMode(!!data.maintenanceMode);
        // Refresh announcements too since toggling maintenance mode may add/remove one
        fetchAnnouncements();
      }
    } catch (e) {}
  };

  const fetchUserData = async (authToken: string) => {
    try {
      const response = await fetch("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      if (response.ok) {
        const user = await response.json();
        setCurrentUser(user);
        // Clean ban state just in case
        localStorage.removeItem("yt_converter_banned");
        localStorage.removeItem("yt_converter_banned_email");
      } else {
        const data = await response.json().catch(() => ({}));
        if (response.status === 403 && data.isBanned) {
          const email = data.email || "";
          setBannedUserEmail(email);
          setIsBannedView(true);
          localStorage.setItem("yt_converter_banned", "true");
          localStorage.setItem("yt_converter_banned_email", email);
        } else {
          // Token is invalid/expired
          handleLogout();
        }
      }
    } catch (e) {
      // Offline/server loading issue
    }
  };

  const fetchAnnouncements = async () => {
    try {
      const response = await fetch("/api/announcements");
      if (response.ok) {
        const data = await response.json();
        
        if (isFirstLoadRef.current) {
          const ids = new Set(data.map((ann: Announcement) => ann.id));
          seenAnnouncementIdsRef.current = ids;
          isFirstLoadRef.current = false;
        } else {
          const newAnnouncements = data.filter((ann: Announcement) => !seenAnnouncementIdsRef.current.has(ann.id));
          if (newAnnouncements.length > 0) {
            const latestNew = newAnnouncements[newAnnouncements.length - 1];
            setActiveToast(latestNew);
            
            newAnnouncements.forEach((ann: Announcement) => seenAnnouncementIdsRef.current.add(ann.id));
            audioSynth.playSuccess("cosmic");
          }
        }
        
        setAnnouncements(data);
      }
    } catch (e) {}
  };

  useEffect(() => {
    if (activeToast) {
      const timer = setTimeout(() => {
        setActiveToast(null);
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [activeToast]);

  const fetchHistory = async (authToken?: string) => {
    const activeToken = authToken || token;
    try {
      const response = await fetch("/api/convert/history", {
        headers: activeToken ? { Authorization: `Bearer ${activeToken}` } : {},
      });
      if (response.ok) {
        const data = await response.json();
        setConversions(data);
      }
    } catch (e) {}
  };

  const handleLoginSuccess = (newToken: string, user: User) => {
    setToken(newToken);
    setCurrentUser(user);
    localStorage.setItem("yt_converter_token", newToken);
    fetchHistory(newToken); // Refresh history list for user
  };

  const handleLogout = () => {
    setToken(null);
    setCurrentUser(null);
    localStorage.removeItem("yt_converter_token");
    setActiveTab("converter"); // Redirect out of admin tab if logged out
    fetchHistory(); // Reload history for guests
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col selection:bg-red-500 selection:text-white relative overflow-x-hidden w-full" id="main-app-container">
      {/* Mesh Background Graphic */}
      <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#1f293710_1px,transparent_1px),linear-gradient(to_bottom,#1f293710_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />
      <div className="absolute top-0 left-1/4 h-[300px] w-[500px] rounded-full bg-red-950/10 blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 h-[250px] w-[400px] rounded-full bg-red-900/5 blur-[100px] pointer-events-none" />

      {/* Navigation Header */}
      <Header
        currentUser={currentUser}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAuth={() => setAuthModalOpen(true)}
        onOpenPremium={() => { setInitialPremiumPlan("monthly"); setPremiumModalOpen(true); }}
        onLogout={handleLogout}
        announcementCount={announcements.length}
        isMaintenanceMode={isMaintenanceMode}
        conversionsCount={conversions.length}
        onUpdateUser={(updated) => setCurrentUser(updated)}
        unreadMessagesCount={unreadMessagesCount}
      />

      {/* Main Panel Content with Slide Transitions */}
      <main className="flex-1 relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6" id="app-main-content">
        <AnimatePresence mode="wait">
          {isBannedView ? (
            <motion.div
              key="ban-appeal-tab"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2 }}
            >
              <BanAppeal
                initialEmail={bannedUserEmail}
                onClose={() => {
                  setIsBannedView(false);
                  setBannedUserEmail("");
                  handleLogout();
                  localStorage.removeItem("yt_converter_banned");
                  localStorage.removeItem("yt_converter_banned_email");
                }}
              />
            </motion.div>
          ) : (
            <>
              {activeTab === "converter" && (
                <motion.div
                  key="converter-tab"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                >
                  <Converter 
                    token={token} 
                    currentUser={currentUser}
                    onSuccessConversion={() => fetchHistory()} 
                    onOpenPremium={(plan) => { if (plan) setInitialPremiumPlan(plan); setPremiumModalOpen(true); }} 
                    isMaintenanceMode={isMaintenanceMode}
                  />
                </motion.div>
              )}

              {activeTab === "announcements" && (
                <motion.div
                  key="announcements-tab"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <Announcements
                    currentUser={currentUser}
                    announcements={announcements}
                    onRefresh={fetchAnnouncements}
                    token={token}
                  />
                </motion.div>
              )}

              {activeTab === "admin" && currentUser?.role === "admin" && (
                <motion.div
                  key="admin-tab"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <AdminPanel currentUser={currentUser} token={token} onConfigChange={fetchConfig} />
                </motion.div>
              )}

              {activeTab === "advertise" && (
                <motion.div
                  key="advertise-tab"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                >
                  <AdvertiseForm token={token} />
                </motion.div>
              )}

              {activeTab === "social" && (
                <motion.div
                  key="social-tab"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <SocialHub
                    currentUser={currentUser}
                    token={token}
                    onOpenAuth={() => setAuthModalOpen(true)}
                    onOpenPremium={() => setPremiumModalOpen(true)}
                    onUnreadChange={(count) => setUnreadMessagesCount(count)}
                  />
                </motion.div>
              )}

              {activeTab === "leaderboard" && (
                <motion.div
                  key="leaderboard-tab"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <Leaderboard />
                </motion.div>
              )}

              {activeTab === "profile" && (
                <motion.div
                  key="profile-tab"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <UserProfile
                    currentUser={currentUser}
                    token={token}
                    conversionsCount={conversions.length}
                    onUpdateUser={(updated) => setCurrentUser(updated)}
                    onOpenPremium={() => { setInitialPremiumPlan("monthly"); setPremiumModalOpen(true); }}
                    onOpenAuth={() => setAuthModalOpen(true)}
                  />
                </motion.div>
              )}
            </>
          )}
        </AnimatePresence>
      </main>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={handleLoginSuccess}
        onBannedDetected={(email) => {
          setBannedUserEmail(email);
          setIsBannedView(true);
          localStorage.setItem("yt_converter_banned", "true");
          localStorage.setItem("yt_converter_banned_email", email);
        }}
      />

      {/* Premium Subscription Modal */}
      <PremiumModal
        isOpen={premiumModalOpen}
        onClose={() => setPremiumModalOpen(false)}
        currentUser={currentUser}
        token={token}
        onSuccess={(updatedUser) => {
          setCurrentUser(updatedUser);
        }}
        onOpenAuth={() => setAuthModalOpen(true)}
        initialPlan={initialPremiumPlan}
      />

      {/* Footer Branding */}
      <footer className="border-t border-neutral-900 bg-neutral-950/40 relative z-10 py-8 text-neutral-600 text-xs" id="app-footer">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-red-500" />
            <span>İnanmp3gg © 2026 • Tüm Hakları Saklıdır.</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Award className="h-3.5 w-3.5 text-amber-500" /> Kurucu: İnan
            </span>
            <span>•</span>
            <span className="text-neutral-500">Reklamsız & Yüksek Kalite Dönüştürücü</span>
          </div>
        </div>
      </footer>

      {/* Toast Notification for New Announcement */}
      <AnimatePresence>
        {activeToast && (
          <motion.div
            initial={{ opacity: 0, x: -50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -50, scale: 0.9 }}
            className="fixed bottom-6 left-6 z-50 max-w-sm w-full bg-neutral-900/95 border border-red-600/30 rounded-2xl p-4 shadow-2xl backdrop-blur-md flex gap-3"
            id="new-announcement-toast"
          >
            {/* Category Icon Badge */}
            <div className="h-10 w-10 rounded-full bg-red-600/10 border border-red-500/20 flex items-center justify-center text-red-500 shrink-0">
              <Bell className="h-5 w-5 animate-bounce" />
            </div>

            {/* Title & Body */}
            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-red-500">
                  {activeToast.category || "YENİ DUYURU"} 📢
                </span>
                <span className="text-[9px] text-neutral-500 font-mono">Şimdi</span>
              </div>
              <h4 className="text-sm font-bold text-white mt-0.5 truncate leading-snug">
                {activeToast.title}
              </h4>
              <p className="text-xs text-neutral-400 mt-1 line-clamp-2 leading-relaxed">
                {activeToast.content}
              </p>
              
              <button
                onClick={() => {
                  setActiveTab("announcements");
                  setActiveToast(null);
                  audioSynth.playClick();
                }}
                className="mt-2.5 text-[11px] font-black uppercase text-red-400 hover:text-red-300 transition-colors flex items-center gap-1 cursor-pointer"
              >
                Şimdi Oku ⚡
              </button>
            </div>

            {/* Close Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveToast(null);
                audioSynth.playClick();
              }}
              className="text-neutral-500 hover:text-neutral-200 transition-colors shrink-0 self-start p-1 hover:bg-neutral-800 rounded-lg cursor-pointer"
              id="close-announcement-toast"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Persistent Live Support Chat Line */}
      <LiveSupport
        currentUser={currentUser}
        onOpenPremium={() => { setInitialPremiumPlan("monthly"); setPremiumModalOpen(true); }}
      />
    </div>
  );
}
