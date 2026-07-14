import React from "react";
import { Download, Play, Music, Video, RefreshCw, Calendar, Trash2, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ConversionRecord } from "../types";

interface HistoryListProps {
  history: ConversionRecord[];
  onRefresh: () => void;
}

export default function HistoryList({ history, onRefresh }: HistoryListProps) {
  // Extract YouTube ID for real thumbnail
  const getYoutubeId = (url: string): string | null => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("tr-TR", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="mx-auto max-w-4xl py-8 px-4" id="history-container">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8" id="history-title-row">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <Clock className="h-6 w-6 text-red-500" /> Dönüştürme Geçmişi
          </h2>
          <p className="mt-1 text-sm text-neutral-400">
            Son yaptığınız ses ve video dönüştürme kayıtlarını görüntüleyin ve doğrudan indirin.
          </p>
        </div>
        <button
          onClick={onRefresh}
          className="self-start sm:self-center flex items-center gap-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 px-3.5 py-2 text-xs font-semibold text-neutral-300 border border-neutral-800 cursor-pointer active:scale-95 transition"
          id="history-refresh-btn"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Yenile
        </button>
      </div>

      {/* History Items List */}
      <div className="space-y-4" id="history-items-list">
        <AnimatePresence mode="popLayout">
          {history.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16 rounded-2xl border border-dashed border-neutral-800 bg-neutral-950/20"
              id="history-empty"
            >
              <Clock className="h-10 w-10 text-neutral-600 mx-auto mb-3" />
              <p className="text-neutral-500 text-sm">Henüz bir dönüştürme kaydınız bulunmuyor.</p>
              <p className="text-neutral-600 text-xs mt-1">Ana sayfaya dönüp dilediğiniz YouTube videosunu anında dönüştürün!</p>
            </motion.div>
          ) : (
            history.map((record) => {
              const videoId = getYoutubeId(record.videoUrl);
              const thumbnailUrl = videoId 
                ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
                : null;

              return (
                <motion.div
                  key={record.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="rounded-xl border border-neutral-800/80 bg-neutral-900/30 hover:bg-neutral-900/50 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition shadow-md"
                  id={`history-item-${record.id}`}
                >
                  {/* Left: Info Card with Image */}
                  <div className="flex gap-4 items-center min-w-0 flex-1">
                    {thumbnailUrl ? (
                      <img
                        referrerPolicy="no-referrer"
                        src={thumbnailUrl}
                        alt="Önizleme"
                        className="h-14 w-24 object-cover rounded-md bg-neutral-900 border border-neutral-800 shrink-0"
                      />
                    ) : (
                      <div className="h-14 w-24 rounded-md bg-neutral-900 border border-neutral-800 flex items-center justify-center text-red-500 shrink-0">
                        {record.format === "mp3" ? <Music className="h-6 w-6" /> : <Video className="h-6 w-6" />}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-bold text-white line-clamp-1 group-hover:text-red-400">
                        {record.videoTitle}
                      </h4>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[11px] font-medium text-neutral-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> {formatDate(record.createdAt)}
                        </span>
                        <span>•</span>
                        <span className="text-neutral-400 font-semibold">{record.quality}</span>
                        {record.fileSize && (
                          <>
                            <span>•</span>
                            <span className="text-neutral-400 font-semibold">{record.fileSize}</span>
                          </>
                        )}
                        <span>•</span>
                        <a
                          href={record.videoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-red-500 hover:underline flex items-center gap-0.5 font-bold"
                        >
                          YouTube'da Aç <Play className="h-2.5 w-2.5 fill-red-500" />
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Right: Badges & Controls */}
                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 border-t border-neutral-800/40 pt-3 sm:border-0 sm:pt-0">
                    {/* Format Badge */}
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-bold uppercase ${
                        record.format === "mp3"
                          ? "bg-red-950/40 border border-red-900/60 text-red-400"
                          : "bg-blue-950/40 border border-blue-900/60 text-blue-400"
                      }`}>
                        {record.format === "mp3" ? <Music className="h-3 w-3" /> : <Video className="h-3 w-3" />}
                        {record.format}
                      </span>
                    </div>

                    {/* Status & Download Trigger */}
                    <div>
                      {record.status === "processing" ? (
                        <div className="flex items-center gap-2 text-xs font-bold text-amber-500 bg-amber-950/30 border border-amber-900/50 rounded-lg px-3 py-1.5">
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          <span>Dönüştürülüyor %{record.progress}</span>
                        </div>
                      ) : record.status === "failed" ? (
                        <div className="flex items-center gap-1.5 text-xs font-bold text-red-500 bg-red-950/30 border border-red-900/50 rounded-lg px-3 py-1.5">
                          <AlertCircle className="h-3.5 w-3.5" />
                          <span>Hata Oluştu</span>
                        </div>
                      ) : (
                        <a
                          href={record.downloadUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 text-xs font-bold text-white bg-green-600 hover:bg-green-700 rounded-lg px-3.5 py-1.5 shadow-lg shadow-green-950/10 cursor-pointer active:scale-95 transition"
                          id={`history-download-${record.id}`}
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span>İndir</span>
                        </a>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
