import React, { useState, useEffect } from "react";
import { Megaphone, Mail, Link, DollarSign, Calendar, FileText, CheckCircle2, Sparkles, Layout, Info, CreditCard, Copy, Check } from "lucide-react";
import { motion } from "motion/react";

interface AdvertiseFormProps {
  token: string | null;
}

export default function AdvertiseForm({ token }: AdvertiseFormProps) {
  const [companyName, setCompanyName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [campaignType, setCampaignType] = useState<"header" | "sidebar" | "footer">("header");
  const [templateStyle, setTemplateStyle] = useState<"retro" | "neon" | "spotify" | "clean" | "custom">("clean");
  const [durationDays, setDurationDays] = useState(7);
  const [dailyBudget, setDailyBudget] = useState(100);
  const [notes, setNotes] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");

  // Payment States
  const [paymentMethod, setPaymentMethod] = useState<"bank" | "card">("bank");
  const [cardHolder, setCardHolder] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [submittedAd, setSubmittedAd] = useState<any>(null);

  // Bank Info from server
  const [bankDetails, setBankDetails] = useState({
    bankName: "Garanti BBVA",
    iban: "TR93 0006 2000 0001 2345 6789 01",
    accountHolder: "Tümay Işıldak"
  });

  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/advertisements/bank-details")
      .then(res => {
        if (res.ok) return res.json();
        throw new Error();
      })
      .then(data => {
        if (data && data.iban) {
          setBankDetails(data);
        }
      })
      .catch(() => {});
  }, []);

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const totalEstimate = durationDays * dailyBudget;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName || !contactEmail || !websiteUrl) {
      setError("Lütfen gerekli alanları (Firma Adı, E-posta ve Web Sitesi) doldurun.");
      return;
    }

    if (paymentMethod === "card") {
      if (!cardHolder || !cardNumber || !cardExpiry || !cardCvv) {
        setError("Lütfen kredi kartı bilgilerini eksiksiz doldurun.");
        return;
      }
      if (cardNumber.replace(/\s+/g, "").length < 15) {
        setError("Lütfen geçerli bir kredi kartı numarası girin.");
        return;
      }
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/advertisements/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          companyName,
          contactEmail,
          websiteUrl,
          campaignType,
          templateStyle,
          durationDays,
          dailyBudget,
          notes,
          bannerUrl: templateStyle === "custom" ? bannerUrl : "",
          paymentMethod
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Reklam başvurusu gönderilirken hata oluştu.");
      }

      setSubmittedAd(data.ad);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Bağlantı hatası oluştu.");
    } finally {
      setLoading(false);
    }
  };

  if (success && submittedAd) {
    return (
      <div className="mx-auto max-w-2xl py-12 px-4 space-y-6" id="advertise-success-container">
        <div className="text-center space-y-4">
          <div className="mx-auto h-16 w-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center border border-emerald-500/20">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Başvurunuz ve Ödeme Talebiniz Alındı!</h2>
          <p className="text-sm text-neutral-400 max-w-md mx-auto leading-relaxed">
            Sponsorluk reklam kampanyanız başarıyla oluşturuldu. Reklamınızın yayına alınabilmesi için lütfen aşağıdaki ödeme adımlarını tamamlayın.
          </p>
        </div>

        {submittedAd.paymentMethod === "bank" ? (
          <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-6 shadow-xl space-y-5">
            <div className="border-b border-neutral-800 pb-4 flex justify-between items-center">
              <div>
                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block">TOPLAM TUTAR</span>
                <span className="text-2xl font-black text-amber-500">{submittedAd.amountPaid} TL</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block">ÖDEME DURUMU</span>
                <span className="rounded bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-xs font-bold text-amber-500 uppercase tracking-wider">
                  Havale Bekleniyor
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <span className="text-xs font-bold text-white block">🏦 EFT / HAVALE HESAP BİLGİLERİ</span>
              
              <div className="grid grid-cols-1 gap-3 text-xs">
                {/* Bank Name */}
                <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 flex justify-between items-center">
                  <div>
                    <span className="text-[9px] text-neutral-500 uppercase block font-bold">Banka Adı</span>
                    <span className="font-bold text-neutral-200">{bankDetails.bankName}</span>
                  </div>
                  <button 
                    onClick={() => copyToClipboard(bankDetails.bankName, "bankName")}
                    className="p-2 text-neutral-500 hover:text-white transition rounded-lg hover:bg-neutral-900 cursor-pointer"
                  >
                    {copiedField === "bankName" ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>

                {/* Account Holder */}
                <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 flex justify-between items-center">
                  <div>
                    <span className="text-[9px] text-neutral-500 uppercase block font-bold">Alıcı / Hesap Sahibi</span>
                    <span className="font-bold text-neutral-200">{bankDetails.accountHolder}</span>
                  </div>
                  <button 
                    onClick={() => copyToClipboard(bankDetails.accountHolder, "holder")}
                    className="p-2 text-neutral-500 hover:text-white transition rounded-lg hover:bg-neutral-900 cursor-pointer"
                  >
                    {copiedField === "holder" ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>

                {/* IBAN */}
                <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 flex justify-between items-center">
                  <div>
                    <span className="text-[9px] text-neutral-500 uppercase block font-bold">IBAN Numarası</span>
                    <span className="font-mono font-bold text-neutral-200 tracking-wider">{bankDetails.iban}</span>
                  </div>
                  <button 
                    onClick={() => copyToClipboard(bankDetails.iban, "iban")}
                    className="p-2 text-neutral-500 hover:text-white transition rounded-lg hover:bg-neutral-900 cursor-pointer"
                  >
                    {copiedField === "iban" ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>

                {/* REF */}
                <div className="bg-red-500/[0.03] p-4 rounded-xl border border-red-500/20 space-y-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-[9px] text-red-400 uppercase block font-bold">⚠️ Havale / EFT Açıklama Kodu</span>
                      <span className="font-mono font-black text-white text-base tracking-widest">{submittedAd.paymentRef}</span>
                    </div>
                    <button 
                      onClick={() => copyToClipboard(submittedAd.paymentRef, "ref")}
                      className="p-2 text-red-400 hover:text-white transition rounded-lg hover:bg-neutral-900 cursor-pointer"
                    >
                      {copiedField === "ref" ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-neutral-400 leading-normal font-medium">
                    <strong className="text-white">ÇOK ÖNEMLİ:</strong> Banka transferi yaparken açıklama kısmına <strong className="text-white">yalnızca</strong> yukarıdaki referans kodunu yazmalısınız. Bu kod ödemenizin sistem tarafından otomatik algılanmasını ve reklamınızın onaylanmasını sağlayacaktır.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-6 shadow-xl space-y-4 text-center">
            <div className="mx-auto h-12 w-12 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center border border-emerald-500/20 mb-2">
              <CreditCard className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Kartla Ödeme Başarıyla Alındı!</h3>
            <p className="text-xs text-neutral-400 max-w-md mx-auto leading-relaxed">
              Kredi kartınızdan <strong className="text-emerald-400">{submittedAd.amountPaid} TL</strong> tahsil edilmiştir. Reklam başvurunuz yönetici ekibimiz tarafından incelendikten sonra saniyeler içinde otomatik olarak yayına alınacaktır.
            </p>
            <div className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-950 border border-neutral-800 px-3 py-1.5 text-xs text-neutral-400">
              <span>Referans No:</span>
              <span className="font-mono font-bold text-neutral-200">{submittedAd.paymentRef}</span>
            </div>
          </div>
        )}

        <div className="text-center pt-2">
          <button
            onClick={() => {
              setSuccess(false);
              setCompanyName("");
              setContactEmail("");
              setWebsiteUrl("");
              setNotes("");
              setBannerUrl("");
              setSubmittedAd(null);
              setCardHolder("");
              setCardNumber("");
              setCardExpiry("");
              setCardCvv("");
            }}
            className="rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-3 text-xs transition cursor-pointer"
          >
            Yeni Başvuru Yap
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl py-6 px-4" id="advertise-form-container">
      {/* Title Header */}
      <div className="text-center max-w-xl mx-auto mb-10 space-y-2">
        <h2 className="text-2xl font-extrabold tracking-tight text-white flex items-center justify-center gap-2">
          <Megaphone className="h-6 w-6 text-red-500" /> İnanmp3gg Sponsorluğu & Reklam Ver
        </h2>
        <p className="text-xs text-neutral-400">
          Aylık binlerce aktif müziksever ve içerik üreticisine ulaşın. Hazır şablonlarımızla saniyeler içinde reklamınızı yayına alın!
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Form */}
        <div className="lg:col-span-7 bg-neutral-900/30 border border-neutral-800 rounded-2xl p-6 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400 font-medium">
                {error}
              </div>
            )}

            {/* Row 1: Company & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-400 flex items-center gap-1">
                  Firma / Sponsor Adı <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-neutral-500 text-xs">🏢</span>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Örn: Spotify Hit List"
                    className="w-full rounded-lg border border-neutral-800 bg-neutral-950 py-2 pl-9 pr-3 text-xs text-white focus:border-red-500 focus:outline-none transition"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-400 flex items-center gap-1">
                  İletişim E-Posta <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-3.5 w-3.5 text-neutral-500" />
                  <input
                    type="email"
                    required
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="reklam@firma.com"
                    className="w-full rounded-lg border border-neutral-800 bg-neutral-950 py-2 pl-9 pr-3 text-xs text-white focus:border-red-500 focus:outline-none transition"
                  />
                </div>
              </div>
            </div>

            {/* Row 2: Target Link */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-400 flex items-center gap-1">
                Yönlendirilecek Web Adresi / Hedef Link <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Link className="absolute left-3 top-2.5 h-3.5 w-3.5 text-neutral-500" />
                <input
                  type="url"
                  required
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://open.spotify.com/playlist/..."
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-950 py-2 pl-9 pr-3 text-xs text-white focus:border-red-500 focus:outline-none transition"
                />
              </div>
            </div>

            {/* Row 3: Slot selection & Template Choice */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-400 flex items-center gap-1">
                  <Layout className="h-3 w-3" /> Reklam Gösterim Alanı
                </label>
                <select
                  value={campaignType}
                  onChange={(e) => setCampaignType(e.target.value as any)}
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-white focus:border-red-500 focus:outline-none transition"
                >
                  <option value="header">Üst Yatay Banner (Header)</option>
                  <option value="sidebar">Yan Panel Sponsorluğu (Sidebar)</option>
                  <option value="footer">Alt Bant Sponsorluğu (Footer)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-400 flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-amber-500" /> Hazır Reklam Şablonu
                </label>
                <select
                  value={templateStyle}
                  onChange={(e) => setTemplateStyle(e.target.value as any)}
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-white focus:border-red-500 focus:outline-none transition"
                >
                  <option value="clean">Clean Tech (Minimalist Teknoloji)</option>
                  <option value="spotify">Spotify Glow (Müzik & Oynatma Listesi)</option>
                  <option value="neon">Neon Beat (Pulsing Konser Tarzı)</option>
                  <option value="retro">Vintage Sound (Plak Sıcaklığı)</option>
                  <option value="custom">Özel Banner (Kendi Afiş Linkim Var)</option>
                </select>
              </div>
            </div>

            {/* Custom Banner link if Custom selected */}
            {templateStyle === "custom" && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-400 flex items-center gap-1">
                  Afiş Görsel URL Linki
                </label>
                <input
                  type="url"
                  value={bannerUrl}
                  onChange={(e) => setBannerUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-white focus:border-red-500 focus:outline-none transition"
                />
              </div>
            )}

            {/* Row 4: Budget and Duration sliders */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-neutral-950/40 p-3.5 rounded-xl border border-neutral-800/40">
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-semibold text-neutral-400">
                  <span>Günlük Bütçe (TL)</span>
                  <span className="text-emerald-400">{dailyBudget} TL / gün</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="1000"
                  step="50"
                  value={dailyBudget}
                  onChange={(e) => setDailyBudget(Number(e.target.value))}
                  className="w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-red-500"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-semibold text-neutral-400">
                  <span>Yayın Süresi (Gün)</span>
                  <span className="text-white">{durationDays} gün</span>
                </div>
                <input
                  type="range"
                  min="3"
                  max="90"
                  step="1"
                  value={durationDays}
                  onChange={(e) => setDurationDays(Number(e.target.value))}
                  className="w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-red-500"
                />
              </div>
            </div>

            {/* Notes / Message */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-400 flex items-center gap-1">
                <FileText className="h-3 w-3" /> Reklamveren Notu / Özel İstekler
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="İlave etmek istediğiniz notlar veya kampanya detayları..."
                className="w-full rounded-lg border border-neutral-800 bg-neutral-950 p-3 text-xs text-white focus:border-red-500 focus:outline-none transition resize-none"
              />
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-3 bg-neutral-950/40 p-4 rounded-xl border border-neutral-800/40">
              <span className="text-xs font-bold text-white block flex items-center gap-1">
                <CreditCard className="h-3.5 w-3.5 text-red-500" /> Ödeme Yöntemi Seçin
              </span>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("bank")}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border transition cursor-pointer text-center ${
                    paymentMethod === "bank"
                      ? "bg-amber-500/5 border-amber-500 text-amber-400 shadow shadow-amber-950/10"
                      : "bg-neutral-950/60 border-neutral-800 text-neutral-400 hover:text-white"
                  }`}
                >
                  <span className="text-xs font-bold block mb-1">🏦 Banka Havalesi / EFT</span>
                  <span className="text-[9px] text-neutral-500 leading-normal block">Havale/EFT sonrası onay</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("card")}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border transition cursor-pointer text-center ${
                    paymentMethod === "card"
                      ? "bg-red-600/5 border-red-500 text-red-400 shadow shadow-red-950/10"
                      : "bg-neutral-950/60 border-neutral-800 text-neutral-400 hover:text-white"
                  }`}
                >
                  <span className="text-xs font-bold block mb-1">💳 Kredi / Banka Kartı</span>
                  <span className="text-[9px] text-neutral-500 leading-normal block">Online kart ile anında ödeme</span>
                </button>
              </div>

              {/* Credit Card Fields */}
              {paymentMethod === "card" && (
                <div className="pt-3 border-t border-neutral-800/40 space-y-3 text-xs">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Kart Üzerindeki İsim</label>
                    <input
                      type="text"
                      value={cardHolder}
                      onChange={(e) => setCardHolder(e.target.value)}
                      placeholder="Ad Soyad"
                      className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-white focus:border-red-500 focus:outline-none transition"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Kart Numarası</label>
                    <input
                      type="text"
                      maxLength={19}
                      value={cardNumber}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "");
                        const formatted = val.match(/.{1,4}/g)?.join(" ") || val;
                        setCardNumber(formatted);
                      }}
                      placeholder="0000 0000 0000 0000"
                      className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-white focus:border-red-500 focus:outline-none transition font-mono"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Son Kullanma (AA/YY)</label>
                      <input
                        type="text"
                        maxLength={5}
                        value={cardExpiry}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "");
                          if (val.length >= 3) {
                            setCardExpiry(val.slice(0, 2) + "/" + val.slice(2, 4));
                          } else {
                            setCardExpiry(val);
                          }
                        }}
                        placeholder="MM/YY"
                        className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-white focus:border-red-500 focus:outline-none transition font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">CVV (Güvenlik Kodu)</label>
                      <input
                        type="password"
                        maxLength={3}
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ""))}
                        placeholder="123"
                        className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-white focus:border-red-500 focus:outline-none transition font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold py-3 text-xs transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {loading ? (
                <>
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Başvuru İletiliyor...
                </>
              ) : (
                <>
                  <Megaphone className="h-4 w-4" /> Sponsorluk Başvurusunu Gönder
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Column: Dynamic Preview */}
        <div className="lg:col-span-5 space-y-6">
          {/* Estimated pricing card */}
          <div className="bg-neutral-900/30 border border-neutral-800 rounded-2xl p-5 shadow-xl space-y-4">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Tahmini Sipariş Özeti</h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-neutral-400">
                <span>Kampanya Slotu:</span>
                <span className="font-semibold text-neutral-200">
                  {campaignType === "header" ? "Header Banner" : campaignType === "sidebar" ? "Sidebar Widget" : "Footer Banner"}
                </span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>Seçilen Şablon Tarzı:</span>
                <span className="font-semibold text-neutral-200 uppercase">{templateStyle}</span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>Günlük Limit:</span>
                <span className="font-semibold text-neutral-200">{dailyBudget} TL</span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>Yayın Süresi:</span>
                <span className="font-semibold text-neutral-200">{durationDays} Gün</span>
              </div>
              <div className="border-t border-neutral-800 my-2 pt-2 flex justify-between text-sm">
                <span className="font-bold text-white">Toplam Ödeme:</span>
                <span className="font-black text-amber-500">{totalEstimate} TL</span>
              </div>
            </div>

            <div className="rounded-xl bg-amber-500/[0.02] border border-amber-500/10 p-3 flex gap-2.5 text-[11px] text-neutral-400">
              <Info className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <span>
                Başvurunuz onaylandıktan sonra e-posta adresiniz üzerinden faturalandırma ve ödeme detayları gönderilecektir.
              </span>
            </div>
          </div>

          {/* Real-time Dynamic Preview banner */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block">CANLI ŞABLON ÖNİZLEMESİ</span>
            <div className="rounded-2xl border border-neutral-800 bg-neutral-950/60 p-4 relative overflow-hidden min-h-32 flex flex-col justify-center">
              {templateStyle === "clean" && (
                <div className="p-4 bg-gradient-to-r from-neutral-900 to-neutral-950 text-white flex items-center justify-between border-l-4 border-red-500 rounded-xl">
                  <div className="space-y-0.5">
                    <span className="text-[9px] font-bold text-red-500 uppercase tracking-widest block">SPONSOR</span>
                    <h5 className="text-xs font-extrabold text-neutral-100">{companyName || "Firma Adı Yazın"}</h5>
                    <p className="text-[10px] text-neutral-400 line-clamp-1">Yüksek hız, güvenli dönüştürme ve kesintisiz müzik.</p>
                  </div>
                  <span className="rounded bg-white px-3 py-1.5 text-[10px] font-bold text-neutral-950 shrink-0 ml-3">
                    Ziyaret Et
                  </span>
                </div>
              )}

              {templateStyle === "spotify" && (
                <div className="p-4 bg-gradient-to-r from-[#121212] to-[#1ED760]/5 text-white flex items-center justify-between border-l-4 border-[#1ED760] rounded-xl">
                  <div className="space-y-0.5">
                    <span className="text-[9px] font-bold text-[#1ED760] uppercase tracking-widest flex items-center gap-0.5">
                      ★ SPOTIFY LİSTE
                    </span>
                    <h5 className="text-xs font-extrabold text-white">{companyName || "Liste Adı Yazın"}</h5>
                    <p className="text-[10px] text-[#b3b3b3] line-clamp-1">Sıradaki hit şarkıyı hemen şimdi keşfet.</p>
                  </div>
                  <span className="rounded-full bg-[#1ED760] px-4 py-1.5 text-[10px] font-extrabold text-black shrink-0 ml-3 uppercase">
                    DİNLE
                  </span>
                </div>
              )}

              {templateStyle === "neon" && (
                <div className="p-4 bg-gradient-to-r from-neutral-950 via-[#ff0055]/5 to-neutral-950 text-white flex items-center justify-between border border-[#ff0055]/30 rounded-xl shadow-[0_0_15px_rgba(255,0,85,0.05)]">
                  <div className="space-y-0.5">
                    <span className="text-[9px] font-bold text-[#ff0055] uppercase tracking-widest block">NEON BEAT</span>
                    <h5 className="text-xs font-black text-white tracking-wide uppercase">{companyName || "Marka Adı Yazın"}</h5>
                    <p className="text-[10px] text-neutral-400 font-mono line-clamp-1">Sınırları aşan ritimler ve tınılar.</p>
                  </div>
                  <span className="rounded bg-transparent px-3 py-1.5 text-[10px] font-bold text-[#ff0055] border border-[#ff0055] shrink-0 ml-3">
                    KATIL
                  </span>
                </div>
              )}

              {templateStyle === "retro" && (
                <div className="p-4 bg-[#1a1512] text-[#f4eae1] flex items-center justify-between border-l-4 border-[#8b5a2b] rounded-xl">
                  <div className="space-y-0.5">
                    <span className="text-[9px] font-bold text-[#8b5a2b] uppercase tracking-widest block">VINTAGE VINYL</span>
                    <h5 className="text-xs font-serif font-bold text-[#f4eae1]">{companyName || "Nostalji Adı Yazın"}</h5>
                    <p className="text-[10px] text-[#c5b3a3] font-serif italic line-clamp-1">Nostaljik plak sıcaklığı ve analog müziğin büyüsü.</p>
                  </div>
                  <span className="rounded bg-[#8b5a2b] px-3 py-1.5 text-[10px] font-bold text-[#f4eae1] shrink-0 ml-3">
                    İNCELE
                  </span>
                </div>
              )}

              {templateStyle === "custom" && (
                <div className="relative rounded-xl overflow-hidden group">
                  {bannerUrl ? (
                    <img
                      src={bannerUrl}
                      alt={companyName || "Önizleme"}
                      className="w-full h-20 object-cover"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=1200&auto=format&fit=crop";
                      }}
                    />
                  ) : (
                    <div className="h-20 w-full bg-neutral-950 flex flex-col items-center justify-center border border-dashed border-neutral-800 rounded-xl">
                      <Megaphone className="h-4 w-4 text-neutral-600 mb-1" />
                      <span className="text-[10px] text-neutral-500 font-bold">Özel Resim Linki Girin</span>
                    </div>
                  )}
                  <div className="absolute top-2 right-2 rounded bg-black/60 px-1 py-0.5 text-[8px] font-bold text-white uppercase">
                    Sponsorlu
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
