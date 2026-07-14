import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { initFirestoreSync, syncToFirestore } from "./src/lib/firebaseAdmin";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// Database File Path
const DB_FILE = path.join(process.cwd(), "database.json");

// Define Super Admin Email
const SUPER_ADMIN_EMAIL = "tumayisildak700@gmail.com";

// Initialize Database if it doesn't exist
const initialDb = {
  users: [
    {
      id: "superadmin-init",
      email: SUPER_ADMIN_EMAIL,
      name: "Tümay Işıldak",
      passwordHash: crypto.createHash("sha256").update("admin123").digest("hex"), // default password, user can log in or register
      role: "admin",
      isPremium: true,
      createdAt: new Date().toISOString()
    }
  ],
  announcements: [
    {
      id: "ann-1",
      title: "Sitemize Hoş Geldiniz! 🚀",
      content: "Türkiye'nin en hızlı, güvenli ve tamamen reklamsız YouTube MP3 / MP4 dönüştürücü platformuna hoş geldiniz. Sınırsız ve yüksek kalitede dönüştürme yapabilirsiniz.",
      createdAt: new Date().toISOString(),
      authorName: "Tümay Işıldak"
    },
    {
      id: "ann-2",
      title: "Yeni MP3 320kbps Desteği Eklendi! 🎵",
      content: "Ses dosyası dönüştürmelerinde artık en yüksek ses kalitesi olan 320kbps kalitesini seçebilirsiniz. Keyifli dinlemeler dileriz!",
      createdAt: new Date().toISOString(),
      authorName: "Sistem Yöneticisi"
    }
  ],
  conversions: [],
  config: {
    premiumMonthlyPrice: 49,
    premiumYearlyPrice: 470,
    bankDetails: {
      bankName: "Garanti BBVA",
      iban: "TR93 0006 2000 0001 2345 6789 01",
      accountHolder: "Tümay Işıldak"
    }
  }
};

let dbInMemoryCache: any = null;

if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2), "utf-8");
}

// Read/Write Helpers
function readDb() {
  if (dbInMemoryCache) {
    return dbInMemoryCache;
  }

  let parsed: any;
  try {
    const data = fs.readFileSync(DB_FILE, "utf-8");
    parsed = JSON.parse(data);
  } catch (error) {
    parsed = JSON.parse(JSON.stringify(initialDb));
  }

  // Make sure config exists in read data
  if (!parsed.config) {
    parsed.config = {
      premiumMonthlyPrice: 49,
      premiumYearlyPrice: 470,
      bankDetails: {
        bankName: "Garanti BBVA",
        iban: "TR93 0006 2000 0001 2345 6789 01",
        accountHolder: "Tümay Işıldak"
      }
    };
  }
  if (!parsed.config.bankDetails) {
    parsed.config.bankDetails = {
      bankName: "Garanti BBVA",
      iban: "TR93 0006 2000 0001 2345 6789 01",
      accountHolder: "Tümay Işıldak"
    };
  }
  if (!parsed.config.supportStartHour) {
    parsed.config.supportStartHour = "09:00";
  }
  if (!parsed.config.supportEndHour) {
    parsed.config.supportEndHour = "18:00";
  }
  if (parsed.config.supportEnabled === undefined) {
    parsed.config.supportEnabled = true;
  }
  // Ensure friendships and messages collections exist
  if (!parsed.friendships) {
    parsed.friendships = [];
  }
  if (!parsed.messages) {
    parsed.messages = [];
  }
  // Backfill usernames for existing users who do not have one
  if (parsed.users && Array.isArray(parsed.users)) {
    let changed = false;
    parsed.users.forEach((u: any) => {
      if (!u.username) {
        let baseUsername = (u.name || "user").trim().toLowerCase()
          .replace(/[^a-z0-9_]/g, "")
          .slice(0, 15);
        if (!baseUsername) baseUsername = "user";
        let username = baseUsername;
        let suffix = 1;
        while (parsed.users.some((x: any) => x.id !== u.id && x.username === username)) {
          username = `${baseUsername}${suffix}`;
          suffix++;
        }
        u.username = username;
        changed = true;
      }
    });
    if (changed) {
      try {
        fs.writeFileSync(DB_FILE, JSON.stringify(parsed, null, 2), "utf-8");
      } catch (e) {}
    }
  }
  dbInMemoryCache = parsed;
  return parsed;
}

function writeDb(data: any) {
  dbInMemoryCache = data;
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to write local database.json:", e);
  }
  // Asynchronously synchronize with Firestore
  syncToFirestore(data).catch((err) => {
    console.error("Failed to sync to Firestore in background:", err);
  });
}

function logSystemActivity(action: string, details: string) {
  try {
    const db = readDb();
    if (!db.systemLogs) {
      db.systemLogs = [];
    }
    db.systemLogs.unshift({
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      action,
      details
    });
    // Keep only last 100 logs
    if (db.systemLogs.length > 100) {
      db.systemLogs = db.systemLogs.slice(0, 100);
    }
    writeDb(db);
  } catch (error) {
    // Fail silently
  }
}

function getClientIp(req: any) {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return req.ip || req.connection?.remoteAddress || "";
}

// Automatic Profanity Censorship Helper for Turkish Swear Words
function censorProfanity(text: string): string {
  if (!text) return "";
  let badWords = [
    "orospu çocuğu", "orospu cocugu", "amına koyayım", "amınakoyayım",
    "pezevenk", "orospu", "siktir", "sikeyim", "sikerim", "götveren", "gotveren",
    "amcık", "amcik", "yarrak", "yarak", "taşşak", "tassak", "kaltak", "gavat",
    "ibne", "kahpe", "amk", "aq", "piç", "pic", "göt", "got", "sik"
  ];
  try {
    const db = readDb();
    if (db.censoredWords && Array.isArray(db.censoredWords) && db.censoredWords.length > 0) {
      badWords = db.censoredWords;
    }
  } catch (e) {
    // Fallback if readDb fails
  }

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

// In-Memory Token Session Store
// Maps tokens to User Objects
const sessionStore = new Map<string, any>();

// Authentication Middleware
function authenticateToken(req: any, res: any, next: any) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Giriş yapmanız gerekiyor." });
  }

  const user = sessionStore.get(token);
  if (!user) {
    return res.status(403).json({ error: "Geçersiz veya süresi dolmuş oturum." });
  }

  // Check if user is banned in database
  const db = readDb();
  const dbUser = db.users.find((u: any) => u.id === user.id);
  if (dbUser && dbUser.isBanned) {
    sessionStore.delete(token);
    return res.status(403).json({ error: "Engellendin kanka, çıldırtma beni! 🚫", isBanned: true, email: dbUser.email });
  }

  // Always sync and provide the freshest user info from DB
  if (dbUser) {
    const { passwordHash: _, ...freshUser } = dbUser;
    sessionStore.set(token, freshUser);
    req.user = freshUser;
  } else {
    req.user = user;
  }
  next();
}

// Admin Check Middleware
function requireAdmin(req: any, res: any, next: any) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Bu işlem için yetkiniz bulunmamaktadır." });
  }
  next();
}

// --- API ROUTES ---

// 1. Auth: Register
app.post("/api/auth/register", (req, res) => {
  try {
    const { email, name, password } = req.body;

    if (!email || !name || !password) {
      return res.status(400).json({ error: "Lütfen tüm alanları doldurun." });
    }

    const clientIp = getClientIp(req);
    const db = readDb();
    const normalizedEmail = email.trim().toLowerCase();

    // Check if IP is banned
    if (db.bannedIps && db.bannedIps.includes(clientIp)) {
      return res.status(403).json({ 
        error: "Engellendin kanka, çıldırtma beni! 🚫", 
        isBanned: true, 
        email: normalizedEmail 
      });
    }

    // Check if user already exists
    const existingUser = db.users.find((u: any) => u.email.toLowerCase() === normalizedEmail);
    if (existingUser) {
      return res.status(400).json({ error: "Bu e-posta adresi zaten kullanımda." });
    }

    const passwordHash = crypto.createHash("sha256").update(password).digest("hex");
    
    // Check if registering email is the protected creator email
    const isSuperAdmin = normalizedEmail === SUPER_ADMIN_EMAIL;
    const role = isSuperAdmin ? "admin" : "user";
    const isPremium = isSuperAdmin ? true : false;

    // Helper to generate a unique username from name
    let baseUsername = name.trim().toLowerCase()
      .replace(/[^a-z0-9_]/g, "") // remove non-alphanumeric/non-underscore characters
      .slice(0, 15);
    if (!baseUsername) baseUsername = "user";
    
    let username = baseUsername;
    let suffix = 1;
    while (db.users.some((u: any) => u.username === username)) {
      username = `${baseUsername}${suffix}`;
      suffix++;
    }

    const newUser = {
      id: crypto.randomUUID(),
      email: normalizedEmail,
      name: name.trim(),
      username,
      passwordHash,
      role,
      isPremium,
      createdAt: new Date().toISOString(),
      lastIp: clientIp,
      ips: [clientIp]
    };

    db.users.push(newUser);
    writeDb(db);
    logSystemActivity("Kayıt", `${newUser.name} (${newUser.email}) kayıt oldu.`);

    // Auto-login after registration
    const token = crypto.randomBytes(32).toString("hex");
    const { passwordHash: _, ...userWithoutPassword } = newUser;
    sessionStore.set(token, userWithoutPassword);

    res.status(201).json({ token, user: userWithoutPassword });
  } catch (error: any) {
    res.status(500).json({ error: "Kayıt işlemi sırasında bir hata oluştu." });
  }
});

// 2. Auth: Login
app.post("/api/auth/login", (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Lütfen e-posta ve şifrenizi girin." });
    }

    const clientIp = getClientIp(req);
    const db = readDb();
    const normalizedEmail = email.trim().toLowerCase();

    // Check if IP is banned
    if (db.bannedIps && db.bannedIps.includes(clientIp)) {
      return res.status(403).json({
        error: "Engellendin kanka, çıldırtma beni! 🚫",
        isBanned: true,
        email: normalizedEmail
      });
    }

    const user = db.users.find((u: any) => u.email.toLowerCase() === normalizedEmail);

    if (!user) {
      return res.status(400).json({ error: "Hatalı e-posta veya şifre." });
    }

    if (user.isBanned) {
      return res.status(403).json({ 
        error: "Engellendin kanka, çıldırtma beni! 🚫", 
        isBanned: true, 
        email: normalizedEmail 
      });
    }

    const passwordHash = crypto.createHash("sha256").update(password).digest("hex");
    if (user.passwordHash !== passwordHash) {
      return res.status(400).json({ error: "Hatalı e-posta veya şifre." });
    }

    // Update last IP and list of IPs
    if (!user.ips) user.ips = [];
    if (!user.ips.includes(clientIp)) {
      user.ips.push(clientIp);
    }
    user.lastIp = clientIp;
    writeDb(db);
    logSystemActivity("Giriş", `${user.name} (${user.email}) sisteme giriş yaptı.`);

    // Generate session token
    const token = crypto.randomBytes(32).toString("hex");
    const { passwordHash: _, ...userWithoutPassword } = user;
    sessionStore.set(token, userWithoutPassword);

    res.json({ token, user: userWithoutPassword });
  } catch (error: any) {
    res.status(500).json({ error: "Giriş işlemi sırasında bir hata oluştu." });
  }
});

// Helper to calculate badges based on rankings
function getUserBadge(userId: string, db: any): string {
  const users = db.users || [];
  const activeUsers = users
    .filter((u: any) => u.role !== "admin")
    .sort((a: any, b: any) => (b.downloadsCount || 0) - (a.downloadsCount || 0));
    
  const index = activeUsers.findIndex((u: any) => u.id === userId);
  if (index === -1) return "";
  
  const user = activeUsers[index];
  if (!user.downloadsCount || user.downloadsCount <= 0) return "";
  
  const rank = index + 1;
  if (rank === 1) return "altin";
  if (rank === 2 || rank === 3) return "gumus";
  if (rank >= 4 && rank <= 10) return "bronz";
  return "";
}

// 3. Auth: Current User
app.get("/api/auth/me", authenticateToken, (req: any, res: any) => {
  // Sync in-memory user role from DB in case it changed
  const db = readDb();
  const dbUser = db.users.find((u: any) => u.id === req.user.id);
  if (dbUser) {
    const { passwordHash: _, ...userWithoutPassword } = dbUser;
    (userWithoutPassword as any).badge = getUserBadge(dbUser.id, db);
    // Update store
    sessionStore.set(req.headers["authorization"]?.split(" ")[1] || "", userWithoutPassword);
    return res.json(userWithoutPassword);
  }
  res.json(req.user);
});

// 3.1 Auth: Update Profile
app.post("/api/auth/update-profile", authenticateToken, (req: any, res: any) => {
  try {
    const { avatar, name, username } = req.body;
    const db = readDb();
    const userIndex = db.users.findIndex((u: any) => u.id === req.user.id);
    if (userIndex === -1) {
      return res.status(404).json({ error: "Kullanıcı bulunamadı." });
    }
    
    const user = db.users[userIndex];
    
    if (avatar !== undefined) {
      user.avatar = avatar || "";
    }
    
    if (name !== undefined && name.trim() && name.trim() !== user.name) {
      user.name = name.trim();
    }
    
    if (username !== undefined && username.trim() && username.trim().toLowerCase() !== (user.username || "").toLowerCase()) {
      const trimmedUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
      
      if (trimmedUsername.length < 3 || trimmedUsername.length > 20) {
        return res.status(400).json({ error: "Kullanıcı adı 3-20 karakter uzunluğunda olmalı ve sadece İngilizce harf, sayı veya alt çizgi içermelidir." });
      }
      
      // Enforce 7-day cooldown on username changes
      if (user.lastUsernameUpdateAt) {
        const lastUpdate = new Date(user.lastUsernameUpdateAt).getTime();
        const cooldownPeriod = 7 * 24 * 60 * 60 * 1000; // 7 days in ms
        const timeDiff = Date.now() - lastUpdate;
        
        if (timeDiff < cooldownPeriod) {
          const remainingMs = cooldownPeriod - timeDiff;
          const remainingDays = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
          return res.status(400).json({ 
            error: `Kullanıcı adınızı sadece 7 günde bir değiştirebilirsiniz. Bir sonraki değişiklik için ${remainingDays} gün beklemelisiniz.` 
          });
        }
      }
      
      // Check if username is already taken
      const usernameExists = db.users.some(
        (u: any) => u.id !== user.id && (u.username || "").toLowerCase() === trimmedUsername
      );
      if (usernameExists) {
        return res.status(400).json({ error: "Bu kullanıcı adı zaten başka bir üye tarafından alınmış." });
      }
      
      user.username = trimmedUsername;
      user.lastUsernameUpdateAt = new Date().toISOString();
    }
    
    writeDb(db);
    
    const { passwordHash: _, ...updatedUser } = db.users[userIndex];
    (updatedUser as any).badge = getUserBadge(updatedUser.id, db);
    
    // Update session store
    const token = req.headers["authorization"]?.split(" ")[1] || "";
    if (token) {
      sessionStore.set(token, updatedUser);
    }
    
    logSystemActivity("Profil Güncelleme", `${updatedUser.name} (@${updatedUser.username}) profil bilgilerini güncelledi.`);
    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ error: "Profil güncellenirken bir hata oluştu." });
  }
});

// --- Friends and Private Messages Endpoints ---

// 3.2 Friends: Get complete status (friends list, sent requests, received requests, other users)
app.get("/api/friends/status", authenticateToken, (req: any, res: any) => {
  try {
    const db = readDb();
    const currentUserId = req.user.id;
    
    // Get all other users (except current user & administrative accounts) and strip passwords/emails
    const allUsers = db.users
      .filter((u: any) => u.id !== currentUserId && u.role !== "admin")
      .map((u: any) => ({
        id: u.id,
        name: u.name,
        username: u.username || "",
        avatar: u.avatar || "",
        isPremium: u.isPremium || u.role === "admin",
        role: u.role,
        badge: getUserBadge(u.id, db)
      }));
      
    // Filter friendships involving current user
    const userFriendships = db.friendships ? db.friendships.filter(
      (f: any) => f.senderId === currentUserId || f.receiverId === currentUserId
    ) : [];
    
    const friends: any[] = [];
    const pendingSent: any[] = [];
    const pendingReceived: any[] = [];
    
    for (const f of userFriendships) {
      const isSender = f.senderId === currentUserId;
      const otherUserId = isSender ? f.receiverId : f.senderId;
      const otherUser = db.users.find((u: any) => u.id === otherUserId);
      
      if (!otherUser) continue;
      
      const otherUserClean = {
        id: otherUser.id,
        name: otherUser.name,
        username: otherUser.username || "",
        avatar: otherUser.avatar || "",
        isPremium: otherUser.isPremium || otherUser.role === "admin",
        role: otherUser.role,
        badge: getUserBadge(otherUser.id, db)
      };
      
      if (f.status === "accepted") {
        friends.push(otherUserClean);
      } else if (f.status === "pending") {
        if (isSender) {
          pendingSent.push({
            requestId: f.id,
            receiver: otherUserClean,
            createdAt: f.createdAt
          });
        } else {
          pendingReceived.push({
            requestId: f.id,
            sender: otherUserClean,
            createdAt: f.createdAt
          });
        }
      }
    }
    
    res.json({
      friends,
      pendingSent,
      pendingReceived,
      allUsers
    });
  } catch (error) {
    res.status(500).json({ error: "Arkadaş bilgileri yüklenirken bir hata oluştu." });
  }
});

// 3.3 Friends: Send Friend Request
app.post("/api/friends/request", authenticateToken, (req: any, res: any) => {
  try {
    const { receiverId } = req.body;
    const currentUserId = req.user.id;
    
    if (!receiverId) {
      return res.status(400).json({ error: "Lütfen bir kullanıcı seçin." });
    }
    
    if (receiverId === currentUserId) {
      return res.status(400).json({ error: "Kendinize arkadaşlık isteği gönderemezsiniz." });
    }
    
    const db = readDb();
    const receiver = db.users.find((u: any) => u.id === receiverId);
    if (!receiver) {
      return res.status(404).json({ error: "İstek gönderilen kullanıcı bulunamadı." });
    }
    
    if (!db.friendships) {
      db.friendships = [];
    }
    
    // Check existing friendship
    const existingIndex = db.friendships.findIndex(
      (f: any) => 
        (f.senderId === currentUserId && f.receiverId === receiverId) ||
        (f.senderId === receiverId && f.receiverId === currentUserId)
    );
    
    if (existingIndex !== -1) {
      const existing = db.friendships[existingIndex];
      if (existing.status === "accepted") {
        return res.status(400).json({ error: "Zaten bu kullanıcıyla arkadaşsınız." });
      }
      if (existing.status === "pending") {
        if (existing.senderId === currentUserId) {
          return res.status(400).json({ error: "Zaten bekleyen bir arkadaşlık isteğiniz var." });
        } else {
          // If receiver sent a request to current user, accept it automatically!
          existing.status = "accepted";
          existing.updatedAt = new Date().toISOString();
          writeDb(db);
          logSystemActivity("Arkadaşlık", `${req.user.name} ve ${receiver.name} artık arkadaş.`);
          return res.json({ success: true, status: "accepted", message: "Karşı tarafın bekleyen isteği kabul edildi!" });
        }
      }
      // If declined, reset to pending
      if (existing.status === "declined") {
        existing.status = "pending";
        existing.senderId = currentUserId;
        existing.receiverId = receiverId;
        existing.updatedAt = new Date().toISOString();
        writeDb(db);
        logSystemActivity("Arkadaşlık İsteği", `${req.user.name}, ${receiver.name} kullanıcısına tekrar istek gönderdi.`);
        return res.json({ success: true, status: "pending" });
      }
    }
    
    // Create new friend request
    const newRequest = {
      id: crypto.randomUUID(),
      senderId: currentUserId,
      receiverId,
      status: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    db.friendships.push(newRequest);
    writeDb(db);
    logSystemActivity("Arkadaşlık İsteği", `${req.user.name}, ${receiver.name} kullanıcısına arkadaşlık isteği gönderdi.`);
    res.json({ success: true, status: "pending" });
  } catch (error) {
    res.status(500).json({ error: "Arkadaşlık isteği gönderilemedi." });
  }
});

// 3.4.1 Leaderboard: Get Top 10 downloaders with dynamic badges
app.get("/api/leaderboard", (req, res) => {
  try {
    const db = readDb();
    const users = db.users || [];
    
    // Sort all registered non-admin users by downloads count descending
    const activeUsers = users
      .filter((u: any) => u.role !== "admin")
      .map((u: any) => ({
        id: u.id,
        name: u.name,
        username: u.username || "",
        avatar: u.avatar || "",
        isPremium: u.isPremium || u.role === "admin",
        downloadsCount: u.downloadsCount || 0
      }))
      .sort((a: any, b: any) => b.downloadsCount - a.downloadsCount);
      
    // Assign badges dynamically based on rankings
    const leaderboardWithBadges = activeUsers.map((u: any, index: number) => {
      let badge = "";
      const rank = index + 1;
      if (u.downloadsCount > 0) {
        if (rank === 1) {
          badge = "altin"; // Gold
        } else if (rank === 2 || rank === 3) {
          badge = "gumus"; // Silver
        } else if (rank >= 4 && rank <= 10) {
          badge = "bronz"; // Bronze
        }
      }
      return {
        ...u,
        rank,
        badge
      };
    });
    
    res.json(leaderboardWithBadges.slice(0, 10));
  } catch (error) {
    res.status(500).json({ error: "Liderlik tablosu yüklenemedi." });
  }
});

// 3.4 Friends: Respond to Friend Request (Accept/Decline)
app.post("/api/friends/respond", authenticateToken, (req: any, res: any) => {
  try {
    const { requestId, status } = req.body;
    
    if (!requestId || !["accepted", "declined"].includes(status)) {
      return res.status(400).json({ error: "Geçersiz istek parametreleri." });
    }
    
    const db = readDb();
    if (!db.friendships) {
      db.friendships = [];
    }
    
    const friendship = db.friendships.find((f: any) => f.id === requestId);
    
    if (!friendship) {
      return res.status(404).json({ error: "Arkadaşlık isteği bulunamadı." });
    }
    
    if (friendship.receiverId !== req.user.id) {
      return res.status(403).json({ error: "Bu isteğe yanıt verme yetkiniz yok." });
    }
    
    friendship.status = status;
    friendship.updatedAt = new Date().toISOString();
    writeDb(db);
    
    const sender = db.users.find((u: any) => u.id === friendship.senderId);
    const senderName = sender ? sender.name : "Kullanıcı";
    
    if (status === "accepted") {
      logSystemActivity("Arkadaşlık Kabulü", `${req.user.name}, ${senderName} kullanıcısının arkadaşlık isteğini kabul etti.`);
    } else {
      logSystemActivity("Arkadaşlık Reddi", `${req.user.name}, ${senderName} kullanıcısının arkadaşlık isteğini reddetti.`);
    }
    
    res.json({ success: true, status });
  } catch (error) {
    res.status(500).json({ error: "İşlem gerçekleştirilemedi." });
  }
});

// 3.5 Friends: Remove a Friend
app.post("/api/friends/remove", authenticateToken, (req: any, res: any) => {
  try {
    const { friendId } = req.body;
    if (!friendId) {
      return res.status(400).json({ error: "Geçersiz kullanıcı." });
    }
    
    const db = readDb();
    if (!db.friendships) db.friendships = [];
    
    const index = db.friendships.findIndex(
      (f: any) => 
        (f.senderId === req.user.id && f.receiverId === friendId) ||
        (f.senderId === friendId && f.receiverId === req.user.id)
    );
    
    if (index === -1) {
      return res.status(404).json({ error: "Arkadaşlık kaydı bulunamadı." });
    }
    
    db.friendships.splice(index, 1);
    writeDb(db);
    
    const other = db.users.find((u: any) => u.id === friendId);
    const otherName = other ? other.name : "Kullanıcı";
    logSystemActivity("Arkadaş Silme", `${req.user.name}, ${otherName} kullanıcısını arkadaşlıktan çıkardı.`);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Arkadaş silinemedi." });
  }
});

// 3.6 Messages: Get Messages with a specific friend (and mark them as read)
app.get("/api/messages", authenticateToken, (req: any, res: any) => {
  try {
    const { friendId } = req.query;
    if (!friendId) {
      return res.status(400).json({ error: "Geçersiz kullanıcı parametresi." });
    }
    
    const db = readDb();
    if (!db.friendships) db.friendships = [];
    if (!db.messages) db.messages = [];
    
    // Check if they are friends first
    const isFriend = db.friendships.some(
      (f: any) => 
        f.status === "accepted" &&
        ((f.senderId === req.user.id && f.receiverId === friendId) ||
         (f.senderId === friendId && f.receiverId === req.user.id))
    );
    
    if (!isFriend) {
      return res.status(403).json({ error: "Sadece arkadaş olduğunuz kullanıcılarla mesajlaşabilirsiniz." });
    }
    
    // Get all messages between them
    const messages = db.messages
      .filter(
        (m: any) => 
          (m.senderId === req.user.id && m.receiverId === friendId) ||
          (m.senderId === friendId && m.receiverId === req.user.id)
      )
      .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      
    // Mark received messages as read
    let databaseUpdated = false;
    db.messages.forEach((m: any) => {
      if (m.senderId === friendId && m.receiverId === req.user.id && !m.isRead) {
        m.isRead = true;
        databaseUpdated = true;
      }
    });
    
    if (databaseUpdated) {
      writeDb(db);
    }
    
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: "Mesajlar yüklenemedi." });
  }
});

// 3.7 Messages: Send a private message
app.post("/api/messages/send", authenticateToken, (req: any, res: any) => {
  try {
    const { receiverId, content } = req.body;
    if (!receiverId || !content || !content.trim()) {
      return res.status(400).json({ error: "Mesaj içeriği boş olamaz." });
    }
    
    const db = readDb();
    if (!db.friendships) db.friendships = [];
    if (!db.messages) db.messages = [];
    
    // Check friendship
    const isFriend = db.friendships.some(
      (f: any) => 
        f.status === "accepted" &&
        ((f.senderId === req.user.id && f.receiverId === receiverId) ||
         (f.senderId === receiverId && f.receiverId === req.user.id))
    );
    
    if (!isFriend) {
      return res.status(403).json({ error: "Sadece arkadaş olduğunuz kullanıcılarla mesajlaşabilirsiniz." });
    }
    
    const newMessage = {
      id: crypto.randomUUID(),
      senderId: req.user.id,
      receiverId,
      content: censorProfanity(content.trim()),
      isRead: false,
      createdAt: new Date().toISOString()
    };
    
    db.messages.push(newMessage);
    writeDb(db);
    
    res.json(newMessage);
  } catch (error) {
    res.status(500).json({ error: "Mesaj gönderilemedi." });
  }
});

// 3.8 Messages: Get unread counts & total
app.get("/api/messages/unread", authenticateToken, (req: any, res: any) => {
  try {
    const db = readDb();
    const currentUserId = req.user.id;
    if (!db.messages) db.messages = [];
    
    const unreadMessages = db.messages.filter(
      (m: any) => m.receiverId === currentUserId && !m.isRead
    );
    
    const unreadCounts: Record<string, number> = {};
    unreadMessages.forEach((m: any) => {
      unreadCounts[m.senderId] = (unreadCounts[m.senderId] || 0) + 1;
    });
    
    res.json({
      unreadCounts,
      totalUnread: unreadMessages.length,
      unreadMessages
    });
  } catch (error) {
    res.status(500).json({ error: "Bildirimler alınamadı." });
  }
});

// 3.9 Auth: Check IP Ban Status (Public)
app.get("/api/auth/check-ip", (req, res) => {
  try {
    const clientIp = getClientIp(req);
    const db = readDb();
    if (db.bannedIps && db.bannedIps.includes(clientIp)) {
      const associatedUser = db.users.find((u: any) => u.lastIp === clientIp || (u.ips && u.ips.includes(clientIp)));
      return res.json({ 
        isBanned: true, 
        email: associatedUser ? associatedUser.email : "" 
      });
    }
    return res.json({ isBanned: false });
  } catch (error) {
    res.json({ isBanned: false });
  }
});

// 4. Announcements: Get List (Public)
app.get("/api/announcements", (req, res) => {
  const db = readDb();
  const now = new Date();
  let changed = false;

  // Auto-publish scheduled announcements whose time has arrived
  const updatedAnnouncements = (db.announcements || []).map((ann: any) => {
    if (ann.status === "scheduled" && ann.scheduledAt && new Date(ann.scheduledAt) <= now) {
      changed = true;
      return { ...ann, status: "published" };
    }
    return ann;
  });

  if (changed) {
    db.announcements = updatedAnnouncements;
    writeDb(db);
  }

  // Filter out drafts and future-scheduled announcements for public list
  const activeAnnouncements = (db.announcements || []).filter((ann: any) => {
    if (ann.status === "draft") return false;
    if (ann.status === "scheduled" && ann.scheduledAt && new Date(ann.scheduledAt) > now) return false;
    return true;
  });

  // Return announcements sorted with pinned ones first, then by newest first
  const sorted = [...activeAnnouncements].sort((a: any, b: any) => {
    const aPin = !!a.isPinned;
    const bPin = !!b.isPinned;
    if (aPin && !bPin) return -1;
    if (!aPin && bPin) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  res.json(sorted);
});

// 4.1 Announcements: Get List for Admin (Admin Only)
app.get("/api/admin/announcements", authenticateToken, requireAdmin, (req, res) => {
  try {
    const db = readDb();
    // Admin gets everything: published, draft, scheduled
    const sorted = [...(db.announcements || [])].sort((a: any, b: any) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    res.json(sorted);
  } catch (error) {
    res.status(500).json({ error: "Duyurular alınamadı." });
  }
});

// 5. Announcements: Create (Admin Only)
app.post("/api/announcements", authenticateToken, requireAdmin, (req: any, res: any) => {
  try {
    const { title, content, category, isPinned, status, scheduledAt } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: "Başlık ve içerik gereklidir." });
    }

    const db = readDb();
    const newAnn = {
      id: crypto.randomUUID(),
      title: title.trim(),
      content: content.trim(),
      category: category || "Duyuru",
      isPinned: !!isPinned,
      status: status || "published", // "published", "draft", "scheduled"
      scheduledAt: scheduledAt || null,
      readCount: 0,
      acknowledgedBy: [],
      createdAt: new Date().toISOString(),
      authorName: req.user.name
    };

    if (!db.announcements) db.announcements = [];
    db.announcements.push(newAnn);
    writeDb(db);

    logSystemActivity("Duyuru Oluşturuldu", `"${newAnn.title}" başlıklı yeni duyuru oluşturuldu (Durum: ${newAnn.status}).`);

    res.status(201).json(newAnn);
  } catch (error: any) {
    res.status(500).json({ error: "Duyuru eklenirken bir hata oluştu." });
  }
});

// 5.1 Announcements: Update/Edit (Admin Only)
app.put("/api/admin/announcements/:id", authenticateToken, requireAdmin, (req: any, res: any) => {
  try {
    const { title, content, category, isPinned, status, scheduledAt } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: "Başlık ve içerik gereklidir." });
    }

    const db = readDb();
    if (!db.announcements) db.announcements = [];
    const annIndex = db.announcements.findIndex((a: any) => a.id === req.params.id);

    if (annIndex === -1) {
      return res.status(404).json({ error: "Duyuru bulunamadı." });
    }

    const ann = db.announcements[annIndex];
    
    // Update fields
    ann.title = title.trim();
    ann.content = content.trim();
    ann.category = category || "Duyuru";
    ann.isPinned = !!isPinned;
    ann.status = status || "published";
    ann.scheduledAt = scheduledAt || null;

    writeDb(db);
    logSystemActivity("Duyuru Güncellendi", `"${ann.title}" başlıklı duyuru güncellendi (Durum: ${ann.status}).`);

    res.json(ann);
  } catch (error: any) {
    res.status(500).json({ error: "Duyuru güncellenirken bir hata oluştu." });
  }
});

// 5.5 Announcements: Acknowledge Read
app.post("/api/announcements/:id/acknowledge", (req, res) => {
  try {
    const { userId } = req.body;
    const db = readDb();
    const annIndex = db.announcements.findIndex((a: any) => a.id === req.params.id);
    
    if (annIndex === -1) {
      return res.status(404).json({ error: "Duyuru bulunamadı." });
    }
    
    const ann = db.announcements[annIndex];
    if (!ann.acknowledgedBy) {
      ann.acknowledgedBy = [];
    }
    if (!ann.readCount) {
      ann.readCount = 0;
    }
    
    const identifier = userId || req.ip || "guest";
    if (!ann.acknowledgedBy.includes(identifier)) {
      ann.acknowledgedBy.push(identifier);
      ann.readCount += 1;
      writeDb(db);
    }
    
    res.json({ message: "Duyuru okundu olarak işaretlendi.", readCount: ann.readCount });
  } catch (error) {
    res.status(500).json({ error: "İşlem gerçekleştirilemedi." });
  }
});

// 6. Announcements: Delete (Admin Only)
app.delete("/api/announcements/:id", authenticateToken, requireAdmin, (req, res) => {
  try {
    const db = readDb();
    const initialLength = db.announcements.length;
    db.announcements = db.announcements.filter((a: any) => a.id !== req.params.id);

    if (db.announcements.length === initialLength) {
      return res.status(404).json({ error: "Duyuru bulunamadı." });
    }

    writeDb(db);
    res.json({ message: "Duyuru başarıyla silindi." });
  } catch (error: any) {
    res.status(500).json({ error: "Duyuru silinirken bir hata oluştu." });
  }
});

// 6.5 Announcements: Admin Increment Read Count (Admin Only)
app.post("/api/admin/announcements/:id/increment-read-count", authenticateToken, requireAdmin, (req, res) => {
  try {
    const { amount } = req.body;
    const incrementBy = typeof amount === "number" ? amount : 1;

    const db = readDb();
    const annIndex = db.announcements.findIndex((a: any) => a.id === req.params.id);

    if (annIndex === -1) {
      return res.status(404).json({ error: "Duyuru bulunamadı." });
    }

    const ann = db.announcements[annIndex];
    if (!ann.readCount) {
      ann.readCount = 0;
    }

    ann.readCount += incrementBy;
    writeDb(db);

    res.json({ message: "Duyuru okuma sayısı artırıldı.", readCount: ann.readCount });
  } catch (error) {
    res.status(500).json({ error: "Duyuru okuma sayısı güncellenirken hata oluştu." });
  }
});

// 7. Admin: List Users (Admin Only)
app.get("/api/admin/users", authenticateToken, requireAdmin, (req, res) => {
  const db = readDb();
  // Return users without passwords
  const safeUsers = db.users.map(({ passwordHash: _, ...u }: any) => u);
  res.json(safeUsers);
});

// 8. Admin: Toggle User Admin Role (Admin Only - Superadmin is Protected!)
app.post("/api/admin/toggle-role", authenticateToken, requireAdmin, (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: "Kullanıcı ID gereklidir." });
    }

    const db = readDb();
    const userIndex = db.users.findIndex((u: any) => u.id === userId);

    if (userIndex === -1) {
      return res.status(404).json({ error: "Kullanıcı bulunamadı." });
    }

    const targetUser = db.users[userIndex];

    // CRITICAL SECURITY RULE: The creator's admin authority (tumayisildak700@gmail.com) is absolutely locked!
    if (targetUser.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
      return res.status(403).json({ error: "Bu kurucunun adminlik yetkisi alınamaz veya değiştirilemez!" });
    }

    // Toggle role
    const newRole = targetUser.role === "admin" ? "user" : "admin";
    db.users[userIndex].role = newRole;
    writeDb(db);

    res.json({ message: `Kullanıcı yetkisi başarıyla '${newRole}' olarak güncellendi.`, userId, role: newRole });
  } catch (error: any) {
    res.status(500).json({ error: "Yetki güncellenirken bir hata oluştu." });
  }
});

// 8.1 Admin: Toggle User Premium Status (Admin Only)
app.post("/api/admin/toggle-premium", authenticateToken, requireAdmin, (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: "Kullanıcı ID gereklidir." });
    }

    const db = readDb();
    const userIndex = db.users.findIndex((u: any) => u.id === userId);

    if (userIndex === -1) {
      return res.status(404).json({ error: "Kullanıcı bulunamadı." });
    }

    const targetUser = db.users[userIndex];
    const newPremiumState = !targetUser.isPremium;
    
    db.users[userIndex].isPremium = newPremiumState;
    if (newPremiumState) {
      db.users[userIndex].premiumExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    } else {
      delete db.users[userIndex].premiumExpiry;
    }
    
    writeDb(db);

    res.json({ 
      message: `Kullanıcı premium durumu başarıyla '${newPremiumState ? "Aktif" : "Pasif"}' olarak güncellendi.`, 
      userId, 
      isPremium: newPremiumState 
    });
  } catch (error: any) {
    res.status(500).json({ error: "Premium durumu güncellenirken bir hata oluştu." });
  }
});

// 8.2 Admin: Get Statistics Dashboard (Admin Only)
app.get("/api/admin/stats", authenticateToken, requireAdmin, (req, res) => {
  try {
    const db = readDb();
    const totalUsers = db.users.length;
    const premiumUsers = db.users.filter((u: any) => u.isPremium || u.role === "admin").length;
    const totalConversions = db.conversions.length;
    const completedConversions = db.conversions.filter((c: any) => c.status === "completed").length;
    const processingConversions = db.conversions.filter((c: any) => c.status === "processing").length;
    
    // Estimate simulated revenue (premium users * monthly config price)
    const monthlyPrice = db.config?.premiumMonthlyPrice || 49;
    const estimatedMonthlyRevenue = premiumUsers * monthlyPrice;

    res.json({
      totalUsers,
      premiumUsers,
      totalConversions,
      completedConversions,
      processingConversions,
      estimatedMonthlyRevenue
    });
  } catch (error) {
    res.status(500).json({ error: "İstatistikler yüklenemedi." });
  }
});

// 8.2.1 Admin: Get System Logs
app.get("/api/admin/system/logs", authenticateToken, requireAdmin, (req, res) => {
  try {
    const db = readDb();
    res.json(db.systemLogs || []);
  } catch (error) {
    res.status(500).json({ error: "Günlükler yüklenemedi." });
  }
});

// 8.2.2 Admin: Clear System Logs
app.post("/api/admin/system/clear-logs", authenticateToken, requireAdmin, (req, res) => {
  try {
    const db = readDb();
    db.systemLogs = [];
    writeDb(db);
    logSystemActivity("Temizlik", "Sistem işlem günlükleri temizlendi.");
    res.json({ message: "İşlem günlükleri başarıyla sıfırlandı." });
  } catch (error) {
    res.status(500).json({ error: "Günlükler silinemedi." });
  }
});

// 8.2.3 Admin: Clean Conversions (Optimize Database JSON size)
app.post("/api/admin/system/clean-conversions", authenticateToken, requireAdmin, (req, res) => {
  try {
    const db = readDb();
    const initialCount = (db.conversions || []).length;
    
    // Keep only completed conversions that are less than 7 days old, or keep only the last 50 completed conversions
    // Let's filter out failed and processing (older than 1 hour) and keep at most 50 completed
    const now = Date.now();
    const cleaned = (db.conversions || []).filter((c: any) => {
      // Keep if processing and less than 1 hour old (just in case)
      if (c.status === "processing" && now - new Date(c.createdAt).getTime() < 3600000) {
        return true;
      }
      // Keep if completed (we'll limit total counts next)
      if (c.status === "completed") {
        return true;
      }
      // Filter out others (failed, etc.)
      return false;
    });

    // Limit to last 50 completed
    const completedOnes = cleaned.filter((c: any) => c.status === "completed")
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 50);
      
    const processingOnes = cleaned.filter((c: any) => c.status === "processing");
    
    db.conversions = [...processingOnes, ...completedOnes];
    writeDb(db);
    
    const deletedCount = initialCount - db.conversions.length;
    logSystemActivity("Temizlik", `Veritabanı optimize edildi. ${deletedCount} eski dönüştürme kaydı temizlendi.`);
    
    res.json({ message: `Dönüştürme geçmişi optimize edildi. ${deletedCount} eski kayıt başarıyla silindi.`, conversions: db.conversions });
  } catch (error) {
    res.status(500).json({ error: "Temizleme işlemi gerçekleştirilemedi." });
  }
});

// 8.2.4 Admin: Get Database System Info
app.get("/api/admin/system/db-info", authenticateToken, requireAdmin, (req, res) => {
  try {
    const dbSize = fs.existsSync(DB_FILE) ? fs.statSync(DB_FILE).size : 0;
    const sessionCount = sessionStore.size;
    res.json({
      dbSize,
      sessionCount,
      dbPath: DB_FILE
    });
  } catch (error) {
    res.status(500).json({ error: "Sistem bilgileri alınamadı." });
  }
});

// 8.2.5 Admin: Download Raw Database JSON Backup
app.get("/api/admin/system/download-db", authenticateToken, requireAdmin, (req, res) => {
  try {
    res.download(DB_FILE, "database_backup.json");
    logSystemActivity("Yedekleme", "Veritabanı yedeği indirildi.");
  } catch (error) {
    res.status(500).json({ error: "Dosya indirilemedi." });
  }
});

// 8.3 Admin: Toggle User Ban Status (Admin Only)
app.post("/api/admin/toggle-ban", authenticateToken, requireAdmin, (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: "Kullanıcı ID gereklidir." });
    }

    const db = readDb();
    const userIndex = db.users.findIndex((u: any) => u.id === userId);

    if (userIndex === -1) {
      return res.status(404).json({ error: "Kullanıcı bulunamadı." });
    }

    const targetUser = db.users[userIndex];
    if (targetUser.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
      return res.status(400).json({ error: "Sistem kurucusunu engelleyemezsiniz!" });
    }

    const newBanState = !targetUser.isBanned;
    db.users[userIndex].isBanned = newBanState;
    
    if (!db.bannedIps) db.bannedIps = [];

    // If we banned them, remove active sessions and ban all their known IPs
    if (newBanState) {
      if (targetUser.lastIp && !db.bannedIps.includes(targetUser.lastIp)) {
        db.bannedIps.push(targetUser.lastIp);
      }
      if (targetUser.ips && Array.isArray(targetUser.ips)) {
        targetUser.ips.forEach((ip: string) => {
          if (!db.bannedIps.includes(ip)) {
            db.bannedIps.push(ip);
          }
        });
      }

      for (const [token, sessionUser] of sessionStore.entries()) {
        if (sessionUser.id === userId) {
          sessionStore.delete(token);
        }
      }
    } else {
      // Remove this user's IPs from banned IPs
      const userIps = targetUser.ips || [];
      const userLastIp = targetUser.lastIp;
      db.bannedIps = db.bannedIps.filter((ip: string) => {
        if (ip === userLastIp) return false;
        if (userIps.includes(ip)) return false;
        return true;
      });
    }

    writeDb(db);

    res.json({
      message: `Kullanıcı engelleme durumu başarıyla '${newBanState ? "Engellendi" : "Serbest Bırakıldı"}' olarak güncellendi.`,
      userId,
      isBanned: newBanState
    });
  } catch (error: any) {
    res.status(500).json({ error: "Engelleme durumu güncellenirken bir hata oluştu." });
  }
});

// 8.4 Admin: List Banned IPs (Admin Only)
app.get("/api/admin/ip-bans", authenticateToken, requireAdmin, (req, res) => {
  try {
    const db = readDb();
    const bannedIps = db.bannedIps || [];
    
    // Collect known IPs and associate them with user emails for guidance in UI
    const ipMapping: any = {};
    db.users.forEach((u: any) => {
      if (u.lastIp) {
        ipMapping[u.lastIp] = u.email;
      }
      if (u.ips && Array.isArray(u.ips)) {
        u.ips.forEach((ip: string) => {
          ipMapping[ip] = u.email;
        });
      }
    });

    res.json({ bannedIps, ipMapping });
  } catch (error) {
    res.status(500).json({ error: "IP yasaklama listesi yüklenemedi." });
  }
});

// 8.5 Admin: Ban IP (Admin Only)
app.post("/api/admin/ip-bans", authenticateToken, requireAdmin, (req, res) => {
  try {
    const { ip } = req.body;
    if (!ip || typeof ip !== "string" || !ip.trim()) {
      return res.status(400).json({ error: "Lütfen geçerli bir IP adresi belirtin." });
    }

    const trimmedIp = ip.trim();
    const db = readDb();
    if (!db.bannedIps) {
      db.bannedIps = [];
    }

    if (db.bannedIps.includes(trimmedIp)) {
      return res.status(400).json({ error: "Bu IP adresi zaten yasaklı listesinde." });
    }

    db.bannedIps.push(trimmedIp);
    writeDb(db);

    res.json({ message: `${trimmedIp} IP adresi başarıyla yasaklandı.`, bannedIps: db.bannedIps });
  } catch (error) {
    res.status(500).json({ error: "IP yasaklanırken bir hata oluştu." });
  }
});

// 8.6 Admin: Unban IP (Admin Only)
app.delete("/api/admin/ip-bans/:ip", authenticateToken, requireAdmin, (req, res) => {
  try {
    const { ip } = req.params;
    if (!ip) {
      return res.status(400).json({ error: "IP adresi belirtilmelidir." });
    }

    const db = readDb();
    if (!db.bannedIps) {
      db.bannedIps = [];
    }

    const initialLength = db.bannedIps.length;
    db.bannedIps = db.bannedIps.filter((item: string) => item !== ip);

    if (db.bannedIps.length === initialLength) {
      return res.status(404).json({ error: "Yasaklı listede bu IP adresi bulunamadı." });
    }

    writeDb(db);
    res.json({ message: `${ip} IP adresinin yasağı kaldırıldı.`, bannedIps: db.bannedIps });
  } catch (error) {
    res.status(500).json({ error: "IP yasağı kaldırılırken bir hata oluştu." });
  }
});

// 9.0 Bank Details Configuration: Get Details (Public)
app.get("/api/advertisements/bank-details", (req, res) => {
  try {
    const db = readDb();
    res.json(db.config?.bankDetails || {
      bankName: "Garanti BBVA",
      iban: "TR93 0006 2000 0001 2345 6789 01",
      accountHolder: "Tümay Işıldak"
    });
  } catch (error) {
    res.status(500).json({ error: "Banka bilgileri yüklenemedi." });
  }
});

// 9.0.1 Bank Details Configuration: Update Details (Admin Only)
app.post("/api/admin/advertisements/bank-details", authenticateToken, requireAdmin, (req, res) => {
  try {
    const { bankName, iban, accountHolder } = req.body;
    if (!bankName || !iban || !accountHolder) {
      return res.status(400).json({ error: "Lütfen banka adı, IBAN ve alıcı adı alanlarını doldurun." });
    }

    const db = readDb();
    if (!db.config) {
      db.config = {};
    }
    db.config.bankDetails = {
      bankName: bankName.trim(),
      iban: iban.trim(),
      accountHolder: accountHolder.trim()
    };

    writeDb(db);
    res.json({ message: "Banka hesap bilgileri başarıyla güncellendi.", bankDetails: db.config.bankDetails });
  } catch (error) {
    res.status(500).json({ error: "Banka hesap bilgileri güncellenemedi." });
  }
});

// 9.1 Advertisements: Submit Request (Public)
app.post("/api/advertisements/submit", (req, res) => {
  try {
    const { companyName, contactEmail, websiteUrl, bannerUrl, campaignType, durationDays, dailyBudget, templateStyle, notes, paymentMethod } = req.body;

    if (!companyName || !contactEmail || !websiteUrl || !campaignType) {
      return res.status(400).json({ error: "Lütfen gerekli alanları doldurun (Firma Adı, E-posta, Web Sitesi, Reklam Alanı)." });
    }

    const db = readDb();
    if (!db.advertisements) {
      db.advertisements = [];
    }

    const payMethod = paymentMethod === "card" ? "card" : "bank";
    const paymentStatus = payMethod === "card" ? "paid" : "pending";
    const paymentRef = "REF-" + Math.floor(100000 + Math.random() * 900000);
    const amountPaid = (Number(durationDays) || 7) * (Number(dailyBudget) || 20);

    const newAd = {
      id: crypto.randomUUID(),
      companyName: companyName.trim(),
      contactEmail: contactEmail.trim(),
      websiteUrl: websiteUrl.trim(),
      bannerUrl: bannerUrl ? bannerUrl.trim() : "",
      campaignType: campaignType || "sidebar", // header, sidebar, footer
      durationDays: Number(durationDays) || 7,
      dailyBudget: Number(dailyBudget) || 20,
      templateStyle: templateStyle || "clean", // neon, spotify, retro, clean, custom
      notes: notes ? notes.trim() : "",
      status: "pending", // pending, approved, rejected
      paymentMethod: payMethod,
      paymentStatus: paymentStatus,
      paymentRef: paymentRef,
      amountPaid: amountPaid,
      clicks: 0,
      views: 0,
      createdAt: new Date().toISOString()
    };

    db.advertisements.push(newAd);
    writeDb(db);
    logSystemActivity("Reklam Başvurusu", `${newAd.companyName} (${newAd.contactEmail}) reklam başvurusu yaptı.`);

    res.status(201).json({ 
      message: "Reklam başvurunuz başarıyla alındı! İnceleme sonrasında sizinle iletişime geçeceğiz.", 
      ad: newAd 
    });
  } catch (error) {
    res.status(500).json({ error: "Reklam başvurusu kaydedilirken bir hata oluştu." });
  }
});

// 9.2 Advertisements: List Approved (Public)
app.get("/api/advertisements", (req, res) => {
  try {
    const db = readDb();
    const approved = (db.advertisements || []).filter((ad: any) => ad.status === "approved" && ad.paymentStatus === "paid");
    res.json(approved);
  } catch (error) {
    res.status(500).json({ error: "Reklamlar yüklenemedi." });
  }
});

// 9.2.1 Advertisements: Increment Click Count (Public)
app.post("/api/advertisements/:id/click", (req, res) => {
  try {
    const { id } = req.params;
    const db = readDb();
    if (!db.advertisements) db.advertisements = [];
    
    const adIndex = db.advertisements.findIndex((ad: any) => ad.id === id);
    if (adIndex !== -1) {
      db.advertisements[adIndex].clicks = (db.advertisements[adIndex].clicks || 0) + 1;
      writeDb(db);
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Tıklama kaydedilemedi." });
  }
});

// 9.2.2 Advertisements: Increment View Count (Public)
app.post("/api/advertisements/:id/view", (req, res) => {
  try {
    const { id } = req.params;
    const db = readDb();
    if (!db.advertisements) db.advertisements = [];
    
    const adIndex = db.advertisements.findIndex((ad: any) => ad.id === id);
    if (adIndex !== -1) {
      db.advertisements[adIndex].views = (db.advertisements[adIndex].views || 0) + 1;
      writeDb(db);
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Gösterim kaydedilemedi." });
  }
});

// 9.3 Advertisements: Admin List All (Admin Only)
app.get("/api/admin/advertisements", authenticateToken, requireAdmin, (req, res) => {
  try {
    const db = readDb();
    res.json(db.advertisements || []);
  } catch (error) {
    res.status(500).json({ error: "Reklam listesi yüklenemedi." });
  }
});

// 9.4 Advertisements: Admin Moderation (Admin Only)
app.post("/api/admin/advertisements/moderate", authenticateToken, requireAdmin, (req, res) => {
  try {
    const { adId, status, templateStyle, bannerUrl, companyName, websiteUrl, paymentStatus } = req.body;

    if (!adId) {
      return res.status(400).json({ error: "Reklam ID belirtilmelidir." });
    }

    const db = readDb();
    if (!db.advertisements) {
      db.advertisements = [];
    }

    const adIndex = db.advertisements.findIndex((ad: any) => ad.id === adId);
    if (adIndex === -1) {
      return res.status(404).json({ error: "Reklam kaydı bulunamadı." });
    }

    // Update fields
    if (status) db.advertisements[adIndex].status = status; // approved, rejected, pending
    if (paymentStatus) db.advertisements[adIndex].paymentStatus = paymentStatus; // pending, paid
    if (templateStyle) db.advertisements[adIndex].templateStyle = templateStyle;
    if (bannerUrl !== undefined) db.advertisements[adIndex].bannerUrl = bannerUrl;
    if (companyName) db.advertisements[adIndex].companyName = companyName;
    if (websiteUrl) db.advertisements[adIndex].websiteUrl = websiteUrl;

    // Auto payment confirmation if ad is approved
    if (status === "approved" && !db.advertisements[adIndex].paymentStatus) {
      db.advertisements[adIndex].paymentStatus = "paid";
    }

    writeDb(db);

    res.json({ message: "Reklam başarıyla güncellendi.", ad: db.advertisements[adIndex] });
  } catch (error) {
    res.status(500).json({ error: "Reklam güncellenirken bir hata oluştu." });
  }
});

// 9.5 Advertisements: Delete Request (Admin Only)
app.delete("/api/admin/advertisements/:id", authenticateToken, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: "Reklam ID belirtilmelidir." });
    }

    const db = readDb();
    if (!db.advertisements) {
      db.advertisements = [];
    }

    const adIndex = db.advertisements.findIndex((ad: any) => ad.id === id);
    if (adIndex === -1) {
      return res.status(404).json({ error: "Reklam kaydı bulunamadı." });
    }

    db.advertisements.splice(adIndex, 1);
    writeDb(db);

    res.json({ message: "Reklam başarıyla silindi." });
  } catch (error) {
    res.status(500).json({ error: "Reklam silinirken bir hata oluştu." });
  }
});

// MOCK YOUTUBE METADATA DICTIONARY
const YOUTUBE_MOCK_VIDEOS = [
  { keywords: ["tarkan", "yolla"], title: "Tarkan - Yolla (Official Video)", sizeMp3: "4.8 MB", sizeMp4: "42.5 MB" },
  { keywords: ["manco", "gülpembe", "gulpembe"], title: "Barış Manço - Gülpembe (HD)", sizeMp3: "5.1 MB", sizeMp4: "38.1 MB" },
  { keywords: ["tatlises", "aramam"], title: "İbrahim Tatlıses - Aramam (Klasik)", sizeMp3: "6.2 MB", sizeMp4: "51.0 MB" },
  { keywords: ["rick", "astley", "never gonna", "roll"], title: "Rick Astley - Never Gonna Give You Up (Official Video)", sizeMp3: "3.2 MB", sizeMp4: "28.4 MB" },
  { keywords: ["lofi", "beats", "relax", "study"], title: "Lofi Hip Hop Radio 🌌 Beats to Relax/Study to", sizeMp3: "12.5 MB", sizeMp4: "110.2 MB" },
  { keywords: ["coding", "synthwave", "cyberpunk"], title: "Cyberpunk Coding Synthwave Mix for Programmers", sizeMp3: "15.1 MB", sizeMp4: "135.4 MB" },
  { keywords: ["yapay", "zeka", "belgesel"], title: "Yapay Zeka ve Geleceğimiz Belgeseli", sizeMp3: "18.3 MB", sizeMp4: "165.2 MB" }
];

// Helper to parse YouTube Video Title or generate a beautiful realistic one
function getYoutubeMockMetadata(videoUrl: string) {
  const urlLower = videoUrl.toLowerCase();
  
  // Try to find a match in the dict
  for (const item of YOUTUBE_MOCK_VIDEOS) {
    if (item.keywords.some(kw => urlLower.includes(kw))) {
      return { title: item.title, sizeMp3: item.sizeMp3, sizeMp4: item.sizeMp4 };
    }
  }

  // Fallback beautiful titles based on videoId or general tags
  let videoId = "video";
  try {
    if (videoUrl.includes("v=")) {
      videoId = videoUrl.split("v=")[1]?.split("&")[0] || "video";
    } else if (videoUrl.includes("youtu.be/")) {
      videoId = videoUrl.split("youtu.be/")[1]?.split("?")[0] || "video";
    } else if (videoUrl.includes("shorts/")) {
      videoId = videoUrl.split("shorts/")[1]?.split("?")[0] || "video";
    }
  } catch (e) {}

  // Generate a premium random-like title based on url elements
  const fallbackTitles = [
    "Muazzez Ersoy - Nostalji Özel Playlist",
    "Manga - Bir Kadın Çizeceksin",
    "Motive - Ömrüm (Acoustic Version)",
    "Coding Music - 3 Hour Deep Focus Playlist",
    "Türkçe Akustik Slow Şarkılar Karma 2026",
    "Gözlerini Kapat ve Dinle - Dinlendirici Yağmur Sesleri",
    "Ezel Dizi Müzikleri - Unutulmaz Tema"
  ];
  
  // Use simple hash of videoId to choose a title consistently
  let hash = 0;
  for (let i = 0; i < videoId.length; i++) {
    hash = videoId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % fallbackTitles.length;
  
  const selectedTitle = fallbackTitles[index];
  const sizeMp3 = `${(3.5 + (Math.abs(hash) % 70) / 10).toFixed(1)} MB`;
  const sizeMp4 = `${(25.0 + (Math.abs(hash) % 150)).toFixed(1)} MB`;

  return { title: selectedTitle, sizeMp3, sizeMp4 };
}

// 9. Converter: Post Convert Request
app.post("/api/convert", (req, res) => {
  try {
    const clientIp = getClientIp(req);
    const db = readDb();
    if (db.bannedIps && db.bannedIps.includes(clientIp)) {
      return res.status(403).json({ 
        error: "Engellendin kanka, çıldırtma beni! 🚫", 
        isBanned: true,
        email: db.users.find((u: any) => u.lastIp === clientIp || (u.ips && u.ips.includes(clientIp)))?.email || ""
      });
    }

    if (db.config?.maintenanceMode) {
      return res.status(503).json({ error: "Sistem şu anda bakım modundadır. Dönüştürme işlemleri geçici olarak devre dışı bırakılmıştır." });
    }

    const { videoUrl, format, quality } = req.body;
    
    if (!videoUrl) {
      return res.status(400).json({ error: "Lütfen geçerli bir YouTube video linki girin." });
    }

    // Validate YouTube URL structure roughly
    const isYoutube = videoUrl.includes("youtube.com") || videoUrl.includes("youtu.be");
    if (!isYoutube) {
      return res.status(400).json({ error: "Lütfen geçerli bir YouTube URL'si girdiğinizden emin olun." });
    }

    const formatLower = (format || "mp3").toLowerCase();
    const qualityStr = quality || (formatLower === "mp3" ? "320kbps" : "1080p");

    // Get optional logged-in user from headers if present
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    const loggedInUser = token ? sessionStore.get(token) : null;
    const dbUser = loggedInUser ? db.users.find((u: any) => u.id === loggedInUser.id) : null;

    // Check if the requested quality requires Premium membership
    const isPremiumQuality = 
      (formatLower === "mp3" && qualityStr === "320kbps") ||
      (formatLower === "mp4" && (qualityStr.includes("2k") || qualityStr.includes("1440p") || qualityStr.includes("4k") || qualityStr.includes("2160p")));

    const hasPremium = dbUser ? (dbUser.isPremium === true || dbUser.role === "admin") : false;

    if (isPremiumQuality && !hasPremium) {
      return res.status(403).json({ 
        error: "premium_required", 
        message: `${qualityStr} kalitesinde dönüştürme yapmak yalnızca Premium üyelerimize özeldir. Lütfen üyeliğinizi yükseltin.` 
      });
    }

    const meta = getYoutubeMockMetadata(videoUrl);
    const fileSize = formatLower === "mp3" ? meta.sizeMp3 : meta.sizeMp4;
    
    const newConversion = {
      id: crypto.randomUUID(),
      userId: loggedInUser?.id || "guest",
      videoUrl,
      videoTitle: meta.title,
      format: formatLower,
      quality: qualityStr,
      status: "processing",
      progress: 0,
      fileSize,
      downloadUrl: "", // Filled on completion
      createdAt: new Date().toISOString()
    };

    db.conversions.push(newConversion);
    writeDb(db);

    res.status(201).json(newConversion);
  } catch (error: any) {
    res.status(500).json({ error: "Dönüştürme başlatılamadı." });
  }
});

// 10. Converter: Get Active Conversion Status
app.get("/api/convert/status/:id", (req, res) => {
  const db = readDb();
  const conversion = db.conversions.find((c: any) => c.id === req.params.id);
  if (!conversion) {
    return res.status(404).json({ error: "Kayıt bulunamadı." });
  }
  res.json(conversion);
});

// 11. Converter: Get History (Public for global or limited by user)
app.get("/api/convert/history", (req, res) => {
  const db = readDb();
  // Get token if sent to filter by user, else return last 15 public completions
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  const loggedInUser = token ? sessionStore.get(token) : null;

  let list = db.conversions;
  if (loggedInUser) {
    if (loggedInUser.role === "admin") {
      list = db.conversions; // Admin can see all conversions in the history queue
    } else {
      list = db.conversions.filter((c: any) => c.userId === loggedInUser.id || c.userId === "guest");
    }
  } else {
    list = db.conversions.filter((c: any) => c.userId === "guest");
  }

  // Sort by newest first, limit to 20
  const history = [...list]
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 20);

  res.json(history);
});

// 12. Premium: Get Configuration
app.get("/api/premium/config", (req, res) => {
  const db = readDb();
  res.json(db.config || { premiumMonthlyPrice: 49, premiumYearlyPrice: 470 });
});

// 13. Premium: Update Configuration (Admin Only)
app.post("/api/premium/config", authenticateToken, requireAdmin, (req, res) => {
  try {
    const { premiumMonthlyPrice } = req.body;
    if (!premiumMonthlyPrice || isNaN(Number(premiumMonthlyPrice))) {
      return res.status(400).json({ error: "Geçerli bir aylık fiyat girmelisiniz." });
    }

    const db = readDb();
    const monthlyPrice = Math.max(1, Math.round(Number(premiumMonthlyPrice)));
    
    // Automatically calculate yearly price with ~20% discount
    // monthlyPrice * 12 * 0.8 (yearly price discounted)
    const yearlyPrice = Math.round(monthlyPrice * 12 * 0.8);

    db.config = {
      ...(db.config || {}),
      premiumMonthlyPrice: monthlyPrice,
      premiumYearlyPrice: yearlyPrice
    };

    writeDb(db);
    res.json({
      message: "Premium fiyatlandırma paketi başarıyla güncellendi.",
      config: db.config
    });
  } catch (error) {
    res.status(500).json({ error: "Fiyatlandırma güncellenirken bir hata oluştu." });
  }
});

// 13.1 Premium: Update Maintenance Mode (Admin Only)
app.post("/api/admin/maintenance", authenticateToken, requireAdmin, (req: any, res: any) => {
  try {
    const { maintenanceMode } = req.body;
    const isMaintenance = !!maintenanceMode;

    const db = readDb();
    if (!db.config) {
      db.config = { premiumMonthlyPrice: 49, premiumYearlyPrice: 470 };
    }
    db.config.maintenanceMode = isMaintenance;

    // Handle automated announcement
    if (isMaintenance) {
      // Create or update the pinned announcement
      const annIndex = db.announcements.findIndex((a: any) => a.id === "maintenance-auto-announcement");
      const maintenanceAnn = {
        id: "maintenance-auto-announcement",
        title: "⚙️ PLANLI SİSTEM BAKIMI ÇALIŞMASI BAŞLADI",
        content: "Sistemimiz daha hızlı, güvenli ve stabil çalışabilmesi adına şu anda planlı bakım çalışmasındadır. Bu süreçte dönüştürme (YouTube to MP3/MP4) hizmetimiz geçici olarak kapatılmıştır. Bakım bittiğinde bu duyuru otomatik olarak kaldırılacak ve servisimiz kesintisiz devam edecektir. Gösterdiğiniz sabır için teşekkür ederiz.",
        category: "Bakım",
        isPinned: true,
        readCount: 0,
        acknowledgedBy: [],
        createdAt: new Date().toISOString(),
        authorName: req.user.name || "Sistem Yöneticisi"
      };

      if (annIndex > -1) {
        db.announcements[annIndex] = {
          ...db.announcements[annIndex],
          ...maintenanceAnn,
          createdAt: new Date().toISOString() // Refresh date
        };
      } else {
        db.announcements.push(maintenanceAnn);
      }
    } else {
      // Remove the automated maintenance announcement automatically
      db.announcements = db.announcements.filter((a: any) => a.id !== "maintenance-auto-announcement");
    }

    writeDb(db);
    res.json({
      message: isMaintenance ? "Bakım modu başarıyla aktif edildi ve bakım duyurusu yayınlandı." : "Bakım modu kapatıldı ve duyuru temizlendi.",
      maintenanceMode: isMaintenance
    });
  } catch (error) {
    res.status(500).json({ error: "Bakım modu güncellenirken bir hata oluştu." });
  }
});

// 14. Premium: Subscribe (Requires Auth)
app.post("/api/premium/subscribe", authenticateToken, (req: any, res: any) => {
  try {
    const { cardNumber, cardHolder, expiryDate, cvv, plan } = req.body;

    if (!cardNumber || !cardHolder || !expiryDate || !cvv || !plan) {
      return res.status(400).json({ error: "Lütfen tüm kart bilgilerini ve ödeme planını eksiksiz doldurun." });
    }

    // Realistic validation
    const cleanCard = cardNumber.replace(/\s+/g, "");
    if (cleanCard.length < 15 || cleanCard.length > 16) {
      return res.status(400).json({ error: "Geçersiz kart numarası girdiniz." });
    }

    if (cvv.trim().length < 3 || cvv.trim().length > 4) {
      return res.status(400).json({ error: "Geçersiz CVV numarası girdiniz." });
    }

    const db = readDb();
    const userIndex = db.users.findIndex((u: any) => u.id === req.user.id);
    if (userIndex === -1) {
      return res.status(404).json({ error: "Kullanıcı bulunamadı." });
    }

    // Upgrade user
    db.users[userIndex].isPremium = true;
    db.users[userIndex].premiumExpiry = plan === "yearly" 
      ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    writeDb(db);

    // Update in-memory session
    const { passwordHash: _, ...userWithoutPassword } = db.users[userIndex];
    sessionStore.set(req.headers["authorization"]?.split(" ")[1] || "", userWithoutPassword);

    res.json({
      message: `Tebrikler! Premium üyeliğiniz başarıyla aktif edildi. Plan: ${plan === "yearly" ? "Yıllık" : "Aylık"}`,
      user: userWithoutPassword
    });
  } catch (error) {
    res.status(500).json({ error: "Ödeme işlemi gerçekleştirilirken bir hata oluştu." });
  }
});

// --- LIVE SUPPORT ENDPOINTS ---

function isSupportWorkingHours() {
  const db = readDb();
  if (db.config.supportEnabled === false) {
    return {
      isOpen: false,
      reason: "closed_by_admin"
    };
  }
  
  const startStr = db.config.supportStartHour || "09:00";
  const endStr = db.config.supportEndHour || "18:00";
  
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Europe/Istanbul",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    });
    const parts = formatter.formatToParts(new Date());
    const hourPart = parts.find(p => p.type === "hour");
    const minutePart = parts.find(p => p.type === "minute");
    
    const currentHour = hourPart ? parseInt(hourPart.value, 10) : new Date().getHours();
    const currentMinute = minutePart ? parseInt(minutePart.value, 10) : new Date().getMinutes();
    
    const [startH, startM] = startStr.split(":").map(Number);
    const [endH, endM] = endStr.split(":").map(Number);
    
    const currentVal = currentHour * 60 + currentMinute;
    const startVal = startH * 60 + startM;
    const endVal = endH * 60 + endM;
    
    if (currentVal >= startVal && currentVal < endVal) {
      return { isOpen: true };
    } else {
      return { 
        isOpen: false, 
        reason: "outside_hours",
        startStr,
        endStr
      };
    }
  } catch (e) {
    const trDate = new Date();
    const currentHour = trDate.getHours();
    const currentMinute = trDate.getMinutes();
    
    const [startH, startM] = startStr.split(":").map(Number);
    const [endH, endM] = endStr.split(":").map(Number);
    
    const currentVal = currentHour * 60 + currentMinute;
    const startVal = startH * 60 + startM;
    const endVal = endH * 60 + endM;
    
    if (currentVal >= startVal && currentVal < endVal) {
      return { isOpen: true };
    } else {
      return { 
        isOpen: false, 
        reason: "outside_hours",
        startStr,
        endStr
      };
    }
  }
}

// 0. Get Support Hours and Status (Public)
app.get("/api/support/status", (req, res) => {
  try {
    const db = readDb();
    const status = isSupportWorkingHours();
    res.json({
      isOpen: status.isOpen,
      reason: (status as any).reason || null,
      supportStartHour: db.config.supportStartHour || "09:00",
      supportEndHour: db.config.supportEndHour || "18:00",
      supportEnabled: db.config.supportEnabled !== false
    });
  } catch (error) {
    res.status(500).json({ error: "Destek durumu alınamadı kanka." });
  }
});

// 0b. Update Support Config (Admin Only)
app.post("/api/admin/support/config", authenticateToken, requireAdmin, (req, res) => {
  try {
    const { supportStartHour, supportEndHour, supportEnabled } = req.body;
    
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (supportStartHour && !timeRegex.test(supportStartHour)) {
      return res.status(400).json({ error: "Başlangıç saati geçersiz formatta (SS:DD olmalı)." });
    }
    if (supportEndHour && !timeRegex.test(supportEndHour)) {
      return res.status(400).json({ error: "Bitiş saati geçersiz formatta (SS:DD olmalı)." });
    }
    
    const db = readDb();
    if (supportStartHour !== undefined) db.config.supportStartHour = supportStartHour;
    if (supportEndHour !== undefined) db.config.supportEndHour = supportEndHour;
    if (supportEnabled !== undefined) db.config.supportEnabled = !!supportEnabled;
    
    writeDb(db);
    logSystemActivity(
      "Canlı Destek Ayarları Güncellendi",
      `Başlangıç: ${db.config.supportStartHour}, Bitiş: ${db.config.supportEndHour}, Durum: ${db.config.supportEnabled ? "Açık" : "Kapalı"}`
    );
    
    res.json({
      success: true,
      config: {
        supportStartHour: db.config.supportStartHour,
        supportEndHour: db.config.supportEndHour,
        supportEnabled: db.config.supportEnabled
      }
    });
  } catch (error) {
    res.status(500).json({ error: "Destek ayarları güncellenirken hata oluştu." });
  }
});

// 1. Get Support Sessions (Admin Only)
app.get("/api/support/sessions", authenticateToken, requireAdmin, (req, res) => {
  try {
    const db = readDb();
    const supportMessages = db.supportMessages || [];
    const supportSessions = db.supportSessions || [];
    
    // Group messages by sessionId to get active sessions
    const sessionsMap = new Map<string, any>();
    
    supportMessages.forEach((msg: any) => {
      const existing = sessionsMap.get(msg.sessionId);
      
      // Count unread support messages for admin in this session
      let isMsgUnreadForAdmin = (msg.sender === "user" && !msg.isRead);
      let currentUnread = isMsgUnreadForAdmin ? 1 : 0;
      
      if (!existing || new Date(msg.createdAt) > new Date(existing.lastMessageAt)) {
        const sessInfo = supportSessions.find((s: any) => s.id === msg.sessionId);
        sessionsMap.set(msg.sessionId, {
          sessionId: msg.sessionId,
          userName: sessInfo ? sessInfo.userName : (msg.sender === "user" ? msg.userName : "Misafir Üye"),
          userEmail: sessInfo ? sessInfo.userEmail : (msg.sender === "user" ? msg.userEmail : "Bilinmiyor"),
          subject: sessInfo ? sessInfo.subject : "Destek Talebi",
          status: sessInfo ? sessInfo.status : "open",
          lastMessage: msg.text,
          lastMessageAt: msg.createdAt,
          lastSender: msg.sender,
          unreadCount: (existing ? existing.unreadCount : 0) + currentUnread,
          isActive: msg.isActive !== false
        });
      } else {
        if (currentUnread > 0) {
          existing.unreadCount = (existing.unreadCount || 0) + currentUnread;
        }
      }
    });
    
    const sessions = Array.from(sessionsMap.values()).sort(
      (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    );
    
    res.json({ sessions });
  } catch (error) {
    res.status(500).json({ error: "Destek oturumları yüklenirken bir hata oluştu." });
  }
});

// 2. Check if Current User has an Active Support Ticket
app.get("/api/support/active-session", authenticateToken, (req: any, res: any) => {
  try {
    const db = readDb();
    const supportSessions = db.supportSessions || [];
    const activeSession = supportSessions.find(
      (s: any) => s.userId === req.user.id && s.status === "open"
    );
    res.json({ session: activeSession || null });
  } catch (error) {
    res.status(500).json({ error: "Aktif destek oturumu sorgulanırken hata oluştu." });
  }
});

// 3. Create Support Ticket (Yeni Destek Talebi Açma)
app.post("/api/support/sessions/create", authenticateToken, (req: any, res: any) => {
  try {
    const status = isSupportWorkingHours();
    if (!status.isOpen) {
      const db = readDb();
      const reasonMsg = status.reason === "closed_by_admin" 
        ? "Canlı destek şu anda yöneticilerimiz tarafından geçici olarak kapatılmıştır kanka."
        : `Canlı destek şu anda kapalıdır kanka. Çalışma saatlerimiz: ${db.config.supportStartHour || "09:00"} - ${db.config.supportEndHour || "18:00"}.`;
      return res.status(400).json({ error: reasonMsg });
    }

    const { subject, initialMessage } = req.body;
    if (!subject || !subject.trim() || !initialMessage || !initialMessage.trim()) {
      return res.status(400).json({ error: "Konu ve başlangıç mesajı gereklidir." });
    }

    const db = readDb();
    if (!db.supportSessions) db.supportSessions = [];
    if (!db.supportMessages) db.supportMessages = [];

    // Check if there is already an active session to prevent duplicates
    const existing = db.supportSessions.find((s: any) => s.userId === req.user.id && s.status === "open");
    if (existing) {
      return res.json({ session: existing });
    }

    const sessionId = "sess_" + crypto.randomUUID().substring(0, 8);
    const newSession = {
      id: sessionId,
      userId: req.user.id,
      userName: req.user.name,
      userEmail: req.user.email,
      subject: subject.trim(),
      status: "open",
      createdAt: new Date().toISOString()
    };

    db.supportSessions.push(newSession);

    const censoredText = censorProfanity(initialMessage.trim());
    const newMessage = {
      id: crypto.randomUUID(),
      sessionId,
      userName: req.user.name,
      userEmail: req.user.email,
      sender: "user",
      text: censoredText,
      createdAt: new Date().toISOString(),
      isRead: false,
      isActive: true
    };

    db.supportMessages.push(newMessage);
    writeDb(db);

    res.status(201).json({ session: newSession, message: newMessage });
  } catch (error) {
    res.status(500).json({ error: "Destek talebi oluşturulurken hata oluştu." });
  }
});

// 4. Get Messages for a Session (Authenticated only)
app.get("/api/support/messages", authenticateToken, (req: any, res: any) => {
  try {
    const { sessionId } = req.query;
    if (!sessionId) {
      return res.status(400).json({ error: "sessionId parametresi gereklidir." });
    }
    
    const db = readDb();
    // Non-admin can only access their own session
    if (req.user.role !== "admin") {
      const supportSessions = db.supportSessions || [];
      const session = supportSessions.find((s: any) => s.id === sessionId);
      if (!session || session.userId !== req.user.id) {
        return res.status(403).json({ error: "Bu destek seansına erişim yetkiniz yok kanka." });
      }
    }
    
    const supportMessages = db.supportMessages || [];
    const messages = supportMessages.filter((msg: any) => msg.sessionId === sessionId);
    
    res.json({ messages });
  } catch (error) {
    res.status(500).json({ error: "Destek mesajları yüklenirken bir hata oluştu." });
  }
});

// 5. Send Support Message (Authenticated only)
app.post("/api/support/send", authenticateToken, (req: any, res: any) => {
  try {
    const { sessionId, text, sender } = req.body;
    
    if (!sessionId || !text) {
      return res.status(400).json({ error: "Eksik parametre." });
    }
    
    const db = readDb();
    if (!db.supportMessages) {
      db.supportMessages = [];
    }
    
    let messageSender = sender || "user";
    let finalUserName = req.user.name;
    let finalUserEmail = req.user.email;
    
    if (messageSender === "support") {
      if (req.user.role !== "admin") {
        return res.status(403).json({ error: "Yetkisiz erişim. Yönetici olmanız gerekir." });
      }
      finalUserName = `Yönetici (${req.user.name})`;
    } else {
      const status = isSupportWorkingHours();
      if (!status.isOpen) {
        const reasonMsg = status.reason === "closed_by_admin" 
          ? "Canlı destek şu anda yöneticilerimiz tarafından geçici olarak kapatılmıştır kanka."
          : `Canlı destek şu anda kapalıdır kanka. Çalışma saatlerimiz: ${db.config.supportStartHour || "09:00"} - ${db.config.supportEndHour || "18:00"}.`;
        return res.status(400).json({ error: reasonMsg });
      }

      // Check if user actually owns this session
      const supportSessions = db.supportSessions || [];
      const session = supportSessions.find((s: any) => s.id === sessionId);
      if (!session || session.userId !== req.user.id) {
        return res.status(403).json({ error: "Bu destek seansına mesaj gönderme yetkiniz yok." });
      }
    }
    
    const censoredText = censorProfanity(text.trim());
    
    const newMessage = {
      id: crypto.randomUUID(),
      sessionId,
      userName: finalUserName,
      userEmail: finalUserEmail,
      sender: messageSender,
      text: censoredText,
      createdAt: new Date().toISOString(),
      isRead: false,
      isActive: true
    };
    
    db.supportMessages.push(newMessage);
    writeDb(db);
    
    res.json({ message: newMessage });
  } catch (error) {
    res.status(500).json({ error: "Destek mesajı gönderilirken bir hata oluştu." });
  }
});

// 6. Mark Session Messages as Read (Admin Only)
app.post("/api/support/read", authenticateToken, requireAdmin, (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({ error: "sessionId gereklidir." });
    }
    
    const db = readDb();
    let updated = false;
    if (db.supportMessages) {
      db.supportMessages.forEach((msg: any) => {
        if (msg.sessionId === sessionId && msg.sender === "user" && !msg.isRead) {
          msg.isRead = true;
          updated = true;
        }
      });
    }
    
    if (updated) {
      writeDb(db);
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Okundu işaretlenirken hata oluştu." });
  }
});

// 7. Clear / Close Support Session (Admin Only)
app.post("/api/support/close", authenticateToken, requireAdmin, (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({ error: "sessionId gereklidir." });
    }
    
    const db = readDb();
    if (db.supportSessions) {
      db.supportSessions = db.supportSessions.filter((s: any) => s.id !== sessionId);
    }
    if (db.supportMessages) {
      db.supportMessages = db.supportMessages.filter((msg: any) => msg.sessionId !== sessionId);
    }
    writeDb(db);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Destek oturumu sonlandırılırken hata oluştu." });
  }
});

// 7b. End Support Session (status = "closed") (Admin Only)
app.post("/api/support/end", authenticateToken, requireAdmin, (req: any, res: any) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({ error: "sessionId gereklidir." });
    }
    
    const db = readDb();
    if (db.supportSessions) {
      const session = db.supportSessions.find((s: any) => s.id === sessionId);
      if (session) {
        session.status = "closed";
      }
    }
    writeDb(db);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Destek oturumu sonlandırılırken hata oluştu." });
  }
});

// --- CENSORED WORDS MANAGEMENT ENDPOINTS (Admin Only) ---

// 8. Get Censored Words
app.get("/api/admin/censored-words", authenticateToken, requireAdmin, (req, res) => {
  try {
    const db = readDb();
    let words = db.censoredWords;
    if (!words || !Array.isArray(words)) {
      words = [
        "orospu çocuğu", "orospu cocugu", "amına koyayım", "amınakoyayım",
        "pezevenk", "orospu", "siktir", "sikeyim", "sikerim", "götveren", "gotveren",
        "amcık", "amcik", "yarrak", "yarak", "taşşak", "tassak", "kaltak", "gavat",
        "ibne", "kahpe", "amk", "aq", "piç", "pic", "göt", "got", "sik"
      ];
    }
    res.json({ words });
  } catch (e) {
    res.status(500).json({ error: "Yasaklı kelimeler alınamadı." });
  }
});

// 9. Save Censored Words
app.post("/api/admin/censored-words", authenticateToken, requireAdmin, (req, res) => {
  try {
    const { words } = req.body;
    if (!words || !Array.isArray(words)) {
      return res.status(400).json({ error: "Geçersiz kelime listesi kanka." });
    }
    const db = readDb();
    db.censoredWords = words.map((w: string) => w.trim().toLowerCase()).filter(Boolean);
    writeDb(db);
    logSystemActivity("Sansürlü Kelime Listesi Güncellendi", `${db.censoredWords.length} adet yasaklı kelime kaydedildi.`);
    res.json({ success: true, words: db.censoredWords });
  } catch (e) {
    res.status(500).json({ error: "Yasaklı kelimeler güncellenemedi." });
  }
});

// Simulating Converter Background Progress Queue
// This acts as a background process that updates progress in database.json
setInterval(() => {
  try {
    const db = readDb();
    let updated = false;

    db.conversions.forEach((conv: any) => {
      if (conv.status === "processing") {
        updated = true;
        // Increment progress randomly
        const increment = Math.floor(Math.random() * 20) + 10; // 10-30% progress jump
        conv.progress = Math.min(100, conv.progress + increment);

        if (conv.progress >= 100) {
          conv.status = "completed";
          // Generate a premium dummy direct download URL
          // We can use royalty free sound tracks or beautiful dummy files
          if (conv.format === "mp3") {
            conv.downloadUrl = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";
          } else {
            conv.downloadUrl = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4";
          }

          // Increment the user's persistent download stats if they are logged in
          if (conv.userId && conv.userId !== "guest") {
            const userIndex = db.users.findIndex((u: any) => u.id === conv.userId);
            if (userIndex > -1) {
              db.users[userIndex].downloadsCount = (db.users[userIndex].downloadsCount || 0) + 1;
            }
          }
        }
      }
    });

    if (updated) {
      writeDb(db);
    }
  } catch (error) {
    // Fail-safe interval
  }
}, 800); // Check and tick progress every 800ms

// Announcement Read Count Bot Background Task -> Now only handles scheduled announcements auto-publishing
setInterval(() => {
  try {
    const db = readDb();
    let updated = false;
    const now = new Date();

    if (db.announcements && Array.isArray(db.announcements)) {
      db.announcements.forEach((ann: any) => {
        // Auto-publish scheduled announcements whose time has reached
        if (ann.status === "scheduled" && ann.scheduledAt && new Date(ann.scheduledAt) <= now) {
          ann.status = "published";
          updated = true;
          logSystemActivity("Sistem", `Zamanlanmış "${ann.title}" başlıklı duyuru otomatik olarak yayınlandı.`);
        }
      });
    }

    if (updated) {
      writeDb(db);
    }
  } catch (error) {
    // Fail-safe interval
  }
}, 5000); // Ticks every 5 seconds for responsive feedback


// 8.4 Ban Appeals: Submit Appeal (Public)
app.post("/api/ban-appeals", (req, res) => {
  try {
    const { name, email, message } = req.body;
    if (!email || !name || !message) {
      return res.status(400).json({ error: "Lütfen tüm alanları doldurun." });
    }

    const db = readDb();
    if (!db.banAppeals) {
      db.banAppeals = [];
    }

    // Check if there's already an active appeal for this email
    const existingAppeal = db.banAppeals.find((a: any) => a.email.toLowerCase() === email.trim().toLowerCase() && a.status === "pending");
    if (existingAppeal) {
      return res.status(400).json({ error: "Zaten açık bir itiraz talebiniz bulunuyor. Lütfen bekleyin." });
    }

    const newAppeal = {
      id: crypto.randomUUID(),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      message: message.trim(),
      status: "pending", // pending, approved, rejected
      createdAt: new Date().toISOString()
    };

    db.banAppeals.push(newAppeal);
    writeDb(db);

    res.status(201).json({ message: "İtiraz talebiniz başarıyla gönderildi, kanka!" });
  } catch (error) {
    res.status(500).json({ error: "Talebiniz iletilirken bir hata oluştu." });
  }
});

// 8.5 Admin: List Ban Appeals (Admin Only)
app.get("/api/admin/ban-appeals", authenticateToken, requireAdmin, (req, res) => {
  try {
    const db = readDb();
    res.json(db.banAppeals || []);
  } catch (error) {
    res.status(500).json({ error: "İtiraz talepleri yüklenemedi." });
  }
});

// 8.6 Admin: Resolve Ban Appeal (Admin Only)
app.post("/api/admin/ban-appeals/:id/resolve", authenticateToken, requireAdmin, (req, res) => {
  try {
    const { action } = req.body; // "approve" or "reject"
    if (!action) {
      return res.status(400).json({ error: "Aksiyon bilgisi gereklidir." });
    }

    const db = readDb();
    if (!db.banAppeals) db.banAppeals = [];

    const appealIndex = db.banAppeals.findIndex((a: any) => a.id === req.params.id);
    if (appealIndex === -1) {
      return res.status(404).json({ error: "İtiraz talebi bulunamadı." });
    }

    const appeal = db.banAppeals[appealIndex];

    if (action === "approve") {
      // Find user and unban
      const userIndex = db.users.findIndex((u: any) => u.email.toLowerCase() === appeal.email.toLowerCase());
      if (userIndex !== -1) {
        const u = db.users[userIndex];
        u.isBanned = false;
        appeal.status = "approved";

        // Also remove their IPs from banned list
        if (!db.bannedIps) db.bannedIps = [];
        const userIps = u.ips || [];
        const userLastIp = u.lastIp;
        db.bannedIps = db.bannedIps.filter((ip: string) => {
          if (ip === userLastIp) return false;
          if (userIps.includes(ip)) return false;
          return true;
        });
      } else {
        return res.status(404).json({ error: "İtiraz eden kullanıcı bulunamadı." });
      }
    } else {
      appeal.status = "rejected";
    }

    writeDb(db);
    res.json({ message: `İtiraz talebi başarıyla ${action === "approve" ? "onaylandı ve engel kaldırıldı" : "reddedildi"}.` });
  } catch (error) {
    res.status(500).json({ error: "İşlem gerçekleştirilemedi." });
  }
});


// --- VITE DEV SERVER / PRODUCTION SERVING SETUP ---

async function startServer() {
  try {
    // Read the local file database first as initialDb
    const localDb = readDb();
    console.log("Starting Firestore synchronization...");
    // Initialize and sync with Firestore
    dbInMemoryCache = await initFirestoreSync(localDb);
    // Write back the loaded Firestore data to local database.json so they match
    fs.writeFileSync(DB_FILE, JSON.stringify(dbInMemoryCache, null, 2), "utf-8");
    console.log("Successfully synchronized in-memory database with Firestore!");
  } catch (error) {
    console.error("Firestore initialization failed. Using local DB fallback:", error);
  }

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
