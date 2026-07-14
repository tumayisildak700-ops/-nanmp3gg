import React, { useState, useEffect } from "react";
import { X, CreditCard, ShieldCheck, CheckCircle2, RefreshCw, Award, Zap, HelpCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { User } from "../types";

interface PremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  token: string | null;
  onSuccess: (updatedUser: User) => void;
  onOpenAuth: () => void;
  initialPlan?: "monthly" | "yearly";
}

export default function PremiumModal({
  isOpen,
  onClose,
  currentUser,
  token,
  onSuccess,
  onOpenAuth,
  initialPlan = "monthly"
}: PremiumModalProps) {
  const [plan, setPlan] = useState<"monthly" | "yearly">(initialPlan);
  const [step, setStep] = useState<"pricing" | "checkout" | "loading" | "success">("pricing");
  const [monthlyPrice, setMonthlyPrice] = useState(49);
  const [yearlyPrice, setYearlyPrice] = useState(470);

  // Card inputs
  const [cardNumber, setCardNumber] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [cvv, setCvv] = useState("");
  const [isFlipped, setIsFlipped] = useState(false);
  const [error, setError] = useState("");
  const [loadingStatus, setLoadingStatus] = useState("");

  // Load latest pricing configs from server
  useEffect(() => {
    if (isOpen) {
      fetchPricingConfig();
    }
  }, [isOpen]);

  // Keep plan updated if initialPlan changes
  useEffect(() => {
    setPlan(initialPlan);
  }, [initialPlan]);

  const fetchPricingConfig = async () => {
    try {
      const res = await fetch("/api/premium/config");
      if (res.ok) {
        const data = await res.json();
        setMonthlyPrice(data.premiumMonthlyPrice);
        setYearlyPrice(data.premiumYearlyPrice);
      }
    } catch (e) {}
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    // Format card number to have spaces: 0000 0000 0000 0000
    let formatted = "";
    for (let i = 0; i < value.length && i < 16; i++) {
      if (i > 0 && i % 4 === 0) {
        formatted += " ";
      }
      formatted += value[i];
    }
    setCardNumber(formatted);
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    let formatted = "";
    if (value.length > 0) {
      formatted = value.substring(0, 2);
      if (value.length > 2) {
        formatted += "/" + value.substring(2, 4);
      }
    }
    setExpiryDate(formatted);
  };

  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "").substring(0, 4);
    setCvv(value);
  };

  // Determine card issuer/type (Visa / Mastercard / etc.)
  const getCardType = () => {
    const cleanNum = cardNumber.replace(/\s+/g, "");
    if (cleanNum.startsWith("4")) return "Visa";
    if (/^5[1-5]/.test(cleanNum)) return "Mastercard";
    if (/^3[47]/.test(cleanNum)) return "Amex";
    return "Credit Card";
  };

  const startPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!currentUser) {
      onOpenAuth();
      return;
    }

    const cleanCard = cardNumber.replace(/\s+/g, "");
    if (cleanCard.length < 15 || cleanCard.length > 16) {
      setError("Lütfen geçerli bir 15 veya 16 haneli kart numarası girin.");
      return;
    }

    if (!cardHolder.trim()) {
      setError("Lütfen kart sahibinin adını girin.");
      return;
    }

    if (expiryDate.length < 5) {
      setError("Lütfen geçerli bir son kullanma tarihi girin (AA/YY).");
      return;
    }

    if (cvv.length < 3) {
      setError("Lütfen geçerli bir güvenlik kodu (CVV) girin.");
      return;
    }

    // Start simulation steps
    setStep("loading");
    
    const statuses = [
      "Güvenli ödeme geçidine bağlanılıyor...",
      "3D Secure doğrulama talebi gönderiliyor...",
      "Banka provizyonu alınıyor...",
      "Ödeme başarıyla tahsil edildi! Hesap yükseltiliyor..."
    ];

    for (let i = 0; i < statuses.length; i++) {
      setLoadingStatus(statuses[i]);
      await new Promise((r) => setTimeout(r, i === 1 ? 1200 : 800));
    }

    try {
      const response = await fetch("/api/premium/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          cardNumber,
          cardHolder,
          expiryDate,
          cvv,
          plan
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Ödeme işlemi gerçekleştirilemedi.");
      }

      // Upgrade success
      onSuccess(data.user);
      setStep("success");
    } catch (err: any) {
      setError(err.message || "Ödeme alınırken teknik bir arıza oluştu.");
      setStep("checkout");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-4xl rounded-2xl border border-neutral-800 bg-neutral-900 shadow-2xl overflow-hidden my-8"
        id="premium-modal-wrapper"
      >
        {/* Top Header Background */}
        <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-amber-500/10 via-amber-500/0 to-transparent pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-lg bg-neutral-950 p-2 text-neutral-400 hover:text-white transition cursor-pointer"
          id="close-premium-modal"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-12">
          {/* Left Panel: Advantages list (always present except in success screen) */}
          <div className="md:col-span-5 border-b md:border-b-0 md:border-r border-neutral-800 p-6 sm:p-8 bg-neutral-950/40">
            <div className="flex items-center gap-2 mb-6" id="advantages-badge">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-500">
                <Award className="h-5 w-5 fill-amber-500/20" />
              </span>
              <div>
                <h3 className="text-lg font-extrabold tracking-tight text-white leading-none">İnanmp3gg</h3>
                <span className="text-[10px] text-amber-500 uppercase tracking-wider font-bold">👑 PREMIUM AYRICALIKLARI</span>
              </div>
            </div>

            <div className="space-y-5" id="premium-features-list">
              <div className="flex gap-3">
                <div className="h-5 w-5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-500 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs">✔</span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-neutral-200">2K & 4K Ultra HD Video</h4>
                  <p className="text-xs text-neutral-400 mt-0.5">MP4 formatında 1440p ve 2160p (4K) üstün görüntü kalitesiyle dönüştürün.</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="h-5 w-5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-500 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs">✔</span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-neutral-200">320kbps MP3 (Stüdyo Kalitesi)</h4>
                  <p className="text-xs text-neutral-400 mt-0.5">Kristal netliğinde 320kbps ses kalitesi ile müzik keyfinizi en üste çıkarın.</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="h-5 w-5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-500 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs">✔</span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-neutral-200">5 Kat Daha Hızlı İşlem</h4>
                  <p className="text-xs text-neutral-400 mt-0.5">Premium sunucu sırasına girerek, videolarınızı beklemeden saniyeler içinde indirin.</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="h-5 w-5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-500 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs">✔</span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-neutral-200">Sınırsız Eşzamanlı Kuyruk</h4>
                  <p className="text-xs text-neutral-400 mt-0.5">Aynı anda birden fazla indirme kuyruğu oluşturun ve indirme hızını bölmeyin.</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="h-5 w-5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-500 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs">✔</span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-neutral-200">Reklamsız & Temiz Arayüz</h4>
                  <p className="text-xs text-neutral-400 mt-0.5">Sıfır bekleme, sıfır reklam ile tamamen pürüzsüz ve akıcı kullanım deneyimi.</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="h-5 w-5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-500 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs">✔</span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-neutral-200">Akıllı Ses Efektleri</h4>
                  <p className="text-xs text-neutral-400 mt-0.5">Dönüştürme adımlarını ve tıklamaları fütüristik siber seslerle zenginleştirin.</p>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-neutral-900 flex items-center gap-2 text-xs text-neutral-500">
              <ShieldCheck className="h-4 w-4 text-amber-500 shrink-0" />
              <span>Güvenli 256-bit SSL ödeme sertifikası aktiftir.</span>
            </div>
          </div>

          {/* Right Panel: Active Screen */}
          <div className="md:col-span-7 p-6 sm:p-8 flex flex-col justify-between min-h-[460px]" id="premium-interactive-panel">
            <AnimatePresence mode="wait">
              {/* Screen 1: Pricing Selector */}
              {step === "pricing" && (
                <motion.div
                  key="pricing-screen"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="space-y-6 flex-1 flex flex-col justify-between"
                >
                  <div>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-white" id="plan-selection-title">
                      Kendinize En Uygun Planı Seçin
                    </h2>
                    <p className="text-xs sm:text-sm text-neutral-400 mt-1">
                      Kullanım sıklığınıza en uygun paketi seçin, dilediğiniz an iptal edin.
                    </p>

                    <div className="mt-6 space-y-4">
                      {/* Monthly Plan Card */}
                      <div
                        onClick={() => setPlan("monthly")}
                        className={`p-4 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                          plan === "monthly"
                            ? "bg-amber-500/10 border-amber-500"
                            : "bg-neutral-950/60 border-neutral-800 hover:border-neutral-700"
                        }`}
                        id="plan-monthly-card"
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            checked={plan === "monthly"}
                            onChange={() => setPlan("monthly")}
                            className="text-amber-500 focus:ring-amber-500 border-neutral-700 bg-neutral-950 h-4 w-4"
                          />
                          <div>
                            <span className="block text-sm font-bold text-white">Aylık Paket</span>
                            <span className="block text-[10px] text-neutral-400 mt-0.5">Her ay otomatik yenilenir.</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="block text-lg font-black text-amber-500">{monthlyPrice} TL <span className="text-xs font-normal text-neutral-500">/ ay</span></span>
                        </div>
                      </div>

                      {/* Yearly Plan Card */}
                      <div
                        onClick={() => setPlan("yearly")}
                        className={`p-4 rounded-xl border transition cursor-pointer relative overflow-hidden flex items-center justify-between ${
                          plan === "yearly"
                            ? "bg-amber-500/10 border-amber-500"
                            : "bg-neutral-950/60 border-neutral-800 hover:border-neutral-700"
                        }`}
                        id="plan-yearly-card"
                      >
                        {/* Best value badge */}
                        <div className="absolute right-0 top-0 bg-amber-500 text-neutral-950 text-[10px] font-black px-2.5 py-0.5 rounded-bl-lg uppercase tracking-wider">
                          %20 TASARRUF
                        </div>
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            checked={plan === "yearly"}
                            onChange={() => setPlan("yearly")}
                            className="text-amber-500 focus:ring-amber-500 border-neutral-700 bg-neutral-950 h-4 w-4"
                          />
                          <div>
                            <span className="block text-sm font-bold text-white">Yıllık Paket (Önerilen)</span>
                            <span className="block text-[10px] text-neutral-400 mt-0.5">Yıllık tek çekim olarak ödenir.</span>
                          </div>
                        </div>
                        <div className="text-right mt-2 sm:mt-0">
                          <span className="block text-lg font-black text-amber-500">{yearlyPrice} TL <span className="text-xs font-normal text-neutral-500">/ yıl</span></span>
                          <span className="block text-[10px] text-neutral-400 font-mono">Aylık {(yearlyPrice / 12).toFixed(1)} TL'ye gelir</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 pt-4 border-t border-neutral-800/60 flex flex-col sm:flex-row gap-3 items-center justify-between">
                    <div className="text-xs text-neutral-400 text-center sm:text-left">
                      Seçilen plan: <span className="text-white font-bold">{plan === "monthly" ? "Aylık" : "Yıllık"}</span> • Toplam Tutar:{" "}
                      <span className="text-amber-500 font-extrabold">{plan === "monthly" ? monthlyPrice : yearlyPrice} TL</span>
                    </div>
                    {currentUser ? (
                      <button
                        onClick={() => setStep("checkout")}
                        className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 font-bold text-neutral-950 shadow-lg shadow-amber-950/20 active:scale-[0.99] transition cursor-pointer"
                        id="proceed-payment-btn"
                      >
                        Kart ile Güvenli Öde
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          onClose();
                          onOpenAuth();
                        }}
                        className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-6 py-3 rounded-xl bg-red-600 hover:bg-red-700 font-bold text-white shadow-lg active:scale-[0.99] transition cursor-pointer"
                        id="pricing-login-required"
                      >
                        Satın Almak İçin Giriş Yap
                      </button>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Screen 2: Interactive Payment Form */}
              {step === "checkout" && (
                <motion.div
                  key="checkout-screen"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="space-y-6"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-white">Güvenli Kart Ödemesi</h3>
                      <p className="text-xs text-neutral-400 mt-0.5">Seçilen: {plan === "monthly" ? `Aylık Paket (${monthlyPrice} TL)` : `Yıllık Paket (${yearlyPrice} TL)`}</p>
                    </div>
                    <button
                      onClick={() => setStep("pricing")}
                      className="text-xs text-amber-500 hover:underline cursor-pointer"
                    >
                      Planı Değiştir
                    </button>
                  </div>

                  {error && (
                    <div className="p-3 bg-red-950/20 border border-red-800 text-red-400 text-xs rounded-lg">
                      {error}
                    </div>
                  )}

                  {/* Beautiful Live 3D-Like Credit Card Widget */}
                  <div className="perspective-1000 flex justify-center py-2" id="credit-card-widget">
                    <div
                      className={`relative w-80 h-48 rounded-xl text-white shadow-xl transition-all duration-700 transform-style-3d ${
                        isFlipped ? "rotate-y-180" : ""
                      }`}
                      style={{
                        background: "linear-gradient(135deg, #b45309 0%, #78350f 100%)",
                        boxShadow: "0 10px 25px rgba(217, 119, 6, 0.15)"
                      }}
                    >
                      {/* CARD FRONT */}
                      <div className="absolute inset-0 p-5 flex flex-col justify-between backface-hidden">
                        <div className="flex justify-between items-start">
                          <div className="flex gap-1.5 items-center">
                            <span className="h-5 w-5 bg-amber-100/10 border border-amber-100/20 rounded-full flex items-center justify-center text-xs">👑</span>
                            <span className="text-[10px] uppercase font-bold tracking-widest text-amber-300">PREMIUM CARD</span>
                          </div>
                          <span className="text-xs font-bold italic tracking-wide">{getCardType()}</span>
                        </div>

                        {/* Card Chip icon */}
                        <div className="h-8 w-11 bg-amber-400/20 border border-amber-400/40 rounded-md shadow-inner flex items-center justify-center">
                          <div className="h-5 w-8 border border-amber-400/10 rounded" />
                        </div>

                        {/* Card Number display */}
                        <div className="text-lg font-mono tracking-wider text-center" id="live-card-number">
                          {cardNumber || "•••• •••• •••• ••••"}
                        </div>

                        {/* Cardholder & Expiry */}
                        <div className="flex justify-between items-end">
                          <div className="min-w-0">
                            <span className="block text-[8px] uppercase tracking-wider text-amber-300/60 font-semibold">KART SAHİBİ</span>
                            <span className="block text-xs font-bold font-mono tracking-wide uppercase truncate">
                              {cardHolder || "NAME SURNAME"}
                            </span>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="block text-[8px] uppercase tracking-wider text-amber-300/60 font-semibold">S.K.T</span>
                            <span className="block text-xs font-bold font-mono tracking-wide">
                              {expiryDate || "AA/YY"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* CARD BACK */}
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-neutral-900 to-neutral-950 py-5 flex flex-col justify-between backface-hidden rotate-y-180">
                        <div className="h-9 w-full bg-black/80 mt-1" />
                        <div className="px-5 flex gap-4 items-center">
                          <div className="flex-1 h-8 bg-neutral-800/80 rounded border border-neutral-700/50 flex items-center px-2 font-mono text-xs italic tracking-widest text-neutral-400 line-through">
                            INANMP3GG PREMIUM SECURE
                          </div>
                          <div className="text-right shrink-0">
                            <span className="block text-[8px] text-neutral-500 font-bold">CVV</span>
                            <div className="bg-white text-neutral-900 font-bold font-mono text-xs rounded px-2.5 py-1 min-w-[36px] text-center">
                              {cvv || "•••"}
                            </div>
                          </div>
                        </div>
                        <div className="px-5 text-[8px] text-neutral-500 leading-none">
                          Bu kart İnanmp3gg platformunda güvenli olarak premium abonelik tanımlaması amacıyla simüle edilmektedir.
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actual Form Inputs */}
                  <form onSubmit={startPayment} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Cardholder Name */}
                      <div className="space-y-1">
                        <label className="block text-xs text-neutral-400 font-semibold">Kart Sahibi</label>
                        <input
                          type="text"
                          required
                          value={cardHolder}
                          onChange={(e) => setCardHolder(e.target.value)}
                          placeholder="Örn. Tümay Işıldak"
                          className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-white placeholder-neutral-700 focus:border-amber-500 focus:outline-none transition"
                          id="cardholder-input"
                        />
                      </div>

                      {/* Card Number */}
                      <div className="space-y-1">
                        <label className="block text-xs text-neutral-400 font-semibold">Kart Numarası</label>
                        <div className="relative">
                          <input
                            type="text"
                            required
                            value={cardNumber}
                            onChange={handleCardNumberChange}
                            placeholder="4000 1234 5678 9010"
                            className="w-full rounded-lg border border-neutral-800 bg-neutral-950 py-2 pl-3 pr-10 text-sm text-white placeholder-neutral-700 focus:border-amber-500 focus:outline-none transition"
                            id="cardnumber-input"
                          />
                          <CreditCard className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-600" />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Expiry Date */}
                      <div className="space-y-1">
                        <label className="block text-xs text-neutral-400 font-semibold">Son Kullanma Tarihi</label>
                        <input
                          type="text"
                          required
                          value={expiryDate}
                          onChange={handleExpiryChange}
                          placeholder="AA/YY"
                          className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-white placeholder-neutral-700 focus:border-amber-500 focus:outline-none transition text-center"
                          id="cardexpiry-input"
                        />
                      </div>

                      {/* CVV */}
                      <div className="space-y-1">
                        <label className="block text-xs text-neutral-400 font-semibold">CVC / CVV</label>
                        <input
                          type="text"
                          required
                          value={cvv}
                          onFocus={() => setIsFlipped(true)}
                          onBlur={() => setIsFlipped(false)}
                          onChange={handleCvvChange}
                          placeholder="123"
                          className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-white placeholder-neutral-700 focus:border-amber-500 focus:outline-none transition text-center"
                          id="cardcvv-input"
                        />
                      </div>
                    </div>

                    <div className="pt-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setStep("pricing")}
                        className="w-full sm:w-auto text-xs text-neutral-500 hover:text-white py-2 transition cursor-pointer"
                      >
                        Geri Git
                      </button>
                      <button
                        type="submit"
                        className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 font-bold text-neutral-950 shadow-lg shadow-amber-950/20 active:scale-[0.99] transition cursor-pointer"
                        id="submit-payment-btn"
                      >
                        Ödemeyi Güvenli Tamamla
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}

              {/* Screen 3: Live Payment Authorization Loading */}
              {step === "loading" && (
                <motion.div
                  key="loading-screen"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full flex flex-col items-center justify-center text-center space-y-4 py-12"
                >
                  <div className="relative h-16 w-16 flex items-center justify-center">
                    <RefreshCw className="h-10 w-10 text-amber-500 animate-spin" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Ödeme İşleniyor</h3>
                  <p className="text-sm text-neutral-400 max-w-sm font-mono text-center">
                    {loadingStatus}
                  </p>
                  <p className="text-xs text-neutral-600">Lütfen tarayıcı pencerelerinizi kapatmayın.</p>
                </motion.div>
              )}

              {/* Screen 4: Payment success! */}
              {step === "success" && (
                <motion.div
                  key="success-screen"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="h-full flex flex-col items-center justify-center text-center space-y-6 py-8"
                  id="premium-payment-success"
                >
                  <div className="h-16 w-16 rounded-full bg-amber-500/10 border border-amber-500 text-amber-500 flex items-center justify-center">
                    <CheckCircle2 className="h-10 w-10" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black text-white">👑 Hoş Geldiniz!</h3>
                    <p className="text-base text-amber-500 font-semibold">Premium Üyeliğiniz Başarıyla Aktif Edildi</p>
                    <p className="text-xs text-neutral-400 max-w-md mx-auto leading-relaxed">
                      Hesabınız başarıyla yükseltildi. Artık 2K/4K MP4 video dönüştürme, 320kbps MP3 ses kalitesi ve 5 kat daha hızlı sunuculardan yararlanabilirsiniz.
                    </p>
                  </div>

                  <button
                    onClick={onClose}
                    className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold rounded-xl shadow-lg shadow-amber-950/20 active:scale-[0.99] transition cursor-pointer"
                    id="finish-upgrade-success"
                  >
                    Hemen Kullanmaya Başla 🚀
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
