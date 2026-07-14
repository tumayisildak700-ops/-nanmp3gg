import React, { useState } from "react";
import { ShieldAlert, Send, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";
import { motion } from "motion/react";

interface BanAppealProps {
  initialEmail?: string;
  onClose: () => void;
}

export default function BanAppeal({ initialEmail = "", onClose }: BanAppealProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState(initialEmail);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/ban-appeals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "İtiraz talebi gönderilemedi.");
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Bağlantı hatası oluştu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12" id="ban-appeal-container">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg rounded-2xl border border-neutral-800 bg-neutral-900 p-8 shadow-2xl relative overflow-hidden"
        id="ban-appeal-card"
      >
        {/* Abstract background glow */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-red-600/5 rounded-full blur-3xl pointer-events-none" />

        {!success ? (
          <>
            <div className="flex flex-col items-center text-center mb-8">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 border border-red-500/20 text-red-500 mb-4 animate-pulse">
                <ShieldAlert className="h-8 w-8" />
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight" id="ban-appeal-title">
                Engellendin Kanka! 🚫
              </h2>
              <p className="mt-2 text-sm text-neutral-400 max-w-md">
                Hesabın, sistem kurallarına uyulmaması veya şüpheli hareketler sebebiyle yöneticiler tarafından askıya alınmıştır. Bir hata olduğunu düşünüyorsan, aşağıdan bizimle iletişime geçip engelini açtırabilirsin!
              </p>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="mb-6 flex items-start gap-2.5 rounded-xl bg-red-950/40 border border-red-800 p-3.5 text-xs text-red-400"
                id="ban-appeal-error"
              >
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" id="ban-appeal-form">
              <div>
                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">
                  Adın Soyadın
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 transition"
                  placeholder="Ahmet Yılmaz"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">
                  E-posta Adresin
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="ornek@domain.com"
                  disabled={!!initialEmail}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">
                  Neden Engelin Kaldırılmalı? (Açıklama kanka)
                </label>
                <textarea
                  required
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 transition resize-none"
                  placeholder="Kanka valla bilerek yapmadım, bir daha kurallara dikkat edeceğim..."
                />
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex items-center justify-center gap-2 rounded-lg border border-neutral-800 hover:bg-neutral-800 py-3 px-4 text-sm font-semibold text-neutral-300 transition cursor-pointer order-2 sm:order-1 sm:flex-1"
                >
                  <ArrowLeft className="h-4 w-4" /> Ana Sayfa
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center justify-center gap-2 rounded-lg bg-red-600 hover:bg-red-700 py-3 px-4 text-sm font-bold text-white shadow-lg shadow-red-950/20 active:scale-[0.98] disabled:opacity-50 transition cursor-pointer order-1 sm:order-2 sm:flex-[2]"
                >
                  {loading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <>
                      <Send className="h-4 w-4" /> İtiraz Talebini Gönder
                    </>
                  )}
                </button>
              </div>
            </form>
          </>
        ) : (
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center py-8"
            id="ban-appeal-success"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 mx-auto mb-5">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-extrabold text-white">Talep Alındı Kanka! 👍</h3>
            <p className="mt-3 text-sm text-neutral-400 max-w-sm mx-auto">
              İtiraz talebini yöneticilere ulaştırdık. En kısa sürede inceleyip hesabını tekrar aktif edebilirler. Takipte kal kanka!
            </p>
            <button
              onClick={onClose}
              className="mt-8 inline-flex items-center gap-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 py-2.5 px-5 text-sm font-semibold text-white transition cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" /> Ana Sayfaya Dön
            </button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
