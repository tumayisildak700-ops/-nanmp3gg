export interface User {
  id: string;
  email: string;
  name: string;
  username?: string;
  role: 'admin' | 'user';
  isPremium?: boolean;
  premiumExpiry?: string;
  isBanned?: boolean;
  createdAt: string;
  avatar?: string;
  badge?: string;
  downloadsCount?: number;
  lastUsernameUpdateAt?: string;
}

export interface Advertisement {
  id: string;
  companyName: string;
  contactEmail: string;
  websiteUrl: string;
  bannerUrl: string;
  campaignType: 'header' | 'sidebar' | 'footer';
  durationDays: number;
  dailyBudget: number;
  templateStyle: 'retro' | 'neon' | 'spotify' | 'clean' | 'custom';
  notes?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  paymentMethod?: 'bank' | 'card';
  paymentStatus?: 'pending' | 'paid';
  paymentRef?: string;
  amountPaid?: number;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  authorName: string;
  category?: 'Güncelleme' | 'Bakım' | 'Kampanya' | 'Duyuru';
  isPinned?: boolean;
  readCount?: number;
  acknowledgedBy?: string[];
}

export interface ConversionRecord {
  id: string;
  userId?: string;
  videoUrl: string;
  videoTitle: string;
  format: 'mp3' | 'mp4';
  quality: string;
  status: 'processing' | 'completed' | 'failed';
  progress: number;
  downloadUrl?: string;
  fileSize?: string;
  createdAt: string;
}
