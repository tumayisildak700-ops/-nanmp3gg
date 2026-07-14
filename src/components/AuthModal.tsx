import React, { useState } from "react";
import { X, Mail, Lock, User, LogIn, UserPlus } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (token: string, user: any) => void;
  onBannedDetected?: (email: string) => void;
}

export default function AuthModal({ isOpen, onClose, onSuccess, onBannedDetected }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isBannedError, setIsBannedError] = useState(false);
  const [bannedEmail, setBannedEmail] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsBannedError(false);
    setLoading(true);

    const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
    const payload = isLogin ? { email, password } : { email, name, password };

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      let data: any = {};
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        try {
          data = await response.json();
        } catch (jsonErr) {
          const text = await response.text();
          data = { error: text || "Sunucu geçersiz JSON döndürdü." };
        }
      } else {
        const text = await response.text();
        data = { error: text || `Sunucu hatası: ${response.status}` };
      }

      if (!response.ok) {
        if (response.status === 403 && data.isBanned) {
          setIsBannedError(true);
          setBannedEmail(data.email || email);
        }
        throw new Error(data.error || "Giriş işlemi başarısız.");
      }

      onSuccess(data.token, data.user);
      onClose();
      // Clear inputs
      setEmail("");
      setName("");
      setPassword("");
    } catch (err: any) {
      setError(err.message || "Bir şeyler yanlış gitti.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/75 backdrop-blur-sm"
          id="auth-backdrop"
        />

        {/* Modal Content */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="relative w-full max-w-md overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900 p-8 shadow-2xl"
          id="auth-modal-card"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 rounded-full p-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-white transition"
            id="auth-close-btn"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="mb-6 text-center">
            <h2 className="text-2xl font-bold tracking-tight text-white" id="auth-title">
              {isLogin ? "Tekrar Hoş Geldiniz" : "Hesap Oluşturun"}
            </h2>
            <p className="mt-1.5 text-sm text-neutral-400">
              {isLogin
                ? "Dönüştürme geçmişinizi saklamak için giriş yapın."
                : "Hemen kayıt olun ve tüm özelliklerden yararlanın."}
            </p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 rounded-lg bg-red-950/40 border border-red-800 p-4 text-sm text-red-400 flex flex-col gap-3"
              id="auth-error-banner"
            >
              <div className="flex items-start gap-2">
                <span>{error}</span>
              </div>
              {isBannedError && (
                <button
                  type="button"
                  onClick={() => {
                    if (onBannedDetected) {
                      onBannedDetected(bannedEmail);
                    }
                    onClose();
                  }}
                  className="w-full rounded-lg bg-red-600 hover:bg-red-700 py-2.5 px-3 text-xs font-bold text-white transition text-center cursor-pointer shadow-md shadow-red-950/40"
                  id="appeal-redirect-btn"
                >
                  İtiraz Formunu Doldur kanka 📝
                </button>
              )}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" id="auth-form">
            {!isLogin && (
              <div>
                <label className="block text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1.5">
                  Ad Soyad
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-lg border border-neutral-800 bg-neutral-950 py-2.5 pl-11 pr-4 text-sm text-white placeholder-neutral-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 transition"
                    placeholder="Adınız Soyadınız"
                    id="auth-name-input"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1.5">
                E-posta Adresi
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-950 py-2.5 pl-11 pr-4 text-sm text-white placeholder-neutral-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 transition"
                  placeholder="ornek@domain.com"
                  id="auth-email-input"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1.5">
                Şifre
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-950 py-2.5 pl-11 pr-4 text-sm text-white placeholder-neutral-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 transition"
                  placeholder="••••••••"
                  id="auth-password-input"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 hover:bg-red-700 py-3 text-sm font-semibold text-white shadow-lg shadow-red-950/20 active:scale-[0.98] disabled:opacity-50 transition cursor-pointer"
              id="auth-submit-btn"
            >
              {loading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : isLogin ? (
                <>
                  <LogIn className="h-4 w-4" /> Giriş Yap
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" /> Kayıt Ol
                </>
              )}
            </button>
          </form>

          <div className="mt-6 border-t border-neutral-800 pt-4 text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError("");
              }}
              className="text-xs text-neutral-400 hover:text-red-400 transition"
              id="auth-switch-btn"
            >
              {isLogin
                ? "Henüz bir hesabınız yok mu? Hemen kayıt olun"
                : "Zaten üye misiniz? Giriş yapın"}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
