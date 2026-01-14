
export interface ViolationRecord {
  id: string;
  plateNumber: string;
  plateColor: string;
  vehicleType: string;
  time: string;
  location: string;
  behavior: string;
  status: 'Chưa xử phạt' | 'Đã xử phạt' | 'Đang xác minh';
  unit: string;
  resolutionPlace: string[];
}

export interface Vehicle {
  id: string;
  plateNumber: string;
  email: string;
  notificationsEnabled: boolean;
  lastCheck: string;
  status: 'clean' | 'violation' | 'checking';
  violations: ViolationRecord[];
}

export interface SMTPConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  secure: boolean;
  from: string;
  // EmailJS specific fields
  serviceId?: string;
  templateId?: string;
  publicKey?: string;
}

export interface TestConfig {
  testPlates: string[];
  targetEmail: string;
  enabled: boolean;
}

export interface CheckSchedule {
  frequency: 'daily' | 'weekly';
  time: string; // Giờ quét hệ thống tự động HH:mm
  notificationTimes: string[]; // Các khung giờ gửi email báo cáo trong ngày
  notificationStrategy: 'on_change' | 'always';
  enabled: boolean;
  smtp?: SMTPConfig;
  testConfig?: TestConfig;
}

export interface SystemLog {
  id: string;
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'email';
  message: string;
  category: 'system' | 'scraping' | 'notification' | 'test' | 'smtp';
}
