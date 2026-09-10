export interface Beneficiary {
  rawId: string;
  normalizedId: string;
  numericId: string;
  organization: string;
  name: string;
  gender?: string;
  phone?: string;
  email?: string;
  validFrom?: string;
  validTo?: string;
  cardNumber?: string;
  roomNumber?: string;
  floorNumber?: string;
}

export interface RawAttendanceLog {
  rawId: string;
  normalizedId: string;
  name: string;
  department: string;
  timestamp: string; // ISO or formatted
  dateStr: string; // YYYY-MM-DD
  timeStr: string; // HH:mm:ss
  attendanceStatus: string;
  verificationPoint: string;
  customName: string;
  dataSource: string;
  reportManagement: string;
  temperature: string;
  abnormal: string;
  fileName: string;
  isDuplicate?: boolean;
  duplicateReason?: string;
}

export interface ValidAttendanceRecord {
  id: string; // beneficiary or raw ID
  beneficiary?: Beneficiary;
  personName: string;
  organization: string;
  dateStr: string; // YYYY-MM-DD
  firstTimestamp: string; // Earliest timestamp
  firstTimeStr: string;
  verificationPoint: string;
  totalAttemptsToday: number;
  duplicateAttempts: RawAttendanceLog[];
  isRegisteredBeneficiary: boolean;
}

export interface DailyReport {
  dateStr: string;
  totalBeneficiaries: number;
  totalAttended: number;
  totalAbsent: number;
  totalUnregisteredSwipes: number;
  totalDuplicateScansFiltered: number;
  records: ValidAttendanceRecord[];
  hourlyDistribution: Record<string, number>;
}

export interface BeneficiaryMonthlySummary {
  beneficiary: Beneficiary;
  yearMonth: string; // YYYY-MM
  totalDaysWithLogs: number;
  daysAttended: number;
  daysAbsent: number;
  attendanceRate: number; // 0 to 100
  attendanceByDate: Record<string, ValidAttendanceRecord | null>;
}

export interface UploadedFileInfo {
  name: string;
  size: number;
  rowCount: number;
  validRows: number;
  duplicatesFound: number;
  detectedDate?: string;
  uploadTime: Date;
}

export interface ProcessingStats {
  totalBeneficiaries: number;
  totalBeneficiariesAttended: number;
  overallAttendanceRate: number;
  totalFilesUploaded: number;
  totalRawLogs: number;
  totalValidLunches: number;
  totalDuplicatesFiltered: number;
  totalUnregisteredPersons: number;
  dateRange: { start: string; end: string } | null;
  availableDates: string[];
  availableMonths: string[]; // ['2026-08', '2026-09']
  organizations: string[];
}
