import React, { useState, useEffect, useRef } from "react";
import { 
  MessageSquare, X, Send, HelpCircle, Headphones, ArrowRight, ShieldCheck, AlertCircle
} from "lucide-react";
import { User } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { audioSynth } from "../lib/audio";

interface LiveSupportProps {
  currentUser: User | null;
  onOpenPremium: () => void;
}

interface SupportMessage {
  id: string;
  sessionId: string;
  userName: string;
  userEmail: string;
  sender: "user" | "support";
  text: string;
  createdAt: string;
  isRead: boolean;
}

export default function LiveSupport({ currentUser, onOpenPremium }: LiveSupportProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [hasNewMessageBadge, setHasNewMessageBadge] = useState(false);
  const [sessionId, setSessionId] = useState<string>("");
  const [sessionSubject, setSessionSubject] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [activeSessionLoading, setActiveSessionLoading] = useState(false);
  
  // Ticket Form States
  const [ticketSubject, setTicketSubject] = useState("Ödeme / Premium Onaylama 💳");
  const [ticketMessage, setTicketMessage] = useState("");
  const [creatingTicket, setCreatingTicket] = useState(false);
  const [ticketError, setTicketError] = useState("");

  // Support Status States
  const [supportStatus, setSupportStatus] = useState<{
    isOpen: boolean;
    reason: string | null;
    supportStartHour: string;
    supportEndHour: string;
    supportEnabled: boolean;
  } | null>(null);

  const fetchSupportStatus = async () => {
    try {
      const res = await fetch("/api/support/status");
      if (res.ok) {
        const data = await res.json();
        setSupportStatus(data);
      }
    } catch (e) {
      console.error("Support status fetch error:", e);
    }
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMessagesCountRef = useRef<number>(0);

  // Check for active session from server when user is logged in
  const checkActiveSession = async () => {
    const token = localStorage.getItem("yt_converter_token");
    if (!token || !currentUser) {
      setSessionId("");
      return;
    }

    try {
      setActiveSessionLoading(true);
      const res = await fetch("/api/support/active-session", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.session) {
          setSessionId(data.session.id);
          setSessionSubject(data.session.subject);
        } else {
          setSessionId("");
          setSessionSubject("");
        }
      }
    } catch (e) {
      console.error("Aktif destek oturumu sorgulanamadı:", e);
    } finally {
      setActiveSessionLoading(false);
    }
  };

  // Run on mount, user change, or when chat opens
  useEffect(() => {
    checkActiveSession();
    fetchSupportStatus();
  }, [currentUser, isOpen]);

  // Fetch support messages
  const fetchMessages = async (silent = false) => {
    const token = localStorage.getItem("yt_converter_token");
    if (!sessionId || !token) return;

    try {
      if (!silent) setLoading(true);
      const res = await fetch(`/api/support/messages?sessionId=${sessionId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        const serverMsgs = data.messages || [];
        
        // Check if there are new messages from support
        if (serverMsgs.length > prevMessagesCountRef.current) {
          const lastMsg = serverMsgs[serverMsgs.length - 1];
          if (lastMsg && lastMsg.sender === "support" && prevMessagesCountRef.current > 0) {
            // New message from support received!
            if (!isOpen) {
              setHasNewMessageBadge(true);
            }
            audioSynth.playSuccess("crystalline");
          }
        }
        
        setMessages(serverMsgs);
        prevMessagesCountRef.current = serverMsgs.length;
      } else if (res.status === 403 || res.status === 404) {
        // Session might be closed or unauthorized, let's clear local state to allow new ticket
        setSessionId("");
        setSessionSubject("");
      }
    } catch (e) {
      console.error("Destek mesajları alınamadı:", e);
    } finally {
      setLoading(false);
    }
  };

  // Poll for messages and ticket status
  useEffect(() => {
    if (!sessionId) return;
    
    // Initial load
    fetchMessages();

    // Polling interval: 4 seconds
    const interval = setInterval(() => {
      fetchMessages(true);
      // Periodically verify if the session is still active
      const token = localStorage.getItem("yt_converter_token");
      if (token && currentUser) {
        fetch("/api/support/active-session", {
          headers: { Authorization: `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(data => {
          if (!data.session) {
            setSessionId("");
            setSessionSubject("");
          }
        })
        .catch(() => {});
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [sessionId]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Handle support ticket creation (Talep Oluşturma)
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("yt_converter_token");
    if (!token || !currentUser || !ticketMessage.trim() || !ticketSubject) return;

    setCreatingTicket(true);
    setTicketError("");
    audioSynth.playClick();

    try {
      const res = await fetch("/api/support/sessions/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          subject: ticketSubject,
          initialMessage: ticketMessage.trim()
        })
      });

      if (res.ok) {
        const data = await res.json();
        setSessionId(data.session.id);
        setSessionSubject(data.session.subject);
        setTicketMessage("");
        audioSynth.playSuccess("crystalline");
      } else {
        const errData = await res.json();
        setTicketError(errData.error || "Talep oluşturulurken bir hata oluştu.");
      }
    } catch (err) {
      setTicketError("Ağ bağlantısı kurulamadı kanka.");
    } finally {
      setCreatingTicket(false);
    }
  };

  // Send single chat message in active session
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("yt_converter_token");
    if (!inputValue.trim() || !sessionId || !token) return;

    const userText = inputValue.trim();
    setInputValue("");
    audioSynth.playClick();

    // Optimistic append
    const tempId = "temp-" + Date.now();
    const tempMsg: SupportMessage = {
      id: tempId,
      sessionId,
      userName: currentUser?.name || "Misafir Üye",
      userEmail: currentUser?.email || "",
      sender: "user",
      text: userText,
      createdAt: new Date().toISOString(),
      isRead: false
    };

    setMessages(prev => [...prev, tempMsg]);

    try {
      const res = await fetch("/api/support/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          sessionId,
          text: userText,
          sender: "user"
        })
      });

      if (res.ok) {
        fetchMessages(true);
      }
    } catch (error) {
      console.error("Mesaj gönderme hatası:", error);
    }
  };

  const openSupportAndClearBadge = () => {
    setIsOpen(true);
    setHasNewMessageBadge(false);
    audioSynth.playClick();
  };

  const formatMessageTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
    } catch (e) {
      return "";
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans" id="live-support-widget">
      <AnimatePresence>
        {/* Expanded Chat Window */}
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 50 }}
            className="mb-4 w-[360px] max-w-[calc(100vw-32px)] rounded-2xl border border-neutral-800 bg-neutral-900/95 shadow-2xl backdrop-blur-md overflow-hidden flex flex-col"
            style={{ height: "480px" }}
            id="support-chat-window"
          >
            {/* Header */}
            <div className="bg-red-600/90 text-white p-4 flex items-center justify-between border-b border-red-700">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="h-10 w-10 rounded-full bg-neutral-950 border border-neutral-800 flex items-center justify-center overflow-hidden">
                    <Headphones className="h-5 w-5 text-red-500" />
                  </div>
                  <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-neutral-900 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-sm font-bold tracking-tight">Canlı Destek Hattı 👩‍💻</h4>
                  <span className="text-[10px] text-neutral-200 font-medium flex items-center gap-1">
                    {currentUser ? "Çevrimiçi • Canlı Destek Temsilcisi" : "Lütfen Üye Girişi Yapın"}
                  </span>
                </div>
              </div>
              <button
                onClick={() => { setIsOpen(false); audioSynth.playClick(); }}
                className="rounded-full hover:bg-black/20 p-1.5 transition cursor-pointer text-white/80 hover:text-white"
                id="close-support-btn"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Main content body inside support widget */}
            {!currentUser ? (
              /* REQUIRE LOGIN STATE */
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-neutral-950/20" id="support-login-required">
                <div className="h-12 w-12 rounded-full bg-red-600/10 flex items-center justify-center text-red-500 mb-3 border border-red-500/20">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h4 className="text-sm font-bold text-white mb-2">Giriş Yapılması Gerekli 🔒</h4>
                <p className="text-xs text-neutral-400 max-w-xs leading-relaxed mb-4">
                  Kanka, canlı desteği kullanabilmek ve admin ekibimizle anlık görüşebilmek için üye olman ve giriş yapman gerekmektedir.
                </p>
                <div className="text-[11px] text-neutral-500 font-black tracking-wide bg-neutral-950 px-3 py-1.5 rounded-lg border border-neutral-800">
                  SAYFANIN SAĞ ÜSTÜNDEKİ BUTONDAN GİRİŞ YAP kanka!
                </div>
              </div>
            ) : activeSessionLoading ? (
              /* LOADING STATE */
              <div className="flex-1 flex items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
              </div>
            ) : !sessionId ? (
              /* CREATE SUPPORT TICKET FORM STATE */
              supportStatus && !supportStatus.isOpen ? (
                <div className="flex-1 p-6 flex flex-col items-center justify-center text-center bg-neutral-950/20" id="support-closed-screen">
                  <div className="h-14 w-14 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 mb-4 border border-amber-500/20 animate-pulse">
                    <Headphones className="h-7 w-7" />
                  </div>
                  <h4 className="text-sm font-bold text-white mb-2 uppercase tracking-wide">
                    {supportStatus.reason === "support_disabled" ? "Destek Hattı Geçici Olarak Kapalı 🔴" : "Mesai Saatleri Dışındayız kanka ⏰"}
                  </h4>
                  <p className="text-xs text-neutral-400 max-w-xs leading-relaxed mb-4">
                    {supportStatus.reason === "support_disabled" 
                      ? "Canlı destek hattımız şu anda yöneticiler tarafından geçici olarak kapatılmıştır kanka. Lütfen daha sonra tekrar dene."
                      : `Canlı destek çalışma saatlerimiz sabah ${supportStatus.supportStartHour} ile akşam ${supportStatus.supportEndHour} arasındadır kanka. Şu an hizmet dışındayız.`}
                  </p>
                  <div className="text-[11px] font-mono text-amber-400 font-bold bg-neutral-950 px-4 py-2.5 rounded-xl border border-neutral-800">
                    Çalışma Saatleri: {supportStatus.supportStartHour} - {supportStatus.supportEndHour}
                  </div>
                </div>
              ) : (
                <form onSubmit={handleCreateTicket} className="flex-1 p-5 flex flex-col gap-4 overflow-y-auto text-left" id="support-ticket-form">
                  <div className="bg-neutral-950/40 border border-neutral-800/80 rounded-xl p-3 text-[11px] text-neutral-300 leading-relaxed flex items-start gap-2.5">
                    <HelpCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                    <span>
                      Kanka, canlı desteğe bağlanmadan önce talebini sınıflandırmamız gerekiyor. Formu doldur, anında admin ekibimize iletelim!
                    </span>
                  </div>

                  {ticketError && (
                    <div className="p-3 rounded-lg bg-red-600/10 border border-red-500/20 text-red-500 text-xs flex items-center gap-2 font-semibold">
                      <AlertCircle className="h-3.5 w-3.5" /> {ticketError}
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-wider mb-1.5">
                      Destek Konusu kanka:
                    </label>
                    <select
                      value={ticketSubject}
                      onChange={(e) => setTicketSubject(e.target.value)}
                      className="w-full rounded-xl bg-neutral-950 border border-neutral-800 px-3 py-2.5 text-xs text-white focus:border-red-600 focus:outline-none transition font-semibold cursor-pointer"
                    >
                      <option value="Ödeme / Premium Onaylama 💳">Ödeme / Premium Onaylama 💳</option>
                      <option value="Dönüştürme / Hata Bildirimi 🔄">Dönüştürme / Hata Bildirimi 🔄</option>
                      <option value="Reklam Şikayeti / Öneri 📢">Reklam Şikayeti / Öneri 📢</option>
                      <option value="Diğer Sorular ❓">Diğer Sorular ❓</option>
                    </select>
                  </div>

                  <div className="flex-1 flex flex-col">
                    <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-wider mb-1.5">
                      Mesajınız / Talebiniz:
                    </label>
                    <textarea
                      value={ticketMessage}
                      onChange={(e) => setTicketMessage(e.target.value)}
                      placeholder="Lütfen sorununuzu detaylıca buraya yazın kanka, adminlerimiz hemen incelesin..."
                      required
                      className="w-full flex-1 min-h-[100px] rounded-xl bg-neutral-950 border border-neutral-800 p-3 text-xs text-white placeholder-neutral-500 focus:border-red-600 focus:outline-none transition resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={creatingTicket}
                    className="w-full rounded-xl bg-red-600 hover:bg-red-700 disabled:bg-neutral-800 disabled:text-neutral-500 text-white py-3 text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 shrink-0 uppercase tracking-wide"
                  >
                    {creatingTicket ? (
                      <>
                        <div className="h-3 w-3 animate-spin rounded-full border border-white border-t-transparent" />
                        Talep İletiliyor...
                      </>
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5" /> Canlı Desteğe Bağlan kanka
                      </>
                    )}
                  </button>
                </form>
              )
            ) : (
              /* ACTIVE CHAT SCREEN */
              <>
                {/* Active Session Info strip */}
                <div className="bg-neutral-950/80 border-b border-neutral-850 px-4 py-2 text-left shrink-0">
                  <span className="text-[9px] font-bold text-neutral-500 block uppercase tracking-wide">AKTİF DESTEK KONUSU:</span>
                  <span className="text-xs font-bold text-red-400 block mt-0.5">{sessionSubject || "Genel Destek"}</span>
                </div>

                {supportStatus && !supportStatus.isOpen && (
                  <div className="bg-red-950/40 border-b border-red-900/40 px-4 py-2 text-left shrink-0 text-[10px] text-red-400 font-semibold flex items-center gap-1.5 leading-snug">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-500" />
                    <span>
                      Canlı destek şu an hizmet dışıdır kanka. Yeni mesaj gönderimi kapatılmıştır.
                    </span>
                  </div>
                )}

                {/* Chat Messages Body */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-neutral-800 bg-neutral-950/40">
                  {messages.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-neutral-500 italic">
                      Mesaj geçmişi yükleniyor kanka...
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs font-medium leading-relaxed text-left ${
                            msg.sender === "user"
                              ? "bg-red-600 text-white rounded-tr-none shadow-md shadow-red-950/10"
                              : "bg-neutral-800 text-neutral-200 rounded-tl-none border border-neutral-700/50"
                          }`}
                        >
                          {msg.text}
                          {msg.text.includes("Premium") && msg.sender === "support" && (
                            <div className="mt-2 pt-2 border-t border-neutral-700 flex justify-end">
                              <button
                                onClick={() => {
                                  onOpenPremium();
                                  setIsOpen(false);
                                }}
                                className="flex items-center gap-1 text-[10px] font-black uppercase text-amber-400 hover:underline bg-neutral-900 px-2 py-1 rounded"
                              >
                                👑 Premium'a Git <ArrowRight className="h-2.5 w-2.5" />
                              </button>
                            </div>
                          )}
                        </div>
                        <span className="text-[9px] text-neutral-500 mt-1 px-1 font-mono">
                          {formatMessageTime(msg.createdAt)}
                        </span>
                      </div>
                    ))
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Form Input */}
                <form onSubmit={handleSendMessage} className="p-3 border-t border-neutral-800/80 bg-neutral-900/90 flex gap-2 shrink-0">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    disabled={supportStatus ? !supportStatus.isOpen : false}
                    placeholder={
                      supportStatus && !supportStatus.isOpen 
                        ? `Kapalıdır kanka (${supportStatus.supportStartHour} - ${supportStatus.supportEndHour})`
                        : "Mesajınızı buraya yazın..."
                    }
                    className="flex-1 rounded-xl bg-neutral-950 border border-neutral-800 px-4 py-2.5 text-xs text-white placeholder-neutral-500 focus:border-red-600 focus:outline-none transition disabled:opacity-50"
                    id="support-message-input"
                  />
                  <button
                    type="submit"
                    disabled={supportStatus ? !supportStatus.isOpen : false}
                    className="rounded-xl bg-red-600 hover:bg-red-700 disabled:bg-neutral-800 disabled:text-neutral-500 px-3.5 py-2.5 text-white transition cursor-pointer flex items-center justify-center shrink-0"
                    id="support-send-btn"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pulsing Toggle Bubble */}
      <button
        onClick={openSupportAndClearBadge}
        className={`relative h-14 w-14 rounded-full flex items-center justify-center text-white shadow-2xl transition-all duration-300 transform hover:scale-105 active:scale-95 cursor-pointer ${
          isOpen ? "bg-neutral-800 border border-neutral-700" : "bg-red-600 hover:bg-red-700"
        }`}
        id="support-toggle-bubble"
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <div className="relative">
            <MessageSquare className="h-6 w-6" />
            {hasNewMessageBadge && (
              <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-[9px] font-bold text-white items-center justify-center">
                  1
                </span>
              </span>
            )}
          </div>
        )}
      </button>
    </div>
  );
}
