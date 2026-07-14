import React, { useState, useEffect } from "react";
import { 
  Bell, 
  Plus, 
  Trash2, 
  Calendar, 
  User as UserIcon, 
  Send, 
  Megaphone, 
  Check, 
  Eye, 
  Pin, 
  Search, 
  Filter, 
  Sparkles, 
  AlertTriangle, 
  Award, 
  Info 
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { User, Announcement } from "../types";

interface AnnouncementsProps {
  currentUser: User | null;
  announcements: Announcement[];
  onRefresh: () => void;
  token: string | null;
}

export default function Announcements({
  currentUser,
  announcements,
  onRefresh,
  token,
}: AnnouncementsProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<"Duyuru" | "Güncelleme" | "Bakım" | "Kampanya">("Duyuru");
  const [isPinned, setIsPinned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Search and Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("Hepsi");

  // Local read tracker state
  const [readIds, setReadIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("read_announcements") || "[]");
      setReadIds(saved);
    } catch (e) {}
  }, []);

  const isAdmin = currentUser?.role === "admin";

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    if (!title || !content) {
      setError("Başlık ve içerik alanları doldurulmalıdır.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/announcements", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title, content, category, isPinned }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Duyuru eklenemedi.");
      }

      setSuccess("Duyuru başarıyla yayınlandı!");
      setTitle("");
      setContent("");
      setCategory("Duyuru");
      setIsPinned(false);
      onRefresh(); // Refresh announcements list in App state
    } catch (err: any) {
      setError(err.message || "Bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Bu duyuruyu silmek istediğinizden emin misiniz?")) return;

    try {
      const response = await fetch(`/api/announcements/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Duyuru silinemedi.");
      }

      onRefresh();
    } catch (err: any) {
      alert(err.message || "Duyuru silinirken bir hata oluştu.");
    }
  };

  const handleAcknowledge = async (id: string) => {
    if (readIds.includes(id)) return;

    try {
      const response = await fetch(`/api/announcements/${id}/acknowledge`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: currentUser?.id }),
      });

      if (response.ok) {
        const updated = [...readIds, id];
        setReadIds(updated);
        localStorage.setItem("read_announcements", JSON.stringify(updated));
        onRefresh(); // Refresh to update read count in UI
      }
    } catch (e) {}
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("tr-TR", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (e) {
      return dateStr;
    }
  };

  // Filter and search announcements locally
  const filteredAnnouncements = announcements.filter((ann) => {
    const matchesSearch = 
      ann.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      ann.content.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = 
      selectedCategory === "Hepsi" || 
      ann.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const getCategoryBadge = (cat?: string) => {
    switch (cat) {
      case "Güncelleme":
        return (
          <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <Sparkles className="h-3 w-3" /> Güncelleme
          </span>
        );
      case "Bakım":
        return (
          <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <AlertTriangle className="h-3 w-3" /> Bakım
          </span>
        );
      case "Kampanya":
        return (
          <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Award className="h-3 w-3" /> Kampanya
          </span>
        );
      case "Duyuru":
      default:
        return (
          <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400">
            <Megaphone className="h-3 w-3" /> Duyuru
          </span>
        );
    }
  };

  return (
    <div className="mx-auto max-w-4xl py-8 px-4 animate-fade-in" id="announcements-container">
      {/* Title */}
      <div className="mb-8" id="announcements-title-section">
        <h2 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
          <Megaphone className="h-6 w-6 text-red-500" /> Duyurular ve Güncellemeler
        </h2>
        <p className="mt-1 text-sm text-neutral-400">
          İnanmp3gg sistem güncellemelerini, bakım çalışmalarını ve yeni eklenen özellikleri buradan takip edebilirsiniz.
        </p>
      </div>

      {/* Admin Panel: Add Announcement */}
      {isAdmin && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6 shadow-lg relative overflow-hidden"
          id="announcements-add-form"
        >
          {/* Subtle gold decoration line */}
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-amber-500/0 via-amber-500/40 to-amber-500/0" />

          <h3 className="text-base font-bold text-amber-500 flex items-center gap-2 mb-4">
            <Plus className="h-5 w-5" /> Yeni Duyuru Yayınla (Yönetici Paneli)
          </h3>

          {error && <div className="mb-4 text-xs text-red-400 bg-red-950/20 border border-red-900 rounded-lg p-3">{error}</div>}
          {success && <div className="mb-4 text-xs text-green-400 bg-green-950/20 border border-green-900 rounded-lg p-3">{success}</div>}

          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-8">
                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">Duyuru Başlığı</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Örn: Sunucu Bakımı Hakkında / Yeni Özellik!"
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-950 py-2.5 px-3.5 text-sm text-white focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 transition"
                  id="announcement-title-input"
                />
              </div>

              <div className="md:col-span-4">
                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">Kategori</label>
                <select
                  value={category}
                  onChange={(e: any) => setCategory(e.target.value)}
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-950 py-2.5 px-3.5 text-sm text-white focus:border-red-500 focus:outline-none transition"
                  id="announcement-category-select"
                >
                  <option value="Duyuru">Duyuru</option>
                  <option value="Güncelleme">Güncelleme</option>
                  <option value="Bakım">Bakım</option>
                  <option value="Kampanya">Kampanya</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">Duyuru İçeriği</label>
              <textarea
                required
                rows={4}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Duyuru detaylarını buraya yazın..."
                className="w-full rounded-lg border border-neutral-800 bg-neutral-950 py-2.5 px-3.5 text-sm text-white focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 transition resize-none"
                id="announcement-content-input"
              />
            </div>

            {/* Pin to Top Toggle Option */}
            <div className="flex items-center gap-2 py-1">
              <input
                type="checkbox"
                id="is-pinned-checkbox"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                className="h-4 w-4 rounded border-neutral-800 bg-neutral-950 text-amber-500 focus:ring-amber-500/20"
              />
              <label htmlFor="is-pinned-checkbox" className="text-xs font-medium text-neutral-300 flex items-center gap-1.5 cursor-pointer select-none">
                <Pin className="h-3.5 w-3.5 text-amber-500 fill-amber-500/10" /> Bu duyuruyu en üste sabitle (Altın Çerçeveli Gözükür)
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 rounded-lg bg-red-600 hover:bg-red-700 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-red-950/10 transition cursor-pointer disabled:opacity-50"
              id="announcement-submit-btn"
            >
              {loading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <Send className="h-4 w-4" /> Duyuruyu Yayınla
                </>
              )}
            </button>
          </form>
        </motion.div>
      )}

      {/* Advanced Filter and Search Row */}
      <div className="mb-6 flex flex-col sm:flex-row items-center gap-4 bg-neutral-900/20 border border-neutral-800/60 p-4 rounded-xl" id="announcements-filter-bar">
        {/* Search */}
        <div className="relative w-full sm:flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Duyurularda ara..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-neutral-800 bg-neutral-950 text-white focus:border-red-500 focus:outline-none transition"
            id="ann-search-input"
          />
        </div>

        {/* Categories Filtering tabs */}
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto" id="ann-category-filters">
          <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-500 mr-1.5 hidden md:inline flex items-center gap-1">
            <Filter className="h-3 w-3" /> Filtrele:
          </span>
          {["Hepsi", "Duyuru", "Güncelleme", "Bakım", "Kampanya"].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                selectedCategory === cat
                  ? "bg-red-500/15 border border-red-500/30 text-red-400"
                  : "bg-neutral-950 border border-neutral-800 text-neutral-400 hover:text-white"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Announcements List */}
      <div className="space-y-6" id="announcements-list-wrapper">
        <AnimatePresence mode="popLayout">
          {filteredAnnouncements.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12 rounded-2xl border border-dashed border-neutral-800 bg-neutral-950/20"
              id="announcements-empty"
            >
              <Bell className="h-10 w-10 text-neutral-600 mx-auto mb-3 animate-pulse" />
              <p className="text-neutral-500 text-sm">Arama kriterlerine uygun duyuru bulunamadı.</p>
            </motion.div>
          ) : (
            filteredAnnouncements.map((ann) => {
              const isPinnedItem = !!ann.isPinned;
              const hasRead = readIds.includes(ann.id) || (currentUser && ann.acknowledgedBy?.includes(currentUser.id));

              return (
                <motion.article
                  key={ann.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`rounded-2xl border p-6 relative overflow-hidden group shadow-xl transition-all duration-300 ${
                    isPinnedItem 
                      ? "border-amber-500/40 bg-gradient-to-br from-amber-500/[0.03] to-neutral-900/40" 
                      : "border-neutral-800 bg-neutral-900/40 hover:border-neutral-700/60"
                  }`}
                  id={`announcement-card-${ann.id}`}
                >
                  {/* Glowing subtle border effect for pinned */}
                  {isPinnedItem ? (
                    <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-amber-500/0 via-amber-500/50 to-amber-500/0" />
                  ) : (
                    <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-neutral-700/30 to-transparent" />
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="space-y-2">
                      {/* Top Badges */}
                      <div className="flex flex-wrap items-center gap-2">
                        {isPinnedItem && (
                          <span className="flex items-center gap-0.5 text-[10px] font-black tracking-wider uppercase px-2 py-0.5 rounded bg-amber-500 text-neutral-950 animate-pulse">
                            <Pin className="h-3 w-3 fill-neutral-950" /> Sabitlendi
                          </span>
                        )}
                        {getCategoryBadge(ann.category)}
                      </div>

                      <h3 className={`text-lg font-bold tracking-tight leading-snug transition-colors ${
                        isPinnedItem 
                          ? "text-amber-100 group-hover:text-amber-400" 
                          : "text-white group-hover:text-red-400"
                      }`}>
                        {ann.title}
                      </h3>

                      {/* Metadata */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-neutral-500 font-medium">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 text-neutral-600" /> {formatDate(ann.createdAt)}
                        </span>
                        <span className="flex items-center gap-1">
                          <UserIcon className="h-3.5 w-3.5 text-neutral-600" /> {ann.authorName}
                        </span>
                        <span className="flex items-center gap-1 text-neutral-400/80 bg-neutral-950/40 rounded px-1.5 py-0.5 border border-neutral-800/30">
                          <Eye className="h-3.5 w-3.5 text-neutral-500" /> {ann.readCount || 0} okundu
                        </span>
                      </div>
                    </div>

                    {/* Actions & Read acknowledgment for user */}
                    <div className="flex items-center gap-2 self-end sm:self-start">
                      {/* Mark as read button */}
                      {hasRead ? (
                        <span className="flex items-center gap-1 text-xs text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-2.5 py-1.5 font-bold">
                          <Check className="h-4 w-4" /> Okundu
                        </span>
                      ) : (
                        <button
                          onClick={() => handleAcknowledge(ann.id)}
                          className="flex items-center gap-1 text-xs text-white hover:text-red-400 bg-red-600 hover:bg-red-700/20 border border-red-600/30 hover:border-red-500/40 rounded-lg px-3 py-1.5 font-bold transition cursor-pointer"
                          id={`ann-ack-btn-${ann.id}`}
                        >
                          <Check className="h-3.5 w-3.5" /> Okudum / Anladım
                        </button>
                      )}

                      {/* Actions for Admin */}
                      {isAdmin && (
                        <button
                          onClick={() => handleDelete(ann.id)}
                          className="rounded-lg bg-neutral-950 hover:bg-red-950/40 p-2 text-neutral-500 hover:text-red-500 border border-neutral-800 hover:border-red-900/60 transition cursor-pointer"
                          title="Duyuruyu Sil"
                          id={`announcement-delete-${ann.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Announcement Content */}
                  <div className="mt-4 text-neutral-300 text-sm leading-relaxed whitespace-pre-wrap font-sans border-t border-neutral-800/40 pt-4" id={`ann-content-${ann.id}`}>
                    {ann.content}
                  </div>
                </motion.article>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
