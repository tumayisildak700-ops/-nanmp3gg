import React, { useState, useEffect } from "react";
import { 
  ShieldAlert, 
  Users, 
  Award, 
  Lock, 
  UserCheck, 
  ShieldPlus, 
  ShieldMinus, 
  Search, 
  RefreshCw, 
  Layers,
  TrendingUp,
  DollarSign,
  Download,
  Music,
  Video,
  Star,
  Sparkles,
  Check,
  AlertCircle,
  Clock,
  ExternalLink,
  Megaphone,
  Ban,
  ShieldCheck,
  Trash2,
  Plus,
  Activity,
  FileText,
  PieChart,
  Info,
  Globe,
  Network,
  Settings,
  Database,
  Edit,
  Headphones,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { User, ConversionRecord, Advertisement } from "../types";

interface AdminPanelProps {
  currentUser: User | null;
  token: string | null;
  onConfigChange?: () => void;
}

interface AdminStats {
  totalUsers: number;
  premiumUsers: number;
  totalConversions: number;
  completedConversions: number;
  processingConversions: number;
  estimatedMonthlyRevenue: number;
}

export default function AdminPanel({ currentUser, token, onConfigChange }: AdminPanelProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [conversions, setConversions] = useState<ConversionRecord[]>([]);
  const [advertisements, setAdvertisements] = useState<Advertisement[]>([]);
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    premiumUsers: 0,
    totalConversions: 0,
    completedConversions: 0,
    processingConversions: 0,
    estimatedMonthlyRevenue: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [monthlyPriceInput, setMonthlyPriceInput] = useState<string>("49");
  const [savingPrice, setSavingPrice] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [updatingMaintenance, setUpdatingMaintenance] = useState(false);

  // Bank Configuration States
  const [adminBankDetails, setAdminBankDetails] = useState({
    bankName: "Garanti BBVA",
    iban: "TR93 0006 2000 0001 2345 6789 01",
    accountHolder: "Tümay Işıldak"
  });
  const [savingBank, setSavingBank] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [banningUserId, setBanningUserId] = useState<string | null>(null);
  const [togglingRoleId, setTogglingRoleId] = useState<string | null>(null);

  // Ban Appeals States
  const [banAppeals, setBanAppeals] = useState<any[]>([]);
  const [resolvingAppealId, setResolvingAppealId] = useState<string | null>(null);

  // Announcements Management States
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [newAnnTitle, setNewAnnTitle] = useState("");
  const [newAnnContent, setNewAnnContent] = useState("");
  const [newAnnCategory, setNewAnnCategory] = useState("Duyuru");
  const [newAnnIsPinned, setNewAnnIsPinned] = useState(false);
  const [creatingAnnouncement, setCreatingAnnouncement] = useState(false);
  const [newAnnStatus, setNewAnnStatus] = useState<"published" | "draft" | "scheduled">("published");
  const [newAnnScheduledAt, setNewAnnScheduledAt] = useState("");

  // Editing Announcement States
  const [editingAnn, setEditingAnn] = useState<any | null>(null);
  const [editAnnTitle, setEditAnnTitle] = useState("");
  const [editAnnContent, setEditAnnContent] = useState("");
  const [editAnnCategory, setEditAnnCategory] = useState("Duyuru");
  const [editAnnIsPinned, setEditAnnIsPinned] = useState(false);
  const [editAnnStatus, setEditAnnStatus] = useState<"published" | "draft" | "scheduled">("published");
  const [editAnnScheduledAt, setEditAnnScheduledAt] = useState("");
  const [updatingAnnouncement, setUpdatingAnnouncement] = useState(false);

  // IP Ban Management States
  const [bannedIpsList, setBannedIpsList] = useState<string[]>([]);
  const [ipMapping, setIpMapping] = useState<Record<string, string>>({});
  const [newIpInput, setNewIpInput] = useState("");
  const [banningIp, setBanningIp] = useState(false);

  // Sub-tabs within admin panel
  const [activeSubTab, setActiveSubTab] = useState<"users" | "conversions" | "ads" | "appeals" | "announcements" | "ipbans" | "analytics" | "system" | "support" | "censorship">("users");

  // Censored Words States
  const [censoredWordsList, setCensoredWordsList] = useState<string[]>([]);
  const [newCensoredWord, setNewCensoredWord] = useState("");
  const [savingCensoredWords, setSavingCensoredWords] = useState(false);
  const [loadingCensoredWords, setLoadingCensoredWords] = useState(false);

  // Live Support States
  const [supportSessions, setSupportSessions] = useState<any[]>([]);
  const [selectedSupportSessionId, setSelectedSupportSessionId] = useState<string | null>(null);
  const [supportMessages, setSupportMessages] = useState<any[]>([]);
  const [supportReplyInput, setSupportReplyInput] = useState("");
  const [loadingSupport, setLoadingSupport] = useState(false);
  const [supportStartHour, setSupportStartHour] = useState("09:00");
  const [supportEndHour, setSupportEndHour] = useState("18:00");
  const [supportEnabled, setSupportEnabled] = useState(true);
  const [savingSupportConfig, setSavingSupportConfig] = useState(false);

  // System Management States
  const [systemLogs, setSystemLogs] = useState<any[]>([]);
  const [dbInfo, setDbInfo] = useState<{ dbSize: number; sessionCount: number; dbPath: string } | null>(null);
  const [cleaningConversions, setCleaningConversions] = useState(false);
  const [clearingLogs, setClearingLogs] = useState(false);

  const SUPER_ADMIN_EMAIL = "tumayisildak700@gmail.com";

  const fetchPricing = async () => {
    try {
      const res = await fetch("/api/premium/config");
      if (res.ok) {
        const data = await res.json();
        setMonthlyPriceInput(data.premiumMonthlyPrice.toString());
        setMaintenanceMode(!!data.maintenanceMode);
      }
    } catch (e) {}
  };

  const fetchBankDetails = async () => {
    try {
      const res = await fetch("/api/advertisements/bank-details");
      if (res.ok) {
        const data = await res.json();
        setAdminBankDetails({
          bankName: data.bankName || "",
          iban: data.iban || "",
          accountHolder: data.accountHolder || ""
        });
      }
    } catch (e) {}
  };

  const fetchSupportConfig = async () => {
    try {
      const res = await fetch("/api/support/status");
      if (res.ok) {
        const data = await res.json();
        setSupportStartHour(data.supportStartHour || "09:00");
        setSupportEndHour(data.supportEndHour || "18:00");
        setSupportEnabled(data.supportEnabled !== false);
      }
    } catch (e) {
      console.error("Support config fetch error:", e);
    }
  };

  const handleSaveSupportConfig = async () => {
    if (!token) return;
    setSavingSupportConfig(true);
    setError("");
    setSuccessMsg("");
    try {
      const res = await fetch("/api/admin/support/config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          supportStartHour,
          supportEndHour,
          supportEnabled
        })
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg("Canlı destek çalışma saatleri ve durum ayarları başarıyla kaydedildi kanka! ⚡");
        setTimeout(() => setSuccessMsg(""), 4000);
      } else {
        setError(data.error || "Ayarlar kaydedilirken hata oluştu.");
        setTimeout(() => setError(""), 4000);
      }
    } catch (e) {
      console.error("Save support config error:", e);
      setError("Ayarlar kaydedilirken sunucu hatası oluştu kanka.");
      setTimeout(() => setError(""), 4000);
    } finally {
      setSavingSupportConfig(false);
    }
  };

  const fetchBanAppeals = async () => {
    try {
      const res = await fetch("/api/admin/ban-appeals", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setBanAppeals(data);
      }
    } catch (e) {}
  };

  const fetchSystemData = async () => {
    try {
      const logsRes = await fetch("/api/admin/system/logs", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setSystemLogs(logsData);
      }

      const dbRes = await fetch("/api/admin/system/db-info", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (dbRes.ok) {
        const dbData = await dbRes.json();
        setDbInfo(dbData);
      }
    } catch (e) {}
  };

  const handleClearLogs = async () => {
    if (!confirm("Tüm sistem işlem günlüklerini sıfırlamak istediğinizden emin misiniz?")) return;
    setClearingLogs(true);
    setError("");
    setSuccessMsg("");
    try {
      const res = await fetch("/api/admin/system/clear-logs", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(data.message || "İşlem günlükleri temizlendi.");
        fetchSystemData();
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      setError(err.message || "Günlükler temizlenirken hata oluştu.");
    } finally {
      setClearingLogs(false);
    }
  };

  const handleCleanConversions = async () => {
    if (!confirm("Dönüştürme geçmişini optimize etmek ve eski/başarısız kayıtları veritabanından temizlemek istediğinizden emin misiniz?")) return;
    setCleaningConversions(true);
    setError("");
    setSuccessMsg("");
    try {
      const res = await fetch("/api/admin/system/clean-conversions", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(data.message || "Veritabanı optimize edildi.");
        fetchSystemData();
        fetchStats();
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      setError(err.message || "Veritabanı temizlenirken hata oluştu.");
    } finally {
      setCleaningConversions(false);
    }
  };

  const handleResolveAppeal = async (appealId: string, action: "approve" | "reject") => {
    setResolvingAppealId(appealId);
    setError("");
    setSuccessMsg("");

    try {
      const response = await fetch(`/api/admin/ban-appeals/${appealId}/resolve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "İşlem gerçekleştirilemedi.");
      }

      setSuccessMsg(data.message || "İtiraz başarıyla sonuçlandırıldı.");
      fetchBanAppeals();
      fetchUsers();
      fetchStats();
    } catch (err: any) {
      setError(err.message || "Hata oluştu.");
    } finally {
      setResolvingAppealId(null);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/admin/stats", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {}
  };

  const fetchConversions = async () => {
    try {
      const response = await fetch("/api/convert/history", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setConversions(data);
      }
    } catch (e) {}
  };

  const fetchAdvertisements = async () => {
    try {
      const response = await fetch("/api/admin/advertisements", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setAdvertisements(data);
      }
    } catch (e) {}
  };

  const fetchUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/users", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error("Kullanıcı listesi alınamadı.");
      }
      const data = await response.json();
      setUsers(data);
    } catch (err: any) {
      setError(err.message || "Bir bağlantı hatası oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const fetchAnnouncements = async () => {
    try {
      const res = await fetch("/api/admin/announcements", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setAnnouncements(data);
      }
    } catch (e) {}
  };

  const fetchIpBans = async () => {
    try {
      const res = await fetch("/api/admin/ip-bans", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setBannedIpsList(data.bannedIps || []);
        setIpMapping(data.ipMapping || {});
      }
    } catch (e) {}
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnnTitle.trim() || !newAnnContent.trim()) return;
    setCreatingAnnouncement(true);
    setError("");
    setSuccessMsg("");

    try {
      const response = await fetch("/api/announcements", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: newAnnTitle,
          content: newAnnContent,
          category: newAnnCategory,
          isPinned: newAnnIsPinned,
          status: newAnnStatus,
          scheduledAt: newAnnStatus === "scheduled" ? newAnnScheduledAt : null,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setSuccessMsg("Duyuru başarıyla oluşturuldu.");
        setNewAnnTitle("");
        setNewAnnContent("");
        setNewAnnCategory("Duyuru");
        setNewAnnIsPinned(false);
        setNewAnnStatus("published");
        setNewAnnScheduledAt("");
        fetchAnnouncements();
        onConfigChange?.();
      } else {
        throw new Error(data.error || "Duyuru eklenemedi.");
      }
    } catch (err: any) {
      setError(err.message || "Duyuru eklenirken hata oluştu.");
    } finally {
      setCreatingAnnouncement(false);
    }
  };

  const handleUpdateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAnn) return;
    if (!editAnnTitle.trim() || !editAnnContent.trim()) return;
    setUpdatingAnnouncement(true);
    setError("");
    setSuccessMsg("");

    try {
      const response = await fetch(`/api/admin/announcements/${editingAnn.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: editAnnTitle,
          content: editAnnContent,
          category: editAnnCategory,
          isPinned: editAnnIsPinned,
          status: editAnnStatus,
          scheduledAt: editAnnStatus === "scheduled" ? editAnnScheduledAt : null,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setSuccessMsg("Duyuru başarıyla güncellendi kanka! 🎉");
        setEditingAnn(null);
        fetchAnnouncements();
        onConfigChange?.();
      } else {
        throw new Error(data.error || "Duyuru güncellenemedi.");
      }
    } catch (err: any) {
      setError(err.message || "Duyuru güncellenirken hata oluştu.");
    } finally {
      setUpdatingAnnouncement(false);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    setError("");
    setSuccessMsg("");
    try {
      const response = await fetch(`/api/announcements/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (response.ok) {
        setSuccessMsg("Duyuru başarıyla silindi.");
        fetchAnnouncements();
        onConfigChange?.();
      } else {
        throw new Error(data.error || "Duyuru silinemedi.");
      }
    } catch (err: any) {
      setError(err.message || "Silme işlemi sırasında hata oluştu.");
    }
  };

  const handleIncrementReadCount = async (id: string, amount: number) => {
    setError("");
    setSuccessMsg("");
    try {
      const response = await fetch(`/api/admin/announcements/${id}/increment-read-count`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount }),
      });
      const data = await response.json();
      if (response.ok) {
        setSuccessMsg(`Duyuru okuma sayısı ${amount} artırıldı kanka!`);
        fetchAnnouncements();
        onConfigChange?.();
      } else {
        throw new Error(data.error || "Okuma sayısı artırılamadı.");
      }
    } catch (err: any) {
      setError(err.message || "Hata oluştu.");
    }
  };

  const handleBanIp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIpInput.trim()) return;
    setBanningIp(true);
    setError("");
    setSuccessMsg("");

    try {
      const response = await fetch("/api/admin/ip-bans", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ip: newIpInput }),
      });

      const data = await response.json();
      if (response.ok) {
        setSuccessMsg("IP adresi başarıyla engellendi.");
        setNewIpInput("");
        fetchIpBans();
      } else {
        throw new Error(data.error || "IP engellenemedi.");
      }
    } catch (err: any) {
      setError(err.message || "Hata oluştu.");
    } finally {
      setBanningIp(false);
    }
  };

  const handleUnbanIp = async (ip: string) => {
    setError("");
    setSuccessMsg("");
    try {
      const response = await fetch(`/api/admin/ip-bans/${encodeURIComponent(ip)}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (response.ok) {
        setSuccessMsg("IP adresinin engeli kaldırıldı.");
        fetchIpBans();
      } else {
        throw new Error(data.error || "IP engeli kaldırılamadı.");
      }
    } catch (err: any) {
      setError(err.message || "Hata oluştu.");
    }
  };

  const fetchSupportSessions = async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/support/sessions", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSupportSessions(data.sessions || []);
      }
    } catch (e) {
      console.error("Support sessions fetch error:", e);
    }
  };

  const fetchSupportMessages = async (sessId: string, silent = false) => {
    if (!token || !sessId) return;
    try {
      if (!silent) setLoadingSupport(true);
      const res = await fetch(`/api/support/messages?sessionId=${sessId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSupportMessages(data.messages || []);
      }
    } catch (e) {
      console.error("Support messages fetch error:", e);
    } finally {
      setLoadingSupport(false);
    }
  };

  const handleMarkSupportAsRead = async (sessId: string) => {
    if (!token || !sessId) return;
    try {
      await fetch("/api/support/read", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ sessionId: sessId })
      });
      fetchSupportSessions();
    } catch (e) {
      console.error("Mark read error:", e);
    }
  };

  const handleSendSupportReply = async (textToSend?: string) => {
    const text = textToSend !== undefined ? textToSend : supportReplyInput;
    if (!token || !selectedSupportSessionId || !text.trim()) return;

    try {
      const res = await fetch("/api/support/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          sessionId: selectedSupportSessionId,
          text: text.trim(),
          sender: "support"
        })
      });
      if (res.ok) {
        if (textToSend === undefined) {
          setSupportReplyInput("");
        }
        fetchSupportMessages(selectedSupportSessionId, true);
        fetchSupportSessions();
      } else {
        const data = await res.json();
        setError(data.error || "Destek yanıtı gönderilemedi kanka.");
        setTimeout(() => setError(""), 4000);
      }
    } catch (e) {
      console.error("Send reply error:", e);
      setError("Cevap gönderilirken sunucu bağlantı hatası oluştu kanka.");
      setTimeout(() => setError(""), 4000);
    }
  };

  const handleEndSupportSession = async (sessId: string) => {
    if (!token || !sessId) return;
    if (!confirm("Bu canlı destek görüşmesini sonlandırmak istediğinizden emin misiniz kanka? Kullanıcı artık mesaj yazamayacaktır.")) return;
    try {
      const res = await fetch("/api/support/end", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ sessionId: sessId })
      });
      if (res.ok) {
        setSuccessMsg("Destek görüşmesi başarıyla sonlandırıldı kanka! 🔴");
        setTimeout(() => setSuccessMsg(""), 3000);
        fetchSupportSessions();
        fetchSupportMessages(sessId, true);
      }
    } catch (e) {
      console.error("End session error:", e);
    }
  };

  const handleDeleteSupportSession = async (sessId: string) => {
    if (!token || !sessId) return;
    if (!confirm("Bu canlı destek görüşmesini ve tüm mesaj geçmişini tamamen SİLMEK istediğinizden emin misiniz kanka? Bu işlem geri alınamaz!")) return;
    try {
      const res = await fetch("/api/support/close", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ sessionId: sessId })
      });
      if (res.ok) {
        setSuccessMsg("Destek görüşmesi ve tüm mesajları tamamen silindi kanka! 🗑️");
        setTimeout(() => setSuccessMsg(""), 3000);
        if (selectedSupportSessionId === sessId) {
          setSelectedSupportSessionId(null);
          setSupportMessages([]);
        }
        fetchSupportSessions();
      }
    } catch (e) {
      console.error("Delete session error:", e);
    }
  };

  const fetchCensoredWords = async () => {
    if (!token) return;
    try {
      setLoadingCensoredWords(true);
      const res = await fetch("/api/admin/censored-words", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCensoredWordsList(data.words || []);
      }
    } catch (e) {
      console.error("Yasaklı kelimeler fetch hatası:", e);
    } finally {
      setLoadingCensoredWords(false);
    }
  };

  const handleSaveCensoredWordsList = async (updatedList: string[]) => {
    if (!token) return;
    try {
      setSavingCensoredWords(true);
      const res = await fetch("/api/admin/censored-words", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ words: updatedList })
      });
      if (res.ok) {
        const data = await res.json();
        setCensoredWordsList(data.words || []);
        setSuccessMsg("Yasaklı kelime listesi başarıyla güncellendi kanka!");
        setTimeout(() => setSuccessMsg(""), 3000);
      }
    } catch (e) {
      console.error("Yasaklı kelimeler save hatası:", e);
    } finally {
      setSavingCensoredWords(false);
    }
  };

  const handleAddCensoredWord = (e: React.FormEvent) => {
    e.preventDefault();
    const word = newCensoredWord.trim().toLowerCase();
    if (!word) return;
    if (censoredWordsList.includes(word)) {
      alert("Bu kelime zaten listede ekli kanka!");
      return;
    }
    const newList = [...censoredWordsList, word];
    setCensoredWordsList(newList);
    setNewCensoredWord("");
    handleSaveCensoredWordsList(newList);
  };

  const handleRemoveCensoredWord = (wordToRemove: string) => {
    const newList = censoredWordsList.filter(w => w !== wordToRemove);
    setCensoredWordsList(newList);
    handleSaveCensoredWordsList(newList);
  };

  const loadAllData = () => {
    if (token) {
      fetchUsers();
      fetchPricing();
      fetchStats();
      fetchConversions();
      fetchAdvertisements();
      fetchBankDetails();
      fetchBanAppeals();
      fetchAnnouncements();
      fetchIpBans();
      fetchSystemData();
      fetchSupportSessions();
      fetchCensoredWords();
      fetchSupportConfig();
    }
  };

  useEffect(() => {
    if (!token) return;
    if (activeSubTab === "censorship") {
      fetchCensoredWords();
    }
  }, [token, activeSubTab]);

  useEffect(() => {
    loadAllData();
  }, [token]);

  // Poll system data when system subtab is active
  useEffect(() => {
    if (!token || activeSubTab !== "system") return;
    fetchSystemData();
    const interval = setInterval(() => {
      fetchSystemData();
    }, 6000);
    return () => clearInterval(interval);
  }, [token, activeSubTab]);

  // Poll announcements every 4 seconds to show live read/bot count updates
  useEffect(() => {
    if (!token) return;
    const interval = setInterval(() => {
      fetchAnnouncements();
    }, 4000);
    return () => clearInterval(interval);
  }, [token]);

  // Poll support sessions list every 5 seconds when support subtab is active
  useEffect(() => {
    if (!token || activeSubTab !== "support") return;
    fetchSupportSessions();
    fetchSupportConfig();
    const interval = setInterval(() => {
      fetchSupportSessions();
    }, 5000);
    return () => clearInterval(interval);
  }, [token, activeSubTab]);

  // Poll support messages for selected session every 3 seconds
  useEffect(() => {
    if (!token || activeSubTab !== "support" || !selectedSupportSessionId) return;
    
    // Mark as read immediately when selected
    handleMarkSupportAsRead(selectedSupportSessionId);
    fetchSupportMessages(selectedSupportSessionId);

    const interval = setInterval(() => {
      fetchSupportMessages(selectedSupportSessionId, true);
    }, 3000);
    return () => clearInterval(interval);
  }, [token, activeSubTab, selectedSupportSessionId]);

  const handleToggleRole = async (userId: string, email: string) => {
    if (email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
      alert("Bu kullanıcının yöneticilik yetkisi sistem tarafından korunmaktadır ve değiştirilemez!");
      return;
    }

    setError("");
    setSuccessMsg("");

    try {
      const response = await fetch("/api/admin/toggle-role", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Yetki değiştirilemedi.");
      }

      setSuccessMsg(data.message || "Yetki başarıyla güncellendi.");
      fetchUsers(); 
      fetchStats();
    } catch (err: any) {
      setError(err.message || "İşlem sırasında bir hata oluştu.");
    } finally {
      setTogglingRoleId(null);
    }
  };

  const handleTogglePremium = async (userId: string, email: string) => {
    if (email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
      alert("Kurucunun Premium durumu sistem tarafından kalıcı olarak kilitlenmiştir!");
      return;
    }

    setError("");
    setSuccessMsg("");

    try {
      const response = await fetch("/api/admin/toggle-premium", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Premium durumu değiştirilemedi.");
      }

      setSuccessMsg(data.message || "Abonelik durumu başarıyla güncellendi.");
      fetchUsers();
      fetchStats();
    } catch (err: any) {
      setError(err.message || "İşlem sırasında bir hata oluştu.");
    }
  };

  const handleToggleBan = async (userId: string, email: string) => {
    if (email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
      alert("Kurucu hesap engellenemez!");
      return;
    }

    setError("");
    setSuccessMsg("");

    try {
      const response = await fetch("/api/admin/toggle-ban", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Engelleme durumu güncellenemedi.");
      }

      setSuccessMsg(data.message || "Kullanıcı engelleme durumu başarıyla güncellendi.");
      fetchUsers();
    } catch (err: any) {
      setError(err.message || "İşlem sırasında bir hata oluştu.");
    } finally {
      setBanningUserId(null);
    }
  };

  const handleModerateAd = async (adId: string, status?: "approved" | "rejected" | "pending", templateStyle?: string, bannerUrl?: string, companyName?: string, websiteUrl?: string, paymentStatus?: "pending" | "paid") => {
    setError("");
    setSuccessMsg("");

    try {
      const response = await fetch("/api/admin/advertisements/moderate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ adId, status, templateStyle, bannerUrl, companyName, websiteUrl, paymentStatus }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Reklam güncellenemedi.");
      }

      setSuccessMsg(data.message || "Reklam durumu güncellendi.");
      fetchAdvertisements();
    } catch (err: any) {
      setError(err.message || "Reklam güncellenirken hata oluştu.");
    }
  };

  const handleSaveBankDetails = async () => {
    setError("");
    setSuccessMsg("");
    setSavingBank(true);
    try {
      const res = await fetch("/api/admin/advertisements/bank-details", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(adminBankDetails)
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(data.message || "Banka hesap bilgileri başarıyla kaydedildi.");
      } else {
        throw new Error(data.error || "Kaydedilirken hata oluştu.");
      }
    } catch (err: any) {
      setError(err.message || "Kaydedilirken bağlantı hatası oluştu.");
    } finally {
      setSavingBank(false);
    }
  };

  const handleDeleteAd = async (adId: string) => {
    setError("");
    setSuccessMsg("");
    try {
      const response = await fetch(`/api/admin/advertisements/${adId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (response.ok) {
        setSuccessMsg(data.message || "Reklam başarıyla silindi.");
        fetchAdvertisements();
      } else {
        throw new Error(data.error || "Reklam silinirken hata oluştu.");
      }
    } catch (err: any) {
      setError(err.message || "Bağlantı hatası oluştu.");
    }
  };

  const handleSavePricing = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setSavingPrice(true);

    try {
      const response = await fetch("/api/premium/config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ premiumMonthlyPrice: Number(monthlyPriceInput) }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Fiyatlandırma kaydedilemedi.");
      }

      setSuccessMsg(data.message || "Fiyatlandırma başarıyla güncellendi.");
      if (data.config) {
        setMonthlyPriceInput(data.config.premiumMonthlyPrice.toString());
      }
      fetchStats(); // Recalculate estimated revenue
    } catch (err: any) {
      setError(err.message || "Fiyatlandırma güncellenirken hata oluştu.");
    } finally {
      setSavingPrice(false);
    }
  };

  const handleToggleMaintenance = async () => {
    setError("");
    setSuccessMsg("");
    setUpdatingMaintenance(true);
    try {
      const res = await fetch("/api/admin/maintenance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ maintenanceMode: !maintenanceMode })
      });
      const data = await res.json();
      if (res.ok) {
        setMaintenanceMode(data.maintenanceMode);
        setSuccessMsg(data.message || "Bakım modu durumu başarıyla güncellendi.");
        if (onConfigChange) {
          onConfigChange();
        }
      } else {
        throw new Error(data.error || "Bakım modu değiştirilemedi.");
      }
    } catch (err: any) {
      setError(err.message || "Hata oluştu.");
    } finally {
      setUpdatingMaintenance(false);
    }
  };

  // Filter users based on search
  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter conversions based on search query
  const filteredConversions = conversions.filter(
    (c) =>
      c.videoTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.videoUrl.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("tr-TR", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="mx-auto max-w-7xl py-8 px-4" id="admin-panel-container">
      {/* Admin Title */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4" id="admin-title-section">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-red-500 animate-pulse" /> İnanmp3gg Yönetim Paneli
          </h2>
          <p className="mt-1 text-sm text-neutral-400">
            Sistem ayarlarını, üyelik durumlarını, dönüştürme geçmişlerini ve kullanıcı listelerini buradan yönetin.
          </p>
        </div>

        {/* Refresh button */}
        <button
          onClick={loadAllData}
          className="self-start md:self-auto flex items-center gap-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 px-3.5 py-2 text-xs font-bold text-white transition cursor-pointer"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Tümünü Yenile
        </button>
      </div>

      {/* Admin Statistics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8" id="admin-stats-grid">
        {/* Stat 1: Total Users */}
        <div className="rounded-2xl border border-neutral-800/80 bg-neutral-900/30 p-5 relative overflow-hidden flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center shrink-0">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <span className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider">Toplam Kayıtlı</span>
            <span className="text-2xl font-black text-white block mt-0.5">{stats.totalUsers} kullanıcı</span>
          </div>
        </div>

        {/* Stat 2: Premium Users */}
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.02] p-5 relative overflow-hidden flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
            <Award className="h-5 w-5 fill-amber-500/15" />
          </div>
          <div>
            <span className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider">Premium / Yönetici</span>
            <span className="text-2xl font-black text-amber-500 block mt-0.5">{stats.premiumUsers} üyelik</span>
          </div>
        </div>

        {/* Stat 3: Total Conversions */}
        <div className="rounded-2xl border border-blue-500/20 bg-blue-500/[0.02] p-5 relative overflow-hidden flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
            <Download className="h-5 w-5" />
          </div>
          <div>
            <span className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider">Dönüşüm Havuzu</span>
            <span className="text-2xl font-black text-blue-400 block mt-0.5">
              {stats.totalConversions} istek
              <span className="text-[10px] font-normal text-neutral-500 block">({stats.completedConversions} tamamlanan)</span>
            </span>
          </div>
        </div>

        {/* Stat 4: Estimated Revenue */}
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.02] p-5 relative overflow-hidden flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <span className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider">Aylık Tahmini Ciro</span>
            <span className="text-2xl font-black text-emerald-400 block mt-0.5">{stats.estimatedMonthlyRevenue} TL / ay</span>
          </div>
        </div>
      </div>

      {/* Success / Error Messages */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-950/20 border border-red-900 text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div className="mb-6 p-4 rounded-xl bg-green-950/20 border border-green-900 text-green-400 text-xs flex items-center gap-2">
          <Check className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Global Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8" id="admin-global-settings-grid">
        {/* Card 1: Premium Subscription Price Management */}
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/20 p-5 sm:p-6" id="admin-premium-pricing-card">
          <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
            👑 Premium Üyelik Fiyat Ayarları
          </h3>
          <p className="text-xs text-neutral-400 mb-6">
            Aylık paket ücretini değiştirdiğinizde, yıllık paket fiyatı sistem tarafından otomatik olarak hesaplanır (yıllık peşin ödemede %20 indirim uygulanır).
          </p>

          <form onSubmit={handleSavePricing} className="flex flex-col sm:flex-row items-end gap-4">
            <div className="space-y-1.5 w-full sm:w-1/2">
              <label className="block text-xs font-semibold text-neutral-300">
                Aylık Premium Ücreti (TL)
              </label>
              <input
                type="number"
                min="1"
                value={monthlyPriceInput}
                onChange={(e) => setMonthlyPriceInput(e.target.value)}
                className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3.5 py-2 text-sm text-white focus:border-red-500 focus:outline-none transition"
                placeholder="Fiyat girin..."
                required
              />
            </div>

            <div className="space-y-1.5 w-full sm:w-1/2">
              <label className="block text-xs font-semibold text-neutral-400">
                Yıllık Premium (Hesaplanan)
              </label>
              <div className="w-full rounded-lg border border-neutral-800/40 bg-neutral-950/60 px-3.5 py-2.5 text-xs text-amber-500 font-bold">
                {Math.round(Number(monthlyPriceInput || 0) * 12 * 0.8)} TL / yıl
              </div>
            </div>

            <button
              type="submit"
              disabled={savingPrice}
              className="w-full sm:w-auto rounded-lg bg-amber-500 hover:bg-amber-600 px-5 py-2.5 text-xs font-bold text-neutral-950 transition cursor-pointer disabled:opacity-50 shrink-0"
            >
              {savingPrice ? "..." : "Güncelle"}
            </button>
          </form>
        </div>

        {/* Card 2: System Maintenance Mode */}
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/20 p-5 sm:p-6 flex flex-col justify-between" id="admin-maintenance-card">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                🔧 Sistem Bakım Modu
              </h3>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                maintenanceMode 
                  ? "bg-red-500/10 border border-red-500/30 text-red-500 animate-pulse" 
                  : "bg-emerald-500/10 border border-emerald-500/30 text-emerald-500"
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${maintenanceMode ? "bg-red-500 animate-ping" : "bg-emerald-500"}`} />
                {maintenanceMode ? "Aktif" : "Pasif"}
              </span>
            </div>
            <p className="text-xs text-neutral-400 mb-4">
              Bakım modunu aktif ettiğinizde, tüm dönüştürme işlemleri durdurulur ve ziyaretçilere otomatik olarak duyuru şeklinde bir bakım ekranı gösterilir.
            </p>
          </div>

          <div className="flex items-center justify-between gap-4 pt-4 border-t border-neutral-800">
            <div className="text-left">
              <span className="block text-xs font-semibold text-neutral-300">Bakım Modu Anahtarı</span>
              <span className="text-[10px] text-neutral-500 font-medium">Aktif edilince otomatik bakım duyurusu yayınlanır.</span>
            </div>
            <button
              type="button"
              onClick={handleToggleMaintenance}
              disabled={updatingMaintenance}
              className={`rounded-lg px-5 py-2.5 text-xs font-bold transition cursor-pointer disabled:opacity-50 shrink-0 ${
                maintenanceMode
                  ? "bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-950/20"
                  : "bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700"
              }`}
            >
              {updatingMaintenance ? "Güncelleniyor..." : maintenanceMode ? "Bakım Modunu Kapat" : "Bakım Modunu Aç"}
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-neutral-800 mb-6 flex-wrap gap-y-2">
        <button
          onClick={() => { setActiveSubTab("users"); setSearchQuery(""); }}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition cursor-pointer flex items-center gap-2 ${
            activeSubTab === "users" 
              ? "border-red-500 text-white" 
              : "border-transparent text-neutral-500 hover:text-white"
          }`}
        >
          <Users className="h-4 w-4" /> 👥 Kullanıcı Yönetimi ({filteredUsers.length})
        </button>
        <button
          onClick={() => { setActiveSubTab("conversions"); setSearchQuery(""); }}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition cursor-pointer flex items-center gap-2 ${
            activeSubTab === "conversions" 
              ? "border-red-500 text-white" 
              : "border-transparent text-neutral-500 hover:text-white"
          }`}
        >
          <Layers className="h-4 w-4" /> 🔄 Dönüşüm Monitörü ({filteredConversions.length})
        </button>
        <button
          onClick={() => { setActiveSubTab("ads"); setSearchQuery(""); }}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition cursor-pointer flex items-center gap-2 ${
            activeSubTab === "ads" 
              ? "border-red-500 text-white" 
              : "border-transparent text-neutral-500 hover:text-white"
          }`}
        >
          <Megaphone className="h-4 w-4" /> 📣 Reklam Kampanyaları ({advertisements.length})
        </button>
        <button
          onClick={() => { setActiveSubTab("appeals"); setSearchQuery(""); }}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition cursor-pointer flex items-center gap-2 ${
            activeSubTab === "appeals" 
              ? "border-red-500 text-white" 
              : "border-transparent text-neutral-500 hover:text-white"
          }`}
        >
          <ShieldAlert className="h-4 w-4" /> 🚫 Engel İtirazları ({banAppeals.filter(a => a.status === "pending").length})
        </button>
        <button
          onClick={() => { setActiveSubTab("announcements"); setSearchQuery(""); }}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition cursor-pointer flex items-center gap-2 ${
            activeSubTab === "announcements" 
              ? "border-red-500 text-white" 
              : "border-transparent text-neutral-500 hover:text-white"
          }`}
        >
          <Megaphone className="h-4 w-4" /> 📢 Duyuru Yönetimi ({announcements.length})
        </button>
        <button
          onClick={() => { setActiveSubTab("ipbans"); setSearchQuery(""); }}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition cursor-pointer flex items-center gap-2 ${
            activeSubTab === "ipbans" 
              ? "border-red-500 text-white" 
              : "border-transparent text-neutral-500 hover:text-white"
          }`}
        >
          <Network className="h-4 w-4" /> 🚫 IP Engel Yönetimi ({bannedIpsList.length})
        </button>
        <button
          onClick={() => { setActiveSubTab("analytics"); setSearchQuery(""); }}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition cursor-pointer flex items-center gap-2 ${
            activeSubTab === "analytics" 
              ? "border-red-500 text-white" 
              : "border-transparent text-neutral-500 hover:text-white"
          }`}
        >
          <PieChart className="h-4 w-4" /> 📊 Detaylı Analitik ({conversions.length})
        </button>
        <button
          onClick={() => { setActiveSubTab("system"); setSearchQuery(""); }}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition cursor-pointer flex items-center gap-2 ${
            activeSubTab === "system" 
              ? "border-red-500 text-white" 
              : "border-transparent text-neutral-500 hover:text-white"
          }`}
        >
          <Settings className="h-4 w-4" /> ⚙️ Sistem Bakım & Loglar
        </button>
        <button
          onClick={() => { setActiveSubTab("support"); setSearchQuery(""); }}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition cursor-pointer flex items-center gap-2 relative ${
            activeSubTab === "support" 
              ? "border-red-500 text-white" 
              : "border-transparent text-neutral-500 hover:text-white"
          }`}
        >
          <Headphones className="h-4 w-4" /> 👩‍💻 Canlı Destek
          {supportSessions.reduce((acc, s) => acc + (s.unreadCount || 0), 0) > 0 && (
            <span className="absolute top-2 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[9px] font-bold text-white animate-pulse">
              {supportSessions.reduce((acc, s) => acc + (s.unreadCount || 0), 0)}
            </span>
          )}
        </button>
        <button
          onClick={() => { setActiveSubTab("censorship"); setSearchQuery(""); }}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition cursor-pointer flex items-center gap-2 ${
            activeSubTab === "censorship" 
              ? "border-red-500 text-white" 
              : "border-transparent text-neutral-500 hover:text-white"
          }`}
        >
          <Ban className="h-4 w-4 text-red-500" /> 🚫 Küfür & Sansür Filtresi
        </button>
      </div>

      {/* Tab: Users Management */}
      {activeSubTab === "users" && (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 overflow-hidden shadow-xl" id="admin-users-table-card">
          {/* Table Filter Header */}
          <div className="p-4 bg-neutral-950/50 border-b border-neutral-800 flex items-center relative">
            <Search className="absolute left-7 top-7 h-4 w-4 text-neutral-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Kullanıcı adı veya e-posta adresi ile arayın..."
              className="w-full rounded-lg border border-neutral-800 bg-neutral-950 py-2.5 pl-11 pr-4 text-xs text-white focus:border-red-500 focus:outline-none transition"
              id="admin-search-users-input"
            />
          </div>

          {/* Users List Table */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="py-16 text-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-500 border-t-transparent mx-auto mb-4" />
                <span className="text-xs text-neutral-400 font-medium">Veriler yükleniyor...</span>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="py-16 text-center text-neutral-500 text-xs">
                Arama kriterlerine uygun kullanıcı bulunamadı.
              </div>
            ) : (
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-neutral-950/20 text-neutral-400 text-[10px] font-bold uppercase tracking-wider border-b border-neutral-800">
                    <th className="px-6 py-4">Kullanıcı Bilgisi</th>
                    <th className="px-6 py-4">Kayıt Tarihi</th>
                    <th className="px-6 py-4">Sistem Rolü</th>
                    <th className="px-6 py-4">Premium Durumu</th>
                    <th className="px-6 py-4 text-right">Yönetimsel İşlemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800 text-xs">
                  {filteredUsers.map((user) => {
                    const isSuperAdmin = user.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
                    const isPremium = user.isPremium || user.role === "admin";

                    return (
                      <tr 
                        key={user.id} 
                        className="hover:bg-neutral-900/20 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-red-600/10 border border-red-500/20 text-red-400 font-bold text-xs flex items-center justify-center shrink-0 uppercase">
                              {isSuperAdmin ? <Award className="h-4 w-4" /> : user.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className={`font-bold text-white block truncate ${user.isBanned ? 'line-through text-neutral-500' : ''}`}>{user.name}</span>
                                {user.isBanned && (
                                  <span className="rounded bg-red-500/10 border border-red-500/30 px-1 py-0.5 text-[8px] font-bold text-red-500 uppercase tracking-wider scale-90">
                                    Engelli
                                  </span>
                                )}
                                {user.isPremium && (
                                  <span className="rounded bg-amber-500/10 border border-amber-500/30 px-1 py-0.5 text-[8px] font-bold text-amber-500 uppercase tracking-wider scale-90">
                                    Premium
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-neutral-500 block truncate mt-0.5">{user.email}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-neutral-400 font-medium">
                          {formatDate(user.createdAt)}
                        </td>
                        <td className="px-6 py-4">
                          {isSuperAdmin ? (
                            <span className="inline-flex items-center gap-1 rounded bg-red-600 text-white px-2 py-0.5 text-[10px] font-extrabold shadow shadow-red-950/20">
                              Kurucu
                            </span>
                          ) : user.role === "admin" ? (
                            <span className="inline-flex items-center gap-1 rounded bg-red-500/10 border border-red-500/30 px-2 py-0.5 text-[10px] font-bold text-red-500">
                              Yönetici
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded bg-neutral-950 border border-neutral-800 px-2 py-0.5 text-[10px] font-medium text-neutral-400">
                              Standart Üye
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {isSuperAdmin ? (
                            <span className="inline-flex items-center gap-1 text-amber-500 font-black text-xs">
                              👑 Sınırsız Premium
                            </span>
                          ) : user.isPremium ? (
                            <span className="inline-flex flex-col text-[11px]">
                              <span className="text-amber-500 font-bold flex items-center gap-0.5">
                                <Sparkles className="h-3.5 w-3.5 fill-amber-500/20" /> Aktif
                              </span>
                              {user.premiumExpiry && (
                                <span className="text-[9px] text-neutral-500 mt-0.5">
                                  Bitiş: {new Date(user.premiumExpiry).toLocaleDateString("tr-TR")}
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-neutral-500 text-xs">Abonelik Yok</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Toggle admin role button */}
                            {!isSuperAdmin && (
                              togglingRoleId === user.id ? (
                                <div className="flex items-center gap-1 bg-neutral-950 border border-neutral-800 p-1 rounded-lg">
                                  <button
                                    onClick={() => handleToggleRole(user.id, user.email)}
                                    className="rounded bg-red-600 hover:bg-red-700 text-white font-extrabold px-2 py-1 text-[10px] transition cursor-pointer"
                                  >
                                    Onayla
                                  </button>
                                  <button
                                    onClick={() => setTogglingRoleId(null)}
                                    className="rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 px-2 py-1 text-[10px] transition cursor-pointer"
                                  >
                                    İptal
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setTogglingRoleId(user.id)}
                                  className={`rounded-lg px-2.5 py-1.5 text-[11px] font-bold border transition cursor-pointer flex items-center gap-1 ${
                                    user.role === "admin"
                                      ? "bg-red-500/5 hover:bg-red-500/15 border-red-500/20 hover:border-red-500/30 text-red-400"
                                      : "bg-neutral-950 hover:bg-neutral-900 border-neutral-800 hover:border-neutral-700 text-neutral-300"
                                  }`}
                                  title={user.role === "admin" ? "Yöneticilik Yetkisini Al" : "Yönetici Yap"}
                                >
                                  {user.role === "admin" ? (
                                    <>
                                      <ShieldMinus className="h-3.5 w-3.5" /> Yetkiyi Al
                                    </>
                                  ) : (
                                    <>
                                      <ShieldPlus className="h-3.5 w-3.5" /> Yönetici Yap
                                    </>
                                  )}
                                </button>
                              )
                            )}

                            {/* Toggle Premium subscription directly */}
                            {!isSuperAdmin && (
                              <button
                                onClick={() => handleTogglePremium(user.id, user.email)}
                                className={`rounded-lg px-2.5 py-1.5 text-[11px] font-bold border transition cursor-pointer flex items-center gap-1 ${
                                  user.isPremium
                                    ? "bg-amber-500/5 hover:bg-amber-500/15 border-amber-500/20 hover:border-amber-500/30 text-amber-500"
                                    : "bg-neutral-950 hover:bg-neutral-900 border-neutral-800 hover:border-amber-500/20 text-neutral-400 hover:text-amber-500"
                                  }`}
                                title={user.isPremium ? "Premium Aboneliğini Pasifleştir" : "Premium Aboneliği Ver"}
                              >
                                <Star className={`h-3.5 w-3.5 ${user.isPremium ? "fill-amber-500" : ""}`} />
                                {user.isPremium ? "Premium Al" : "Premium Ver"}
                              </button>
                            )}

                            {/* Toggle Ban / Block status */}
                            {!isSuperAdmin && (
                              banningUserId === user.id ? (
                                <div className="flex items-center gap-1 bg-neutral-950 border border-neutral-800 p-1 rounded-lg">
                                  <button
                                    onClick={() => handleToggleBan(user.id, user.email)}
                                    className="rounded bg-red-600 hover:bg-red-700 text-white font-extrabold px-2 py-1 text-[10px] transition cursor-pointer"
                                  >
                                    Onayla
                                  </button>
                                  <button
                                    onClick={() => setBanningUserId(null)}
                                    className="rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 px-2 py-1 text-[10px] transition cursor-pointer"
                                  >
                                    İptal
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setBanningUserId(user.id)}
                                  className={`rounded-lg px-2.5 py-1.5 text-[11px] font-bold border transition cursor-pointer flex items-center gap-1 ${
                                    user.isBanned
                                      ? "bg-red-500 hover:bg-red-600 border-red-500 text-neutral-950"
                                      : "bg-neutral-950 hover:bg-neutral-900 border-neutral-800 hover:border-red-500/20 text-neutral-400 hover:text-red-500"
                                  }`}
                                  title={user.isBanned ? "Engeli Kaldır" : "Kullanıcıyı Engelle"}
                                >
                                  <Ban className="h-3.5 w-3.5" />
                                  {user.isBanned ? "Engeli Kaldır" : "Engelle"}
                                </button>
                              )
                            )}

                            {isSuperAdmin && (
                              <span className="text-[10px] font-mono text-neutral-600 select-none italic pr-2">
                                <Lock className="h-3 w-3 inline mr-1" /> Kilitli Hesap
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Tab: Conversions queue monitor */}
      {activeSubTab === "conversions" && (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 overflow-hidden shadow-xl" id="admin-conversions-queue-card">
          {/* Table Filter Header */}
          <div className="p-4 bg-neutral-950/50 border-b border-neutral-800 flex items-center relative">
            <Search className="absolute left-7 top-7 h-4 w-4 text-neutral-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Video başlığı veya YouTube URL'sine göre filtreleyin..."
              className="w-full rounded-lg border border-neutral-800 bg-neutral-950 py-2.5 pl-11 pr-4 text-xs text-white focus:border-red-500 focus:outline-none transition"
              id="admin-search-conversions-input"
            />
          </div>

          <div className="overflow-x-auto">
            {filteredConversions.length === 0 ? (
              <div className="py-16 text-center text-neutral-500 text-xs">
                Sistemde kayıtlı herhangi bir dönüştürme işlemi bulunmamaktadır.
              </div>
            ) : (
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-neutral-950/20 text-neutral-400 text-[10px] font-bold uppercase tracking-wider border-b border-neutral-800">
                    <th className="px-6 py-4">Video Detayı</th>
                    <th className="px-6 py-4">Format / Kalite</th>
                    <th className="px-6 py-4">İşlem Tarihi</th>
                    <th className="px-6 py-4">Kullanıcı Tipi</th>
                    <th className="px-6 py-4">Boyut</th>
                    <th className="px-6 py-4">Durum / İlerleme</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800 text-xs">
                  {filteredConversions.map((conv) => {
                    const isMp4 = conv.format === "mp4";
                    const isGuest = conv.userId === "guest";

                    return (
                      <tr key={conv.id} className="hover:bg-neutral-900/20 transition-colors">
                        <td className="px-6 py-4 max-w-sm">
                          <span className="font-bold text-white block truncate leading-snug" title={conv.videoTitle}>
                            {conv.videoTitle}
                          </span>
                          <a 
                            href={conv.videoUrl} 
                            target="_blank" 
                            referrerPolicy="no-referrer"
                            className="text-[10px] text-neutral-500 hover:text-red-400 mt-1 flex items-center gap-1 transition"
                          >
                            <ExternalLink className="h-2.5 w-2.5" /> URL Git
                          </a>
                        </td>
                        <td className="px-6 py-4">
                          <span className="flex items-center gap-1 text-xs">
                            {isMp4 ? (
                              <Video className="h-3.5 w-3.5 text-blue-400" />
                            ) : (
                              <Music className="h-3.5 w-3.5 text-red-400" />
                            )}
                            <span className="font-bold text-neutral-200 uppercase">{conv.format}</span>
                            <span className="text-neutral-500">({conv.quality})</span>
                          </span>
                        </td>
                        <td className="px-6 py-4 text-neutral-400 font-medium whitespace-nowrap">
                          {formatDate(conv.createdAt)}
                        </td>
                        <td className="px-6 py-4">
                          {isGuest ? (
                            <span className="rounded bg-neutral-950 border border-neutral-800 px-2 py-0.5 text-[10px] font-medium text-neutral-500">
                              Ziyaretçi
                            </span>
                          ) : (
                            <span className="rounded bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-500">
                              Kayıtlı Üye
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-neutral-400 font-mono">
                          {conv.fileSize || "Bilinmiyor"}
                        </td>
                        <td className="px-6 py-4">
                          {conv.status === "processing" ? (
                            <div className="flex items-center gap-2">
                              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-red-500 border-t-transparent shrink-0" />
                              <span className="text-xs text-red-500 font-bold">
                                %{conv.progress} Hazırlanıyor
                              </span>
                            </div>
                          ) : conv.status === "completed" ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-500">
                              <Check className="h-3.5 w-3.5" /> Tamamlandı
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-red-500">
                              <AlertCircle className="h-3.5 w-3.5" /> Hata Oluştu
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Tab: Advertisements Management */}
      {activeSubTab === "ads" && (
        <div className="space-y-6" id="admin-ads-panel">
          {/* Info Banner */}
          <div className="rounded-2xl border border-red-500/10 bg-red-500/[0.02] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Megaphone className="h-4 w-4 text-red-500" /> Reklamveren ve Şablon Yönetimi
              </h4>
              <p className="text-xs text-neutral-400">
                Sitenize gelen reklam taleplerini onaylayın, hazır şablonlarla zenginleştirin ve canlıda gösterilecek reklam alanlarını kontrol edin.
              </p>
            </div>
          </div>

          {/* Bank Configuration Settings Card */}
          <div className="bg-neutral-900/30 border border-neutral-800 rounded-2xl p-5 shadow-xl space-y-4">
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
              🏦 Reklam Ödeme Hesap Bilgileri (Havale/EFT)
            </h4>
            <p className="text-[11px] text-neutral-400">
              Reklamverenlerin havale ile yapacakları ödemelerde gösterilecek banka ve IBAN bilgilerini buradan düzenleyebilirsiniz.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-400 uppercase">Banka Adı</label>
                <input
                  type="text"
                  value={adminBankDetails.bankName}
                  onChange={(e) => setAdminBankDetails({ ...adminBankDetails, bankName: e.target.value })}
                  placeholder="Örn: Garanti BBVA"
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-xs text-white focus:border-red-500 focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-400 uppercase">Alıcı Ad Soyad</label>
                <input
                  type="text"
                  value={adminBankDetails.accountHolder}
                  onChange={(e) => setAdminBankDetails({ ...adminBankDetails, accountHolder: e.target.value })}
                  placeholder="Örn: Tümay Işıldak"
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-xs text-white focus:border-red-500 focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-400 uppercase">IBAN Numarası</label>
                <input
                  type="text"
                  value={adminBankDetails.iban}
                  onChange={(e) => setAdminBankDetails({ ...adminBankDetails, iban: e.target.value })}
                  placeholder="Örn: TR00 0000..."
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-xs text-white focus:border-red-500 focus:outline-none font-mono"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={handleSaveBankDetails}
                disabled={savingBank}
                className="rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 text-[10px] transition cursor-pointer flex items-center gap-1.5"
              >
                {savingBank ? "Kaydediliyor..." : "Banka Bilgilerini Güncelle"}
              </button>
            </div>
          </div>

          {/* Ad Submissions List */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 overflow-hidden shadow-xl">
            <div className="p-4 bg-neutral-950/50 border-b border-neutral-800 flex items-center justify-between">
              <span className="text-xs font-bold text-white">Gelen Reklam Başvuruları ({advertisements.length})</span>
              <button 
                onClick={fetchAdvertisements}
                className="text-[10px] font-bold text-red-400 hover:text-white transition flex items-center gap-1"
              >
                <RefreshCw className="h-3 w-3 animate-spin" /> Listeyi Güncelle
              </button>
            </div>

            {advertisements.length === 0 ? (
              <div className="py-16 text-center text-neutral-500 text-xs">
                Sistemde henüz herhangi bir reklam başvurusu bulunmamaktadır.
              </div>
            ) : (
              <div className="divide-y divide-neutral-800">
                {advertisements.map((ad) => {
                  const isApproved = ad.status === "approved";
                  const isRejected = ad.status === "rejected";

                  return (
                    <div key={ad.id} className="p-5 sm:p-6 hover:bg-neutral-900/10 transition-colors flex flex-col gap-6">
                      {/* Top Row: Meta and actions */}
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-white text-base">{ad.companyName}</span>
                            {ad.status === "approved" ? (
                              <span className="rounded bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[9px] font-bold text-emerald-500 uppercase tracking-wider">
                                Yayında / Onaylı
                              </span>
                            ) : ad.status === "rejected" ? (
                              <span className="rounded bg-red-500/15 border border-red-500/30 px-2 py-0.5 text-[9px] font-bold text-red-400 uppercase tracking-wider">
                                Reddedildi
                              </span>
                            ) : (
                              <span className="rounded bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[9px] font-bold text-amber-500 uppercase tracking-wider animate-pulse">
                                İncelemede
                              </span>
                            )}

                            <span className="rounded bg-neutral-950 border border-neutral-800 px-2 py-0.5 text-[9px] font-medium text-neutral-400 uppercase">
                              Alan: {ad.campaignType === "header" ? "Üst Banner" : ad.campaignType === "sidebar" ? "Yan Panel" : "Alt Bant"}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-500">
                            <span>E-posta: <a href={`mailto:${ad.contactEmail}`} className="text-neutral-300 underline">{ad.contactEmail}</a></span>
                            <span>•</span>
                            <span>Web: <a href={ad.websiteUrl} target="_blank" referrerPolicy="no-referrer" className="text-neutral-300 hover:text-red-400 underline inline-flex items-center gap-0.5">{ad.websiteUrl} <ExternalLink className="h-2.5 w-2.5" /></a></span>
                            <span>•</span>
                            <span>Tarih: {formatDate(ad.createdAt)}</span>
                          </div>
                        </div>

                        {/* Status moderation actions */}
                        <div className="flex items-center gap-2 self-start md:self-auto">
                          <button
                            onClick={() => handleModerateAd(ad.id, "approved", ad.templateStyle, ad.bannerUrl, ad.companyName, ad.websiteUrl)}
                            disabled={isApproved}
                            className={`rounded-lg px-3 py-2 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                              isApproved 
                                ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 cursor-default" 
                                : "bg-emerald-500 hover:bg-emerald-600 text-neutral-950"
                            }`}
                          >
                            <ShieldCheck className="h-4 w-4" /> {isApproved ? "Onaylandı" : "Yayınla"}
                          </button>
                          <button
                            onClick={() => handleModerateAd(ad.id, "rejected", ad.templateStyle, ad.bannerUrl, ad.companyName, ad.websiteUrl)}
                            disabled={isRejected}
                            className={`rounded-lg px-3 py-2 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                              isRejected 
                                ? "bg-red-500/10 text-red-400 border border-red-500/20 cursor-default" 
                                : "bg-neutral-800 hover:bg-red-950/20 hover:text-red-400 text-neutral-300 border border-neutral-700"
                            }`}
                          >
                            <Ban className="h-4 w-4" /> Reddet
                          </button>

                          {/* Delete action with local state confirmation */}
                          {deletingId === ad.id ? (
                            <div className="flex items-center gap-1.5 bg-red-500/5 p-1 rounded-lg border border-red-500/20">
                              <button
                                onClick={() => handleDeleteAd(ad.id)}
                                className="rounded bg-red-600 hover:bg-red-700 text-white font-extrabold px-2.5 py-1 text-[11px] transition cursor-pointer flex items-center gap-1"
                              >
                                <Trash2 className="h-3.5 w-3.5" /> Evet, Sil
                              </button>
                              <button
                                onClick={() => setDeletingId(null)}
                                className="rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 px-2 py-1 text-[11px] transition cursor-pointer"
                              >
                                Vazgeç
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeletingId(ad.id)}
                              className="rounded-lg px-3 py-2 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer bg-neutral-800/60 hover:bg-red-950/30 hover:text-red-400 text-neutral-400 border border-neutral-700/60"
                              title="Başvuruyu sistemden sil"
                            >
                              <Trash2 className="h-4 w-4" /> Sil
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Middle Row: Campaign Details & Budget + Performance Analytics */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-4 bg-neutral-950/40 p-4 rounded-xl border border-neutral-800/60">
                        <div>
                          <span className="block text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">Günlük Bütçe</span>
                          <span className="text-sm font-black text-emerald-400 mt-1 block">{ad.dailyBudget} TL / gün</span>
                        </div>
                        <div>
                          <span className="block text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">Yayın Süresi</span>
                          <span className="text-sm font-bold text-white mt-1 block">{ad.durationDays} gün</span>
                        </div>
                        <div>
                          <span className="block text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">Ödeme</span>
                          <span className="text-sm font-black text-amber-500 mt-1 block">{(ad.dailyBudget || 0) * (ad.durationDays || 0)} TL</span>
                        </div>
                        <div>
                          <span className="block text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">👁️ Görüntülenme</span>
                          <span className="text-sm font-black text-neutral-200 mt-1 block font-mono">{ad.views || 0}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">🖱️ Tıklama (CTR)</span>
                          <span className="text-sm font-black text-red-400 mt-1 block font-mono">
                            {ad.clicks || 0} <span className="text-[10px] text-neutral-400 font-bold">({(ad.views ? ((ad.clicks || 0) / ad.views) * 100 : 0).toFixed(1)}%)</span>
                          </span>
                        </div>
                        <div>
                          <span className="block text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">Mesaj</span>
                          <span className="text-xs text-neutral-300 mt-1.5 block italic truncate" title={ad.notes}>
                            {ad.notes || "Belirtilmemiş"}
                          </span>
                        </div>
                      </div>

                      {/* Payment Status Tracker Row */}
                      <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                        <div className="flex flex-wrap items-center gap-6">
                          <div>
                            <span className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Ödeme Yöntemi</span>
                            <span className="font-bold text-neutral-200 mt-0.5 block">
                              {ad.paymentMethod === "card" ? "💳 Kredi / Banka Kartı" : "🏦 Banka Havalesi / EFT"}
                            </span>
                          </div>
                          <div>
                            <span className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider font-mono">Açıklama / Referans No</span>
                            <span className="font-mono font-bold text-red-400 mt-0.5 block">{ad.paymentRef || "N/A"}</span>
                          </div>
                          <div>
                            <span className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Ödeme Tutarı</span>
                            <span className="font-bold text-emerald-400 mt-0.5 block">{ad.amountPaid || (ad.dailyBudget || 0) * (ad.durationDays || 0)} TL</span>
                          </div>
                          <div>
                            <span className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Ödeme Durumu</span>
                            <span className={`inline-block font-bold mt-0.5 px-2 py-0.5 text-[10px] rounded border uppercase tracking-wider ${
                              ad.paymentStatus === "paid"
                                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                                : "bg-amber-500/10 border-amber-500/30 text-amber-500"
                            }`}>
                              {ad.paymentStatus === "paid" ? "ÖDENDİ" : "BEKLİYOR"}
                            </span>
                          </div>
                        </div>

                        {ad.paymentStatus !== "paid" && (
                          <button
                            onClick={() => handleModerateAd(ad.id, undefined, undefined, undefined, undefined, undefined, "paid")}
                            className="rounded-lg bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold px-3 py-2 text-xs transition cursor-pointer flex items-center gap-1 shrink-0"
                          >
                            <span>💰 Ödemeyi Alındı Olarak Onayla</span>
                          </button>
                        )}
                      </div>

                      {/* Bottom Row: Ready-made Layout Templates & Live Editor */}
                      <div className="border-t border-neutral-800/80 pt-5 space-y-4">
                        <span className="text-xs font-bold text-white flex items-center gap-1.5">
                          <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Hazır Reklam Tasarım Şablonları (Kampanyaya Uygula)
                        </span>
                        
                        {/* Interactive Template Selector buttons */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                          {[
                            { style: "clean", label: "Clean Tech", desc: "Modern, sade minimalist iş ve teknoloji tasarımı" },
                            { style: "spotify", label: "Spotify Glow", desc: "Müzik, albüm ve oynatma listesi reklamları" },
                            { style: "neon", label: "Neon Beat", desc: "Gece kulübü, konser, synthwave hareketli tarz" },
                            { style: "retro", label: "Vintage Sound", desc: "Plakçılık, nostalji, analog plak tasarımı" },
                            { style: "custom", label: "Özel Banner (Dış Resim)", desc: "Kendi görselini/resim URL'sini kullanma" }
                          ].map((tmpl) => {
                            const isSelected = ad.templateStyle === tmpl.style;

                            return (
                              <button
                                key={tmpl.style}
                                onClick={() => handleModerateAd(ad.id, ad.status, tmpl.style as any, ad.bannerUrl, ad.companyName, ad.websiteUrl)}
                                className={`rounded-xl p-3 text-left border transition cursor-pointer flex flex-col justify-between h-24 ${
                                  isSelected
                                    ? "bg-amber-500/10 border-amber-500 text-amber-400"
                                    : "bg-neutral-950/40 border-neutral-800 hover:border-neutral-700 text-neutral-400 hover:text-white"
                                }`}
                              >
                                <span className="font-bold text-xs block">{tmpl.label}</span>
                                <span className="text-[9px] text-neutral-500 leading-snug block mt-1 line-clamp-2">{tmpl.desc}</span>
                                <span className="text-[8px] font-bold uppercase mt-2 tracking-wider inline-block rounded bg-neutral-900 border border-neutral-800/80 px-1 py-0.5">
                                  {isSelected ? "Uygulandı" : "Seç"}
                                </span>
                              </button>
                            );
                          })}
                        </div>

                        {/* Editable Field Form to Live Customize */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-neutral-950/20 p-4 rounded-xl border border-neutral-800/40">
                          <div className="space-y-1">
                            <label className="block text-[10px] font-semibold text-neutral-400">Canlı Firma Adı / Başlık</label>
                            <input
                              type="text"
                              value={ad.companyName}
                              onChange={(e) => handleModerateAd(ad.id, ad.status, ad.templateStyle, ad.bannerUrl, e.target.value, ad.websiteUrl)}
                              className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-xs text-white focus:border-red-500 focus:outline-none transition"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="block text-[10px] font-semibold text-neutral-400">Canlı Reklam Linki (URL)</label>
                            <input
                              type="text"
                              value={ad.websiteUrl}
                              onChange={(e) => handleModerateAd(ad.id, ad.status, ad.templateStyle, ad.bannerUrl, ad.companyName, e.target.value)}
                              className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-xs text-white focus:border-red-500 focus:outline-none transition"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="block text-[10px] font-semibold text-neutral-400">Afiş/Resim Linki (Sadece Özel Şablon için)</label>
                            <input
                              type="text"
                              value={ad.bannerUrl || ""}
                              onChange={(e) => handleModerateAd(ad.id, ad.status, ad.templateStyle, e.target.value, ad.companyName, ad.websiteUrl)}
                              placeholder="Örn: https://link.com/afis.jpg"
                              disabled={ad.templateStyle !== "custom"}
                              className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-xs text-white focus:border-red-500 focus:outline-none transition disabled:opacity-30"
                            />
                          </div>
                        </div>

                        {/* Interactive Design Live Preview */}
                        <div className="space-y-2 pt-1">
                          <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500">CANLI ŞABLON ÖNİZLEMESİ (SİTEDE BÖYLE GÖZÜKECEK)</span>
                          
                          {/* Live Visual Render of the Template Slot */}
                          <div className="rounded-xl border border-neutral-800 overflow-hidden relative">
                            {ad.templateStyle === "clean" && (
                              <div className="p-5 bg-gradient-to-r from-neutral-900 to-neutral-950 text-white flex items-center justify-between border-l-4 border-red-500">
                                <div className="space-y-1">
                                  <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest block">ÖNERİLEN İŞTİRAK</span>
                                  <h5 className="text-sm font-extrabold text-neutral-100">{ad.companyName}</h5>
                                  <p className="text-xs text-neutral-400">Yüksek hız, güvenli dönüştürme ve kesintisiz müzik keyfi için bizi ziyaret edin.</p>
                                </div>
                                <a href={ad.websiteUrl} target="_blank" referrerPolicy="no-referrer" className="rounded bg-white hover:bg-neutral-200 px-4 py-2 text-xs font-bold text-neutral-950 transition shrink-0 ml-4">
                                  Ziyaret Et
                                </a>
                              </div>
                            )}

                            {ad.templateStyle === "spotify" && (
                              <div className="p-5 bg-gradient-to-r from-[#121212] to-[#1ED760]/5 text-white flex items-center justify-between border-l-4 border-[#1ED760]">
                                <div className="space-y-1">
                                  <span className="text-[10px] font-bold text-[#1ED760] uppercase tracking-widest flex items-center gap-1">
                                    <Star className="h-3 w-3 fill-[#1ED760]" /> SPOTIFY OYNATMA LİSTESİ
                                  </span>
                                  <h5 className="text-sm font-extrabold text-white">{ad.companyName}</h5>
                                  <p className="text-xs text-[#b3b3b3]">Sıradaki hit şarkıyı keşfet! Bu muhteşem çalma listesini kütüphanene ekle.</p>
                                </div>
                                <a href={ad.websiteUrl} target="_blank" referrerPolicy="no-referrer" className="rounded-full bg-[#1ED760] hover:bg-[#1db954] px-5 py-2 text-xs font-extrabold text-black transition shrink-0 ml-4 tracking-wider uppercase">
                                  HEMEN DİNLE
                                </a>
                              </div>
                            )}

                            {ad.templateStyle === "neon" && (
                              <div className="p-5 bg-gradient-to-r from-neutral-950 via-[#ff0055]/5 to-neutral-950 text-white flex items-center justify-between border border-[#ff0055]/30 shadow-[0_0_15px_rgba(255,0,85,0.05)]">
                                <div className="space-y-1">
                                  <span className="text-[10px] font-bold text-[#ff0055] uppercase tracking-widest animate-pulse block">NEON SYNTHWAVE SOUND</span>
                                  <h5 className="text-sm font-black text-white tracking-wide uppercase">{ad.companyName}</h5>
                                  <p className="text-xs text-neutral-400 font-mono">Sınırları aşan ritimler, synth tınıları ve kesintisiz dijital radyo.</p>
                                </div>
                                <a href={ad.websiteUrl} target="_blank" referrerPolicy="no-referrer" className="rounded bg-transparent hover:bg-[#ff0055]/10 px-4 py-2 text-xs font-bold text-[#ff0055] border border-[#ff0055] transition shadow-[0_0_10px_rgba(255,0,85,0.2)] shrink-0 ml-4">
                                  AKTIFA KATIL
                                </a>
                              </div>
                            )}

                            {ad.templateStyle === "retro" && (
                              <div className="p-5 bg-[#1a1512] text-[#f4eae1] flex items-center justify-between border-l-4 border-[#8b5a2b]">
                                <div className="space-y-1">
                                  <span className="text-[10px] font-bold text-[#8b5a2b] uppercase tracking-widest block">RETRO VINYL RECORD</span>
                                  <h5 className="text-sm font-serif font-bold text-[#f4eae1]">{ad.companyName}</h5>
                                  <p className="text-xs text-[#c5b3a3] font-serif italic">Nostaljik tınılar, plak sıcaklığı ve analog müziğin büyülü dünyası.</p>
                                </div>
                                <a href={ad.websiteUrl} target="_blank" referrerPolicy="no-referrer" className="rounded bg-[#8b5a2b] hover:bg-[#6f4520] px-4 py-2 text-xs font-bold text-[#f4eae1] transition shrink-0 ml-4">
                                  PLAKLARI İNCELE
                                </a>
                              </div>
                            )}

                            {ad.templateStyle === "custom" && (
                              <a href={ad.websiteUrl} target="_blank" referrerPolicy="no-referrer" className="block relative group overflow-hidden">
                                {ad.bannerUrl ? (
                                  <img 
                                    src={ad.bannerUrl} 
                                    alt={ad.companyName} 
                                    className="w-full h-24 object-cover group-hover:scale-[1.02] transition duration-300"
                                    referrerPolicy="no-referrer"
                                    onError={(e) => {
                                      // Fallback placeholder image inside error handler
                                      (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=1200&auto=format&fit=crop";
                                    }}
                                  />
                                ) : (
                                  <div className="h-24 w-full bg-neutral-950 flex flex-col items-center justify-center border border-dashed border-neutral-800">
                                    <Megaphone className="h-5 w-5 text-neutral-600 mb-1" />
                                    <span className="text-[11px] text-neutral-400 font-bold">Özel Banner Resmi Belirtilmedi</span>
                                    <span className="text-[9px] text-neutral-600">Firma Linki: {ad.websiteUrl}</span>
                                  </div>
                                )}
                                <div className="absolute top-2 right-2 rounded bg-black/60 backdrop-blur-sm px-1.5 py-0.5 text-[8px] font-bold text-white uppercase tracking-wider">
                                  Sponsorlu
                                </div>
                              </a>
                            )}
                          </div>
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Ban Appeals Management */}
      {activeSubTab === "appeals" && (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 overflow-hidden shadow-xl" id="admin-appeals-card">
          <div className="p-5 border-b border-neutral-800 bg-neutral-950/40">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              🚫 Engel İtiraz Talepleri kanka
            </h3>
            <p className="text-xs text-neutral-400 mt-1">
              Engellenen kullanıcılar tarafından gönderilen engel kaldırma taleplerini buradan inceleyebilir, onaylayıp engelini kaldırabilir veya reddedebilirsin.
            </p>
          </div>

          <div className="p-6">
            {banAppeals.length === 0 ? (
              <div className="py-12 text-center text-neutral-500 text-xs font-medium">
                Henüz hiç engel kaldırma itiraz talebi yok kanka!
              </div>
            ) : (
              <div className="space-y-4">
                {banAppeals.map((appeal: any) => (
                  <div 
                    key={appeal.id} 
                    className={`rounded-xl border p-5 bg-neutral-950/40 flex flex-col md:flex-row md:items-start justify-between gap-6 transition ${
                      appeal.status === "approved"
                        ? "border-emerald-500/30 bg-emerald-500/[0.01]"
                        : appeal.status === "rejected"
                        ? "border-red-500/20 bg-red-500/[0.01] opacity-60"
                        : "border-neutral-800 hover:border-neutral-700"
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="font-bold text-white text-sm">{appeal.name}</span>
                        <span className="text-xs text-neutral-500">•</span>
                        <span className="text-xs text-neutral-400 font-mono">{appeal.email}</span>
                        <span className="text-xs text-neutral-500">•</span>
                        <span className="text-[10px] text-neutral-500">{formatDate(appeal.createdAt)}</span>
                      </div>

                      <div className="rounded-lg bg-neutral-950/90 border border-neutral-800/60 p-3.5 text-xs text-neutral-300 leading-relaxed max-w-2xl font-medium">
                        <span className="text-[10px] font-bold text-red-500/80 block uppercase tracking-wider mb-1">Açıklama:</span>
                        "{appeal.message}"
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-neutral-500 uppercase">Durum:</span>
                        {appeal.status === "pending" && (
                          <span className="rounded bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-[9px] font-bold text-amber-500 uppercase">
                            Beklemede
                          </span>
                        )}
                        {appeal.status === "approved" && (
                          <span className="rounded bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[9px] font-bold text-emerald-500 uppercase">
                            Onaylandı (Engel Kaldırıldı)
                          </span>
                        )}
                        {appeal.status === "rejected" && (
                          <span className="rounded bg-red-500/10 border border-red-500/30 px-2 py-0.5 text-[9px] font-bold text-red-500 uppercase">
                            Reddedildi
                          </span>
                        )}
                      </div>
                    </div>

                    {appeal.status === "pending" && (
                      <div className="flex items-center gap-2 shrink-0 self-end md:self-start">
                        <button
                          onClick={() => handleResolveAppeal(appeal.id, "approve")}
                          disabled={resolvingAppealId === appeal.id}
                          className="rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold px-3.5 py-2 text-xs transition cursor-pointer flex items-center gap-1.5 shadow-lg shadow-emerald-950/20"
                        >
                          {resolvingAppealId === appeal.id ? "..." : "Engeli Kaldır"}
                        </button>
                        <button
                          onClick={() => handleResolveAppeal(appeal.id, "reject")}
                          disabled={resolvingAppealId === appeal.id}
                          className="rounded-lg bg-neutral-800 hover:bg-red-950/40 border border-neutral-700 hover:border-red-900/40 text-neutral-300 hover:text-red-400 font-bold px-3.5 py-2 text-xs transition cursor-pointer"
                        >
                          Reddet
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Announcements Management */}
      {activeSubTab === "announcements" && (
        <div className="space-y-6" id="admin-announcements-tab">
          {/* Create Announcement Form */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5 sm:p-6 shadow-xl">
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <Plus className="h-5 w-5 text-red-500" /> Yeni Sistem Duyurusu Yayınla kanka
            </h3>
            <form onSubmit={handleCreateAnnouncement} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1 md:col-span-2">
                  <label className="text-[11px] font-bold text-neutral-400 uppercase">Duyuru Başlığı</label>
                  <input
                    type="text"
                    required
                    value={newAnnTitle}
                    onChange={(e) => setNewAnnTitle(e.target.value)}
                    placeholder="Örn: Hafta Sonu Bakım Çalışması Hakkında"
                    className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3.5 py-2 text-xs text-white focus:border-red-500 focus:outline-none transition"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-neutral-400 uppercase">Kategori</label>
                  <select
                    value={newAnnCategory}
                    onChange={(e) => setNewAnnCategory(e.target.value)}
                    className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3.5 py-2 text-xs text-white focus:border-red-500 focus:outline-none transition"
                  >
                    <option value="Duyuru">📣 Genel Duyuru</option>
                    <option value="Güncelleme">🚀 Yeni Güncelleme</option>
                    <option value="Bakım">🔧 Bakım Bilgisi</option>
                    <option value="Fırsat">🎉 Premium Fırsat</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-neutral-400 uppercase">Duyuru İçeriği</label>
                <textarea
                  required
                  rows={4}
                  value={newAnnContent}
                  onChange={(e) => setNewAnnContent(e.target.value)}
                  placeholder="Duyuru detaylarını buraya yazın..."
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3.5 py-2 text-xs text-white focus:border-red-500 focus:outline-none transition resize-none leading-relaxed"
                />
              </div>

              {/* Publishing Status & Scheduling */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl border border-neutral-800 bg-neutral-950/50">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-neutral-400 uppercase flex items-center gap-1">
                    🟢 Yayın Durumu
                  </label>
                  <select
                    value={newAnnStatus}
                    onChange={(e: any) => {
                      setNewAnnStatus(e.target.value);
                      if (e.target.value !== "scheduled") {
                        setNewAnnScheduledAt("");
                      }
                    }}
                    className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs text-white focus:border-red-500 focus:outline-none transition font-bold"
                  >
                    <option value="published">🚀 Hemen Yayınla (Aktif)</option>
                    <option value="draft">💾 Taslak Olarak Kaydet (Gizli)</option>
                    <option value="scheduled">⏰ İleri Tarihe Zamanla (Planlanmış)</option>
                  </select>
                </div>

                {newAnnStatus === "scheduled" && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-1"
                  >
                    <label className="text-[11px] font-bold text-neutral-400 uppercase flex items-center gap-1">
                      📅 Yayınlanma Saati
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={newAnnScheduledAt}
                      onChange={(e) => setNewAnnScheduledAt(e.target.value)}
                      className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs text-white focus:border-red-500 focus:outline-none transition font-bold"
                    />
                  </motion.div>
                )}
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={newAnnIsPinned}
                    onChange={(e) => setNewAnnIsPinned(e.target.checked)}
                    className="rounded border-neutral-800 bg-neutral-950 text-red-500 focus:ring-0 focus:ring-offset-0 h-4 w-4"
                  />
                  <span className="text-xs font-bold text-neutral-300">En Üste Sabitle (Öncelikli Göster)</span>
                </label>

                <button
                  type="submit"
                  disabled={creatingAnnouncement}
                  className="rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold px-5 py-2 text-xs transition flex items-center gap-1.5 shadow-lg shadow-red-950/20 cursor-pointer disabled:opacity-50"
                >
                  {newAnnStatus === "draft"
                    ? (creatingAnnouncement ? "Kaydediliyor..." : "Taslak Olarak Kaydet kanka 💾")
                    : newAnnStatus === "scheduled"
                    ? (creatingAnnouncement ? "Planlanıyor..." : "Duyuruyu Zamanla kanka ⏰")
                    : (creatingAnnouncement ? "Yayınlanıyor..." : "Duyuruyu Yayınla kanka 🚀")}
                </button>
              </div>
            </form>
          </div>

          {/* Announcements List */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 overflow-hidden shadow-xl">
            <div className="p-4 bg-neutral-950/50 border-b border-neutral-800 flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-neutral-400" /> Aktif Sistem Duyuruları ({announcements.length})
              </span>
              <button
                onClick={fetchAnnouncements}
                className="text-[10px] font-bold text-red-400 hover:text-white transition flex items-center gap-1"
              >
                <RefreshCw className="h-3 w-3" /> Yenile
              </button>
            </div>

            {announcements.length === 0 ? (
              <div className="py-16 text-center text-neutral-500 text-xs">
                Sistemde henüz yayınlanmış bir duyuru bulunmuyor kanka.
              </div>
            ) : (
              <div className="divide-y divide-neutral-800">
                {announcements.map((ann) => {
                  const isPinned = !!ann.isPinned;
                  return (
                    <div key={ann.id} className="p-5 sm:p-6 hover:bg-neutral-900/10 transition-colors flex flex-col sm:flex-row sm:items-start justify-between gap-4 text-left">
                      <div className="space-y-2 max-w-4xl">
                        <div className="flex flex-wrap items-center gap-2">
                          {isPinned && (
                            <span className="rounded bg-red-500/15 border border-red-500/30 px-2 py-0.5 text-[9px] font-bold text-red-400 uppercase tracking-wider flex items-center gap-0.5">
                              📌 Sabitlendi
                            </span>
                          )}
                          <span className={`rounded px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                            ann.category === "Güncelleme"
                              ? "bg-blue-500/10 border border-blue-500/30 text-blue-400"
                              : ann.category === "Bakım"
                              ? "bg-amber-500/10 border border-amber-500/30 text-amber-500"
                              : ann.category === "Fırsat"
                              ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                              : "bg-neutral-950 border border-neutral-800 text-neutral-400"
                          }`}>
                            {ann.category || "Duyuru"}
                          </span>

                          {/* Publishing status badges */}
                          {ann.status === "draft" ? (
                            <span className="rounded bg-amber-500/15 border border-amber-500/35 px-2 py-0.5 text-[9px] font-bold text-amber-500 uppercase tracking-wider">
                              💾 Taslak (Yayınlanmadı)
                            </span>
                          ) : ann.status === "scheduled" ? (
                            <span className="rounded bg-purple-500/15 border border-purple-500/35 px-2 py-0.5 text-[9px] font-bold text-purple-400 uppercase tracking-wider" title={`Planlanan Tarih: ${formatDate(ann.scheduledAt)}`}>
                              ⏰ Planlandı ({formatDate(ann.scheduledAt)})
                            </span>
                          ) : (
                            <span className="rounded bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 text-[9px] font-bold text-emerald-400 uppercase tracking-wider">
                              🚀 Yayında (Aktif)
                            </span>
                          )}

                          <span className="text-xs font-bold text-neutral-100">{ann.title}</span>
                        </div>

                        <p className="text-xs text-neutral-400 leading-relaxed font-medium whitespace-pre-line">{ann.content}</p>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10px] text-neutral-500 font-medium">
                          <span>Yazar: {ann.authorName || "Yönetici"}</span>
                          <span>•</span>
                          <span>Oluşturulma: {formatDate(ann.createdAt)}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            👁️ {ann.readCount || 0} okuma
                          </span>
                          <span>•</span>
                          <div className="flex flex-wrap items-center gap-1 bg-neutral-950 px-2 py-0.5 rounded border border-neutral-800">
                            <span className="text-[9px] text-neutral-400 font-bold uppercase mr-1">Okuma Ekle kanka:</span>
                            <button
                              onClick={() => handleIncrementReadCount(ann.id, 10)}
                              className="px-1.5 py-0.5 rounded bg-neutral-900 text-[9px] text-neutral-300 font-bold hover:text-white hover:bg-red-500/20 transition cursor-pointer border border-neutral-800"
                            >
                              +10
                            </button>
                            <button
                              onClick={() => handleIncrementReadCount(ann.id, 50)}
                              className="px-1.5 py-0.5 rounded bg-neutral-900 text-[9px] text-neutral-300 font-bold hover:text-white hover:bg-red-500/20 transition cursor-pointer border border-neutral-800"
                            >
                              +50
                            </button>
                            <button
                              onClick={() => handleIncrementReadCount(ann.id, 100)}
                              className="px-1.5 py-0.5 rounded bg-neutral-900 text-[9px] text-neutral-300 font-bold hover:text-white hover:bg-red-500/20 transition cursor-pointer border border-neutral-800"
                            >
                              +100
                            </button>
                            <span className="text-neutral-700 text-[9px] mx-0.5">|</span>
                            <input
                              type="number"
                              min="1"
                              placeholder="Özel"
                              id={`custom-read-count-${ann.id}`}
                              className="w-12 bg-neutral-900 border border-neutral-800 text-[9px] text-white px-1 py-0.5 rounded focus:outline-none focus:border-red-500 text-center font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    const val = parseInt((e.target as HTMLInputElement).value);
                                    if (val > 0) {
                                      handleIncrementReadCount(ann.id, val);
                                      (e.target as HTMLInputElement).value = "";
                                    }
                                  }
                              }}
                            />
                            <button
                              onClick={() => {
                                const input = document.getElementById(`custom-read-count-${ann.id}`) as HTMLInputElement;
                                const val = parseInt(input?.value || "0");
                                if (val > 0) {
                                  handleIncrementReadCount(ann.id, val);
                                  if (input) input.value = "";
                                }
                              }}
                              className="px-1.5 py-0.5 rounded bg-red-600 hover:bg-red-700 text-[9px] text-white font-bold transition cursor-pointer"
                            >
                              Ekle
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 self-end sm:self-start">
                        <button
                          onClick={() => {
                            setEditingAnn(ann);
                            setEditAnnTitle(ann.title);
                            setEditAnnContent(ann.content);
                            setEditAnnCategory(ann.category || "Duyuru");
                            setEditAnnIsPinned(!!ann.isPinned);
                            setEditAnnStatus(ann.status || "published");
                            setEditAnnScheduledAt(ann.scheduledAt || "");
                          }}
                          className="rounded-lg p-2 text-neutral-500 hover:text-amber-400 hover:bg-amber-500/5 transition border border-transparent hover:border-amber-500/10 cursor-pointer"
                          title="Duyuruyu Düzenle (Taslak/Planlama Güncelle)"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteAnnouncement(ann.id)}
                          className="rounded-lg p-2 text-neutral-500 hover:text-red-400 hover:bg-red-500/5 transition border border-transparent hover:border-red-500/10 cursor-pointer"
                          title="Duyuruyu Sistemden Sil"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Edit Announcement Modal */}
          <AnimatePresence>
            {editingAnn && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setEditingAnn(null)}
                  className="fixed inset-0 bg-black/80 backdrop-blur-sm"
                />

                {/* Modal Container */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl z-10"
                >
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-neutral-800">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Edit className="h-5 w-5 text-amber-500" /> Duyuruyu Düzenle
                    </h3>
                    <button
                      type="button"
                      onClick={() => setEditingAnn(null)}
                      className="rounded-lg p-1 text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>

                  <form onSubmit={handleUpdateAnnouncement} className="space-y-4 text-left">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1 md:col-span-2">
                        <label className="text-[11px] font-bold text-neutral-400 uppercase">Duyuru Başlığı</label>
                        <input
                          type="text"
                          required
                          value={editAnnTitle}
                          onChange={(e) => setEditAnnTitle(e.target.value)}
                          placeholder="Duyuru başlığını girin..."
                          className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3.5 py-2 text-xs text-white focus:border-amber-500 focus:outline-none transition"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-neutral-400 uppercase">Kategori</label>
                        <select
                          value={editAnnCategory}
                          onChange={(e) => setEditAnnCategory(e.target.value)}
                          className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3.5 py-2 text-xs text-white focus:border-amber-500 focus:outline-none transition"
                        >
                          <option value="Duyuru">📣 Genel Duyuru</option>
                          <option value="Güncelleme">🚀 Yeni Güncelleme</option>
                          <option value="Bakım">🔧 Bakım Bilgisi</option>
                          <option value="Fırsat">🎉 Premium Fırsat</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-neutral-400 uppercase">Duyuru İçeriği</label>
                      <textarea
                        required
                        rows={5}
                        value={editAnnContent}
                        onChange={(e) => setEditAnnContent(e.target.value)}
                        placeholder="Duyuru detaylarını buraya yazın..."
                        className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3.5 py-2 text-xs text-white focus:border-amber-500 focus:outline-none transition resize-none leading-relaxed font-medium"
                      />
                    </div>

                    {/* Publishing Status & Scheduling */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl border border-neutral-800 bg-neutral-950/50">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-neutral-400 uppercase flex items-center gap-1">
                          🟢 Yayın Durumu
                        </label>
                        <select
                          value={editAnnStatus}
                          onChange={(e: any) => {
                            setEditAnnStatus(e.target.value);
                            if (e.target.value !== "scheduled") {
                              setEditAnnScheduledAt("");
                            }
                          }}
                          className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs text-white focus:border-amber-500 focus:outline-none transition font-bold"
                        >
                          <option value="published">🚀 Hemen Yayınla (Aktif)</option>
                          <option value="draft">💾 Taslak Olarak Kaydet (Gizli)</option>
                          <option value="scheduled">⏰ İleri Tarihe Zamanla (Planlanmış)</option>
                        </select>
                      </div>

                      {editAnnStatus === "scheduled" && (
                        <div className="space-y-1 animate-fade-in">
                          <label className="text-[11px] font-bold text-neutral-400 uppercase flex items-center gap-1">
                            📅 Yayınlanma Saati
                          </label>
                          <input
                            type="datetime-local"
                            required
                            value={editAnnScheduledAt}
                            onChange={(e) => setEditAnnScheduledAt(e.target.value)}
                            className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs text-white focus:border-amber-500 focus:outline-none transition font-bold"
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={editAnnIsPinned}
                          onChange={(e) => setEditAnnIsPinned(e.target.checked)}
                          className="rounded border-neutral-800 bg-neutral-950 text-amber-500 focus:ring-0 focus:ring-offset-0 h-4 w-4"
                        />
                        <span className="text-xs font-bold text-neutral-300">En Üste Sabitle</span>
                      </label>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingAnn(null)}
                          className="rounded-xl border border-neutral-800 bg-neutral-950 hover:bg-neutral-800 text-neutral-300 hover:text-white font-bold px-4 py-2 text-xs transition cursor-pointer"
                        >
                          İptal Et
                        </button>
                        <button
                          type="submit"
                          disabled={updatingAnnouncement}
                          className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold px-5 py-2 text-xs transition flex items-center gap-1.5 shadow-lg shadow-amber-950/20 cursor-pointer disabled:opacity-50"
                        >
                          {updatingAnnouncement ? "Güncelleniyor..." : "Değişiklikleri Kaydet kanka 💾"}
                        </button>
                      </div>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Tab: IP Ban Management */}
      {activeSubTab === "ipbans" && (
        <div className="space-y-6" id="admin-ipbans-tab">
          {/* Add IP Ban Form */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5 sm:p-6 shadow-xl">
            <div className="flex items-center gap-2 mb-2">
              <Network className="h-5 w-5 text-red-500" />
              <h3 className="text-base font-bold text-white">Manuel IP Engelleme Paneli kanka</h3>
            </div>
            <p className="text-xs text-neutral-400 mb-4">
              Tehdit oluşturan veya suistimal eden IP adreslerini sisteme girmeden önce manuel olarak engelleyebilirsin. Engelli IP'ler sitenin dönüştürme aracına erişemez.
            </p>
            <form onSubmit={handleBanIp} className="flex flex-col sm:flex-row items-end gap-3 max-w-2xl">
              <div className="space-y-1.5 w-full">
                <label className="text-[11px] font-bold text-neutral-400 uppercase">Engelenecek IP Adresi</label>
                <input
                  type="text"
                  required
                  value={newIpInput}
                  onChange={(e) => setNewIpInput(e.target.value)}
                  placeholder="Örn: 95.10.28.111 veya 2a00:1d35:93f1..."
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3.5 py-2.5 text-xs text-white focus:border-red-500 focus:outline-none transition font-mono"
                />
              </div>
              <button
                type="submit"
                disabled={banningIp}
                className="w-full sm:w-auto rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold px-5 py-2.5 text-xs transition flex items-center justify-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
              >
                {banningIp ? "Engelleniyor..." : "IP Engelle 🚫"}
              </button>
            </form>
          </div>

          {/* Banned IPs list */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 overflow-hidden shadow-xl">
            <div className="p-4 bg-neutral-950/50 border-b border-neutral-800 flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Globe className="h-4 w-4 text-neutral-400" /> Yasaklı IP Adresleri Listesi ({bannedIpsList.length})
              </span>
              <button
                onClick={fetchIpBans}
                className="text-[10px] font-bold text-red-400 hover:text-white transition flex items-center gap-1"
              >
                <RefreshCw className="h-3 w-3" /> Listeyi Yenile
              </button>
            </div>

            {bannedIpsList.length === 0 ? (
              <div className="py-16 text-center text-neutral-500 text-xs font-medium">
                Sistemde engellenmiş herhangi bir IP adresi bulunmamaktadır kanka. Bütün herkes temiz!
              </div>
            ) : (
              <div className="divide-y divide-neutral-800">
                {bannedIpsList.map((ip) => {
                  const associatedEmail = ipMapping[ip];
                  return (
                    <div key={ip} className="p-4 sm:p-5 hover:bg-neutral-900/10 transition-colors flex items-center justify-between gap-4">
                      <div className="space-y-1">
                        <span className="font-mono text-xs font-bold text-red-400 bg-red-500/5 border border-red-500/10 rounded px-2 py-1 inline-block">
                          {ip}
                        </span>
                        {associatedEmail ? (
                          <div className="text-[10px] text-neutral-400 font-medium flex items-center gap-1.5 mt-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                            <span>Kayıtlı hesap ile ilişkili: </span>
                            <span className="text-neutral-200 font-bold">{associatedEmail}</span>
                          </div>
                        ) : (
                          <div className="text-[10px] text-neutral-500 font-medium flex items-center gap-1.5 mt-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-neutral-700 shrink-0" />
                            <span>Misafir veya Tanımsız Ziyaretçi</span>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => handleUnbanIp(ip)}
                        className="rounded-lg bg-neutral-950 hover:bg-emerald-950/20 border border-neutral-800 hover:border-emerald-500/20 text-neutral-400 hover:text-emerald-500 px-3 py-1.5 text-xs font-bold transition cursor-pointer"
                      >
                        Engeli Kaldır
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Detailed Analytics & Charts */}
      {activeSubTab === "analytics" && (() => {
        // Dynamic calculations
        const total = conversions.length;
        const mp3s = conversions.filter(c => c.format === "mp3");
        const mp4s = conversions.filter(c => c.format === "mp4");
        const completed = conversions.filter(c => c.status === "completed").length;
        const failed = conversions.filter(c => c.status === "failed").length;
        const active = conversions.filter(c => c.status === "processing").length;

        // Calculate ratios
        const mp3Percent = total > 0 ? Math.round((mp3s.length / total) * 100) : 0;
        const mp4Percent = total > 0 ? Math.round((mp4s.length / total) * 100) : 0;
        const successRate = total > 0 ? Math.round((completed / (total - active || 1)) * 100) : 0;

        // Count Quality Choices
        const qualityCount: Record<string, number> = {};
        conversions.forEach(c => {
          qualityCount[c.quality] = (qualityCount[c.quality] || 0) + 1;
        });

        const sortedQuality = Object.entries(qualityCount)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5);

        // Count Guest vs Premium
        const guestConversions = conversions.filter(c => c.userId === "guest").length;
        const userConversions = total - guestConversions;
        const guestPercent = total > 0 ? Math.round((guestConversions / total) * 100) : 0;
        const userPercent = total > 0 ? Math.round((userConversions / total) * 100) : 0;

        return (
          <div className="space-y-6 animate-fade-in" id="admin-analytics-tab">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Box 1: Format Breakdown */}
              <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5 sm:p-6 shadow-xl space-y-5">
                <div className="flex items-center justify-between border-b border-neutral-800/60 pb-3">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Music className="h-4 w-4 text-red-400" /> Medya Format Dağılımı
                  </h4>
                  <span className="text-[10px] font-mono text-neutral-500 font-bold">MP3 vs MP4</span>
                </div>

                <div className="space-y-4">
                  {/* MP3 progress */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-neutral-300 flex items-center gap-1">
                        <Music className="h-3 w-3 text-red-500" /> MP3 Ses Dosyası
                      </span>
                      <span className="text-red-400">{mp3s.length} ({mp3Percent}%)</span>
                    </div>
                    <div className="h-2 w-full bg-neutral-950 rounded-full overflow-hidden">
                      <div className="h-full bg-red-500 rounded-full transition-all duration-1000" style={{ width: `${mp3Percent}%` }} />
                    </div>
                  </div>

                  {/* MP4 progress */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-neutral-300 flex items-center gap-1">
                        <Video className="h-3 w-3 text-blue-500" /> MP4 Video Dosyası
                      </span>
                      <span className="text-blue-400">{mp4s.length} ({mp4Percent}%)</span>
                    </div>
                    <div className="h-2 w-full bg-neutral-950 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full transition-all duration-1000" style={{ width: `${mp4Percent}%` }} />
                    </div>
                  </div>
                </div>

                <div className="bg-neutral-950/60 p-3 rounded-xl border border-neutral-800/40 text-[11px] text-neutral-400 leading-relaxed font-medium">
                  Ziyaretçiler ağırlıklı olarak <strong className="text-white">{mp3Percent > mp4Percent ? "MP3 Ses" : "MP4 Video"}</strong> formatını tercih etmektedir kanka. Sitenin kod yapısı ve sunucu trafiğini buna göre optimize edebilirsin.
                </div>
              </div>

              {/* Box 2: Quality Preferences */}
              <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5 sm:p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-neutral-800/60 pb-3">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Star className="h-4 w-4 text-amber-400" /> En Çok Tercih Edilen Kaliteler
                  </h4>
                  <span className="text-[10px] font-mono text-neutral-500 font-bold">Bitrate / Çözünürlük</span>
                </div>

                {sortedQuality.length === 0 ? (
                  <div className="py-12 text-center text-neutral-500 text-xs">
                    Henüz yeterli kalite verisi birikmedi kanka.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sortedQuality.map(([quality, count]) => {
                      const percent = total > 0 ? Math.round((count / total) * 100) : 0;
                      return (
                        <div key={quality} className="space-y-1">
                          <div className="flex items-center justify-between text-xs font-bold">
                            <span className="text-neutral-300 font-mono text-[11px]">{quality}</span>
                            <span className="text-neutral-400">{count} kez ({percent}%)</span>
                          </div>
                          <div className="h-1.5 w-full bg-neutral-950 rounded-full overflow-hidden">
                            <div className="h-full bg-amber-500 rounded-full transition-all duration-1000" style={{ width: `${percent}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Box 3: User Activity Profile */}
              <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5 sm:p-6 shadow-xl space-y-5">
                <div className="flex items-center justify-between border-b border-neutral-800/60 pb-3">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-emerald-400" /> Kullanıcı Davranış Profili
                  </h4>
                  <span className="text-[10px] font-mono text-neutral-500 font-bold">Kayıtlı vs Ziyaretçi</span>
                </div>

                <div className="space-y-4">
                  {/* Registered users */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-neutral-300">Kayıtlı Üyelerin İstekleri</span>
                      <span className="text-emerald-400">{userConversions} ({userPercent}%)</span>
                    </div>
                    <div className="h-2 w-full bg-neutral-950 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000" style={{ width: `${userPercent}%` }} />
                    </div>
                  </div>

                  {/* Guests */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-neutral-300">Ziyaretçilerin İstekleri</span>
                      <span className="text-neutral-500">{guestConversions} ({guestPercent}%)</span>
                    </div>
                    <div className="h-2 w-full bg-neutral-950 rounded-full overflow-hidden">
                      <div className="h-full bg-neutral-700 rounded-full transition-all duration-1000" style={{ width: `${guestPercent}%` }} />
                    </div>
                  </div>
                </div>

                <div className="bg-neutral-950/60 p-3.5 rounded-xl border border-neutral-800/40 text-[11px] text-neutral-400 flex items-center gap-2">
                  <Info className="h-4 w-4 text-amber-500 shrink-0" />
                  <span>Kayıtlı üyeler sınırsız ve daha yüksek hızda dönüştürme yapabilir kanka.</span>
                </div>
              </div>
            </div>

            {/* Health and Quality Status Tracker Box */}
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6 shadow-xl">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-4 border-b border-neutral-800 pb-3">
                <Activity className="h-4 w-4 text-emerald-500" /> Sistem Başarı ve Dönüşüm Sağlığı Monitörü
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-neutral-950/50 p-4 rounded-xl border border-neutral-800 text-center space-y-1">
                  <span className="block text-[10px] font-bold text-neutral-500 uppercase">Tamamlanan İstekler</span>
                  <span className="text-2xl font-black text-emerald-500 block">{completed}</span>
                  <span className="text-[10px] text-neutral-400 font-medium">Sıkıntısız MP3 / MP4 dosyası</span>
                </div>

                <div className="bg-neutral-950/50 p-4 rounded-xl border border-neutral-800 text-center space-y-1">
                  <span className="block text-[10px] font-bold text-neutral-500 uppercase">Hata Alan İstekler</span>
                  <span className="text-2xl font-black text-red-500 block">{failed}</span>
                  <span className="text-[10px] text-neutral-400 font-medium">Hatalı YouTube URL'leri</span>
                </div>

                <div className="bg-neutral-950/50 p-4 rounded-xl border border-neutral-800 text-center space-y-1">
                  <span className="block text-[10px] font-bold text-neutral-500 uppercase">İşlemi Devam Eden</span>
                  <span className="text-2xl font-black text-blue-400 block">{active}</span>
                  <span className="text-[10px] text-neutral-400 font-medium">Kuyrukta bekleyen aktif işlemler</span>
                </div>

                <div className="bg-neutral-950/50 p-4 rounded-xl border border-neutral-800 text-center space-y-1">
                  <span className="block text-[10px] font-bold text-neutral-500 uppercase">Dönüştürme Başarı Oranı</span>
                  <span className="text-2xl font-black text-white block">{successRate}%</span>
                  <div className="h-1.5 w-24 bg-neutral-900 rounded-full overflow-hidden mx-auto mt-1">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${successRate}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {activeSubTab === "system" && (
        <div className="space-y-6 animate-fade-in font-sans text-left" id="admin-system-tab">
          {/* Database & System Info Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5 sm:p-6 shadow-xl flex items-center gap-4">
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500">
                <Database className="h-6 w-6" />
              </div>
              <div>
                <span className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Veritabanı Dosya Boyutu</span>
                <span className="text-xl font-black text-white block mt-0.5">
                  {dbInfo ? `${(dbInfo.dbSize / 1024).toFixed(1)} KB` : "Yükleniyor..."}
                </span>
                <span className="text-[10px] text-neutral-400 font-medium">Yedeklenebilir JSON veri tabanı</span>
              </div>
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5 sm:p-6 shadow-xl flex items-center gap-4">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-500">
                <Activity className="h-6 w-6" />
              </div>
              <div>
                <span className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Aktif Oturum Sayısı</span>
                <span className="text-xl font-black text-white block mt-0.5">
                  {dbInfo ? `${dbInfo.sessionCount} Oturum` : "Yükleniyor..."}
                </span>
                <span className="text-[10px] text-neutral-400 font-medium">JWT ile bağlı aktif admin/üye oturumları</span>
              </div>
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5 sm:p-6 shadow-xl flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-500">
                <Globe className="h-6 w-6" />
              </div>
              <div className="min-w-0 w-full">
                <span className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Veritabanı Konumu</span>
                <span className="text-xs font-mono font-bold text-neutral-200 block mt-1 truncate" title={dbInfo?.dbPath}>
                  {dbInfo ? dbInfo.dbPath : "Yükleniyor..."}
                </span>
                <span className="text-[10px] text-neutral-400 font-medium">Dahili JSON veritabanı yolu</span>
              </div>
            </div>
          </div>

          {/* Maintenance Actions Card */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5 sm:p-6 shadow-xl">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-2">
              ⚙️ Veritabanı Bakım ve Yönetim İstasyonu
            </h3>
            <p className="text-xs text-neutral-400 mb-6">
              Sistem performansını yüksek tutmak için eski/başarısız dönüştürmeleri temizleyebilir, işlem geçmişlerini optimize edebilir veya güvenli yedek indirebilirsin kanka.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Button 1: Download backup */}
              <button
                onClick={async () => {
                  try {
                    const response = await fetch("/api/admin/system/download-db", {
                      headers: { Authorization: `Bearer ${token}` }
                    });
                    if (!response.ok) throw new Error();
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `database_backup_${new Date().toISOString().slice(0,10)}.json`;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    setSuccessMsg("Veritabanı yedeği başarıyla indirildi kanka! 💾");
                  } catch (err) {
                    setError("Yedek indirilirken hata oluştu.");
                  }
                }}
                className="p-4 rounded-xl border border-neutral-800 bg-neutral-950/60 hover:bg-neutral-900 transition flex flex-col items-center justify-center text-center gap-2 group cursor-pointer"
              >
                <Download className="h-5 w-5 text-red-500 group-hover:scale-110 transition" />
                <span className="text-xs font-bold text-white">Yedek İndir (.json)</span>
                <span className="text-[10px] text-neutral-400">Veritabanını bilgisayarına yedekle kanka</span>
              </button>

              {/* Button 2: Optimize & Clean conversions */}
              <button
                onClick={handleCleanConversions}
                disabled={cleaningConversions}
                className="p-4 rounded-xl border border-neutral-800 bg-neutral-950/60 hover:bg-neutral-900 transition flex flex-col items-center justify-center text-center gap-2 group cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`h-5 w-5 text-amber-500 group-hover:scale-110 transition ${cleaningConversions ? "animate-spin" : ""}`} />
                <span className="text-xs font-bold text-white">Veritabanını Optimize Et</span>
                <span className="text-[10px] text-neutral-400">Eski ve başarısız kayıtları temizle kanka</span>
              </button>

              {/* Button 3: Clear system logs */}
              <button
                onClick={handleClearLogs}
                disabled={clearingLogs}
                className="p-4 rounded-xl border border-neutral-800 bg-neutral-950/60 hover:bg-neutral-900 transition flex flex-col items-center justify-center text-center gap-2 group cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="h-5 w-5 text-red-500 group-hover:scale-110 transition" />
                <span className="text-xs font-bold text-white">Günlükleri Temizle</span>
                <span className="text-[10px] text-neutral-400">Sistem işlem loglarını sıfırla kanka</span>
              </button>
            </div>
          </div>

          {/* System Logs / Activities Terminal */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 overflow-hidden shadow-xl flex flex-col">
            <div className="p-4 bg-neutral-950/50 border-b border-neutral-800 flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-red-500 animate-pulse" /> Canlı Sistem İşlem Günlükleri (Sondan Başa)
              </span>
              <button
                onClick={fetchSystemData}
                className="text-[10px] font-bold text-red-400 hover:text-white transition flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="h-3 w-3" /> Logları Tazele
              </button>
            </div>

            <div className="p-4 bg-neutral-950/30 text-[11px] font-mono overflow-y-auto max-h-96 divide-y divide-neutral-900 space-y-2">
              {systemLogs.length === 0 ? (
                <div className="py-12 text-center text-neutral-500 italic">
                  Henüz kaydedilmiş sistem işlem günlüğü bulunmuyor kanka.
                </div>
              ) : (
                [...systemLogs].reverse().map((log, i) => {
                  let badgeColor = "bg-neutral-800 border-neutral-700 text-neutral-400";
                  if (log.action === "Kayıt") badgeColor = "bg-emerald-500/10 border-emerald-500/20 text-emerald-400";
                  if (log.action === "Giriş") badgeColor = "bg-blue-500/10 border-blue-500/20 text-blue-400";
                  if (log.action === "IP Engellendi") badgeColor = "bg-red-500/10 border-red-500/20 text-red-400";
                  if (log.action === "Dönüştürme") badgeColor = "bg-purple-500/10 border-purple-500/20 text-purple-400";
                  if (log.action === "Temizlik" || log.action === "Optimizasyon") badgeColor = "bg-amber-500/10 border-amber-500/20 text-amber-400";

                  return (
                    <div key={i} className="py-2.5 flex flex-col sm:flex-row sm:items-center gap-2">
                      <span className="text-neutral-500 shrink-0 font-bold">{formatDate(log.timestamp)}</span>
                      <span className={`inline-block px-2 py-0.5 rounded border text-[9px] font-extrabold uppercase tracking-wide shrink-0 ${badgeColor}`}>
                        {log.action}
                      </span>
                      <span className="text-neutral-300 min-w-0 break-all">{log.details}</span>
                      {log.ip && (
                        <span className="text-neutral-500 text-[10px] ml-auto shrink-0 font-bold bg-neutral-950/80 px-1.5 py-0.5 rounded border border-neutral-800/40">
                          IP: {log.ip}
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Live Support Management */}
      {activeSubTab === "support" && (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 shadow-xl overflow-hidden flex flex-col md:flex-row h-[600px] text-left" id="admin-support-panel">
          {/* Left Column: Sessions List */}
          <div className="w-full md:w-[320px] border-r border-neutral-800 bg-neutral-950/25 flex flex-col shrink-0 h-full">
            <div className="p-4 border-b border-neutral-800 bg-neutral-950/50">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-2">
                💬 Aktif Destek Talepleri
              </h3>
              <p className="text-[11px] text-neutral-400">
                Kullanıcılar ve misafirlerden gelen canlı destek oturumları.
              </p>
            </div>

            {/* DESTEK AYARLARI PANELİ */}
            <div className="p-4 border-b border-neutral-800 bg-neutral-900/60 text-xs shrink-0">
              <h4 className="font-bold text-neutral-300 uppercase tracking-wide text-[10px] mb-2.5 flex items-center gap-1">
                ⚙️ CANLI DESTEK AYARLARI
              </h4>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-neutral-400 font-bold">Destek Durumu:</span>
                  <button
                    onClick={() => {
                      setSupportEnabled(!supportEnabled);
                    }}
                    className={`px-2.5 py-1 rounded text-[10px] font-black uppercase transition-colors cursor-pointer border ${
                      supportEnabled 
                        ? "bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20" 
                        : "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20"
                    }`}
                  >
                    {supportEnabled ? "AÇIK 🟢" : "KAPALI 🔴"}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Açılış</label>
                    <input
                      type="text"
                      placeholder="09:00"
                      value={supportStartHour}
                      onChange={(e) => setSupportStartHour(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-1.5 text-xs text-white font-mono text-center focus:outline-none focus:border-red-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Kapanış</label>
                    <input
                      type="text"
                      placeholder="18:00"
                      value={supportEndHour}
                      onChange={(e) => setSupportEndHour(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-1.5 text-xs text-white font-mono text-center focus:outline-none focus:border-red-500/50"
                    />
                  </div>
                </div>

                <button
                  onClick={handleSaveSupportConfig}
                  disabled={savingSupportConfig}
                  className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-black uppercase tracking-wider py-1.5 rounded text-[10px] transition cursor-pointer"
                >
                  {savingSupportConfig ? "Kaydediliyor..." : "AYARLARI KAYDET ⚡"}
                </button>
              </div>
            </div>

            {/* Sessions Scrollable Area */}
            <div className="flex-1 overflow-y-auto divide-y divide-neutral-800/60">
              {supportSessions.length === 0 ? (
                <div className="p-8 text-center text-neutral-500 text-xs italic">
                  Henüz aktif bir destek talebi bulunmuyor kanka.
                </div>
              ) : (
                supportSessions.map((session) => {
                  const isSelected = selectedSupportSessionId === session.sessionId;
                  const hasUnread = session.unreadCount > 0;
                  
                  return (
                    <div
                      key={session.sessionId}
                      onClick={() => {
                        setSelectedSupportSessionId(session.sessionId);
                        handleMarkSupportAsRead(session.sessionId);
                      }}
                      className={`p-3.5 flex items-start gap-3 hover:bg-neutral-900/40 transition cursor-pointer relative ${
                        isSelected ? "bg-red-950/20 border-l-2 border-red-500" : ""
                      }`}
                    >
                      {/* Avatar */}
                      <div className="h-9 w-9 rounded-full bg-red-600/10 border border-red-500/20 text-red-400 font-bold text-xs flex items-center justify-center shrink-0 uppercase">
                        {session.userName.charAt(0)}
                      </div>

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className={`text-xs block truncate ${hasUnread ? "font-black text-white" : "font-semibold text-neutral-200"}`}>
                              {session.userName}
                            </span>
                            {session.status === "closed" ? (
                              <span className="text-[8px] bg-red-500/15 text-red-400 border border-red-500/10 px-1 py-0.5 rounded font-black shrink-0 uppercase">Sonlandı</span>
                            ) : (
                              <span className="text-[8px] bg-green-500/15 text-green-400 border border-green-500/10 px-1 py-0.5 rounded font-black shrink-0 uppercase">Aktif</span>
                            )}
                          </div>
                          <span className="text-[9px] text-neutral-500 font-mono shrink-0">
                            {formatDate(session.lastMessageAt).split(" ")[1] || formatDate(session.lastMessageAt)}
                          </span>
                        </div>
                        <span className="text-[10px] text-neutral-400 block truncate mt-0.5">
                          {session.userEmail || "Misafir E-posta Yok"}
                        </span>
                        <p className={`text-[11px] truncate mt-1.5 ${hasUnread ? "text-red-400 font-bold" : "text-neutral-500"}`}>
                          {session.lastSender === "support" ? "Siz: " : ""}{session.lastMessage}
                        </p>
                      </div>

                      {/* Badge / Actions */}
                      <div className="flex flex-col items-end justify-between self-stretch shrink-0">
                        {hasUnread && (
                          <span className="h-4 min-w-[16px] px-1 rounded-full bg-red-600 text-[9px] font-black text-white flex items-center justify-center animate-pulse">
                            {session.unreadCount}
                          </span>
                        )}
                        <div className="flex items-center gap-1 mt-auto">
                          {session.status !== "closed" && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEndSupportSession(session.sessionId);
                              }}
                              className="p-1 rounded hover:bg-amber-500/10 text-neutral-500 hover:text-amber-500 transition cursor-pointer"
                              title="Sohbeti Sonlandır"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSupportSession(session.sessionId);
                            }}
                            className="p-1 rounded hover:bg-red-500/10 text-neutral-500 hover:text-red-500 transition cursor-pointer"
                            title="Sohbeti Tamamen Sil"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Chat Box & Canned Responses */}
          <div className="flex-1 flex flex-col h-full bg-neutral-950/10 relative">
            {selectedSupportSessionId ? (
              (() => {
                const currentSession = supportSessions.find(s => s.sessionId === selectedSupportSessionId);
                const userDisplayName = currentSession ? currentSession.userName : "Destek";
                const userEmailAddress = currentSession ? currentSession.userEmail : "";
                
                return (
                  <>
                    {/* Chat Header */}
                    <div className="px-4 py-3 border-b border-neutral-800 bg-neutral-950/40 flex items-center justify-between shrink-0">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${currentSession?.status === "closed" ? "bg-red-500" : "bg-green-500"}`} />
                          <h4 className="text-xs font-bold text-white uppercase tracking-wide">
                            {userDisplayName} ile Sohbet {currentSession?.status === "closed" ? "(SONLANDIRILDI 🔴)" : "(AKTİF 🟢)"}
                          </h4>
                        </div>
                        <span className="text-[10px] text-neutral-500 font-mono mt-0.5 block">
                          E-Posta: {userEmailAddress || "Belirtilmemiş"} • ID: {selectedSupportSessionId}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {currentSession?.status !== "closed" && (
                          <button
                            onClick={() => handleEndSupportSession(selectedSupportSessionId)}
                            className="px-2.5 py-1 text-[10px] font-bold text-amber-400 hover:text-white bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 rounded transition cursor-pointer"
                          >
                            Sonlandır 🛑
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteSupportSession(selectedSupportSessionId)}
                          className="px-2.5 py-1 text-[10px] font-bold text-red-400 hover:text-white bg-red-600/10 hover:bg-red-600/20 border border-red-500/20 rounded transition cursor-pointer"
                        >
                          Sohbeti Sil 🗑️
                        </button>
                        <button
                          onClick={() => setSelectedSupportSessionId(null)}
                          className="px-2 py-1 text-[10px] font-bold text-neutral-400 hover:text-white border border-neutral-800 hover:border-neutral-700 rounded transition cursor-pointer"
                        >
                          Kapat
                        </button>
                      </div>
                    </div>

                    {/* Chat Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-neutral-950/20">
                      {loadingSupport ? (
                        <div className="h-full flex items-center justify-center">
                          <div className="h-6 w-6 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
                        </div>
                      ) : supportMessages.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-xs text-neutral-500 italic">
                          Mesaj geçmişi yükleniyor veya boş kanka...
                        </div>
                      ) : (
                        supportMessages.map((msg) => (
                          <div
                            key={msg.id}
                            className={`flex flex-col ${msg.sender === "support" ? "items-end" : "items-start"}`}
                          >
                            <span className="text-[9px] text-neutral-500 mb-1 px-1 font-semibold uppercase">
                              {msg.sender === "support" ? "SİZ (Yönetici)" : msg.userName}
                            </span>
                            <div
                              className={`max-w-[80%] rounded-xl px-3.5 py-2 text-xs font-medium leading-relaxed ${
                                msg.sender === "support"
                                  ? "bg-amber-500 text-neutral-950 font-bold rounded-tr-none shadow shadow-amber-500/10"
                                  : "bg-neutral-800 text-neutral-100 rounded-tl-none border border-neutral-700/40"
                              }`}
                            >
                              {msg.text}
                            </div>
                            <span className="text-[8px] text-neutral-500 mt-1 px-1 font-mono">
                              {formatDate(msg.createdAt)}
                            </span>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Canned Responses (Hazır Yazılar) Section */}
                    {currentSession?.status !== "closed" && (
                      <div className="px-4 py-2.5 bg-neutral-950/60 border-t border-neutral-800 shrink-0">
                        <span className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                          ⚡️ Hazır Yazılar (Tıkla ve Anında Gönder kanka):
                        </span>
                        <div className="flex flex-wrap gap-1.5 max-h-[100px] overflow-y-auto pr-1">
                          <button
                            type="button"
                            onClick={() => handleSendSupportReply("Merhaba, YouTube Converter Destek ekibine hoş geldiniz! Size nasıl yardımcı olabilirim? 😊")}
                            className="px-2 py-1 rounded bg-neutral-850 hover:bg-red-600/20 border border-neutral-800 hover:border-red-500/30 text-[10px] text-neutral-300 hover:text-white transition cursor-pointer font-semibold"
                          >
                            👋 Selamlama
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSendSupportReply("Ödemelerinizi Garanti BBVA TR93 0006 2000 0001 2345 6789 01 (Alıcı: Tümay Işıldak) hesabımıza Havale/EFT ile yapabilirsiniz. Dekontunuzu yaptıktan sonra buradan bize bildirin, Premium hesabınızı 5 dakikada onaylayalım! 💳")}
                            className="px-2 py-1 rounded bg-neutral-850 hover:bg-red-600/20 border border-neutral-800 hover:border-red-500/30 text-[10px] text-neutral-300 hover:text-white transition cursor-pointer font-semibold"
                          >
                            💳 Ödeme / IBAN
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSendSupportReply("Ödemeniz başarıyla kontrol edildi kanka! Premium üyeliğiniz hesabınızda aktif edilmiştir. Sınırsız 320kbps MP3 ve 4K MP4 indirme hızlarının keyfini çıkarın! ✨")}
                            className="px-2 py-1 rounded bg-neutral-850 hover:bg-red-600/20 border border-neutral-800 hover:border-red-500/30 text-[10px] text-neutral-300 hover:text-white transition cursor-pointer font-semibold"
                          >
                            🎉 Premium Onay
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSendSupportReply("Yaşadığınız dönüştürme hatası YouTube sunucularındaki geçici yoğunluktan veya videonun bölge kısıtlamasından kaynaklanabilir. Lütfen sayfayı yenileyip farklı bir kaliteyle (örneğin 320kbps yerine 256kbps veya 1080p yerine 720p) tekrar deneyin kanka. 🔄")}
                            className="px-2 py-1 rounded bg-neutral-850 hover:bg-red-600/20 border border-neutral-800 hover:border-red-500/30 text-[10px] text-neutral-300 hover:text-white transition cursor-pointer font-semibold"
                          >
                            🔄 Hata Çözümü
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSendSupportReply("Dönüştürme hızları sunucu yoğunluğuna göre değişir. Premium üyelikte saniyede 100MB indirme hızına sahip özel VIP kanalları kullanılır kanka. ⚡")}
                            className="px-2 py-1 rounded bg-neutral-850 hover:bg-red-600/20 border border-neutral-800 hover:border-red-500/30 text-[10px] text-neutral-300 hover:text-white transition cursor-pointer font-semibold"
                          >
                            ⚡ Hız Sorunu
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSendSupportReply("Yardımcı olabildiğime sevindim! Başka bir sorunuz olursa çekinmeden yazabilirsiniz. İyi günler ve keyifli dönüştürmeler dileriz! 🌟")}
                            className="px-2 py-1 rounded bg-neutral-850 hover:bg-red-600/20 border border-neutral-800 hover:border-red-500/30 text-[10px] text-neutral-300 hover:text-white transition cursor-pointer font-semibold"
                          >
                            🌸 Kapatış / İyi Günler
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Chat Input form */}
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (currentSession?.status !== "closed") {
                          handleSendSupportReply();
                        }
                      }}
                      className="p-3 border-t border-neutral-800 bg-neutral-950/40 flex gap-2 shrink-0"
                    >
                      <input
                        type="text"
                        disabled={currentSession?.status === "closed"}
                        value={supportReplyInput}
                        onChange={(e) => setSupportReplyInput(e.target.value)}
                        placeholder={currentSession?.status === "closed" ? "Bu sohbet sonlandırılmıştır kanka." : "Destek cevabınızı buraya yazın kanka..."}
                        className="flex-1 rounded-lg border border-neutral-800 bg-neutral-950 px-3.5 py-2 text-xs text-white placeholder-neutral-500 focus:border-red-500 focus:outline-none transition disabled:opacity-50"
                      />
                      <button
                        type="submit"
                        disabled={currentSession?.status === "closed"}
                        className="rounded-lg bg-red-600 hover:bg-red-700 disabled:bg-neutral-800 disabled:text-neutral-500 px-4 py-2 text-xs font-bold text-white transition cursor-pointer shrink-0"
                      >
                        Yanıtla
                      </button>
                    </form>
                  </>
                );
              })()
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <div className="h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mb-3">
                  <Headphones className="h-6 w-6" />
                </div>
                <h4 className="text-sm font-bold text-white mb-1">
                  Canlı Destek Masası 👩‍💻
                </h4>
                <p className="text-xs text-neutral-500 max-w-xs leading-relaxed">
                  Lütfen sol listeden bir kullanıcı veya misafir seçerek canlı sohbeti başlatın kanka. Yazılan mesajları ve IBAN dekont taleplerini buradan onaylayabilirsin.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Censorship Management */}
      {activeSubTab === "censorship" && (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6 shadow-xl text-left" id="admin-censorship-panel">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-800 pb-5 mb-6">
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                🚫 Otomatik Küfür & Sansür Filtresi
              </h3>
              <p className="text-xs text-neutral-400 mt-1 max-w-2xl leading-relaxed">
                Sosyal Hub gönderilerinde, yorumlarında, arkadaş arası özel mesajlaşmalarda ve canlı destekte geçen küfür ve argo kelimeleri engellemek için dinamik sansür listesi. Eklenen kelimeler otomatik olarak yıldızlanır (<span className="text-red-400 font-mono">***</span>).
              </p>
            </div>
            <button
              onClick={() => {
                if (confirm("Yasaklı kelime listesini varsayılan sisteme sıfırlamak istediğinizden emin misiniz kanka?")) {
                  const defaultWords = [
                    "orospu çocuğu", "orospu cocugu", "amına koyayım", "amınakoyayım",
                    "pezevenk", "orospu", "siktir", "sikeyim", "sikerim", "götveren", "gotveren",
                    "amcık", "amcik", "yarrak", "yarak", "taşşak", "tassak", "kaltak", "gavat",
                    "ibne", "kahpe", "amk", "aq", "piç", "pic", "göt", "got", "sik"
                  ];
                  setCensoredWordsList(defaultWords);
                  handleSaveCensoredWordsList(defaultWords);
                }
              }}
              className="px-4 py-2.5 rounded-xl border border-neutral-800 hover:border-red-500/30 hover:bg-red-500/5 text-xs font-bold text-neutral-400 hover:text-red-400 transition cursor-pointer shrink-0"
            >
              🔄 Varsayılana Sıfırla
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Box: Add new Word */}
            <div className="space-y-4">
              <div className="rounded-xl border border-neutral-800/80 bg-neutral-950/20 p-4">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                  ➕ Yeni Kelime Ekle kanka
                </h4>
                <form onSubmit={handleAddCensoredWord} className="space-y-3">
                  <input
                    type="text"
                    value={newCensoredWord}
                    onChange={(e) => setNewCensoredWord(e.target.value)}
                    placeholder="Engellenecek kelime veya öbek..."
                    className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3.5 py-2 text-xs text-white placeholder-neutral-500 focus:border-red-500 focus:outline-none transition font-semibold"
                  />
                  <button
                    type="submit"
                    disabled={savingCensoredWords}
                    className="w-full rounded-lg bg-red-600 hover:bg-red-700 disabled:bg-neutral-800 disabled:text-neutral-500 px-4 py-2 text-xs font-bold text-white transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {savingCensoredWords ? (
                      <>
                        <div className="h-3 w-3 animate-spin rounded-full border border-white border-t-transparent" />
                        Kaydediliyor...
                      </>
                    ) : (
                      "Listeye Ekle & Kaydet"
                    )}
                  </button>
                </form>
              </div>

              {/* Tips */}
              <div className="rounded-xl border border-neutral-850 bg-neutral-950/10 p-4 text-[11px] text-neutral-400 leading-relaxed space-y-2">
                <div className="font-bold text-white uppercase tracking-wider text-[10px] mb-1">💡 SANSÜR İPUÇLARI</div>
                <p>• Kelimeleri küçük harfle girin. Sistem otomatik olarak büyük/küçük duyarsız sansürleme yapar.</p>
                <p>• Birden fazla kelimelik küfür öbeklerini (örn: "amına koyayım") tek bir satırda girerek tam eşleşme sağlayabilirsiniz.</p>
                <p>• Listenin güncelliği veri tabanına (<span className="font-mono text-amber-500">database.json</span>) anında yazılır kanka.</p>
              </div>
            </div>

            {/* Right Box: Current Words List */}
            <div className="lg:col-span-2 rounded-xl border border-neutral-800/80 bg-neutral-950/20 p-5 flex flex-col h-[400px]">
              <div className="flex items-center justify-between gap-4 border-b border-neutral-800/60 pb-3 mb-4 shrink-0">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  🛡️ Aktif Yasaklı Kelimeler ({censoredWordsList.length})
                </h4>
                {/* Internal list search */}
                <input
                  type="text"
                  placeholder="Kelimelerde ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-1 text-[11px] text-white placeholder-neutral-500 focus:border-red-500 focus:outline-none transition font-semibold w-40"
                />
              </div>

              {/* Scrollable list of pills */}
              <div className="flex-1 overflow-y-auto pr-1">
                {loadingCensoredWords ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
                  </div>
                ) : censoredWordsList.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-neutral-500 italic">
                    Yasaklı kelime listesi boş kanka!
                  </div>
                ) : (
                  (() => {
                    const filteredWords = censoredWordsList.filter(word => 
                      word.includes(searchQuery.toLowerCase())
                    );
                    
                    if (filteredWords.length === 0) {
                      return (
                        <div className="p-8 text-center text-xs text-neutral-500 italic">
                          Arama sonucuna uygun kelime bulunamadı kanka.
                        </div>
                      );
                    }
                    
                    return (
                      <div className="flex flex-wrap gap-2">
                        {filteredWords.map((word) => (
                          <div
                            key={word}
                            className="pl-3 pr-1.5 py-1.5 rounded-full bg-neutral-900 border border-neutral-800 hover:border-red-500/40 text-xs font-semibold text-neutral-200 flex items-center gap-1.5 transition-all group"
                          >
                            <span>{word}</span>
                            <button
                              onClick={() => handleRemoveCensoredWord(word)}
                              className="p-0.5 rounded-full hover:bg-red-500/10 text-neutral-500 hover:text-red-500 transition cursor-pointer"
                              title="Sil"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    );
                  })()
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
