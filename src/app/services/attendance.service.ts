import { Injectable, signal, computed } from '@angular/core';
import {
  Beneficiary,
  RawAttendanceLog,
  ValidAttendanceRecord,
  DailyReport,
  BeneficiaryMonthlySummary,
  UploadedFileInfo,
  ProcessingStats
} from '../models/attendance.models';
import * as XLSX from 'xlsx-js-style';

@Injectable({
  providedIn: 'root'
})
export class AttendanceService {
  // Reactive Signals
  readonly beneficiaries = signal<Beneficiary[]>([]);
  readonly rawAttendanceLogs = signal<RawAttendanceLog[]>([]);
  readonly uploadedBeneficiariesFile = signal<UploadedFileInfo | null>(null);
  readonly uploadedAttendanceFiles = signal<UploadedFileInfo[]>([]);
  
  // Selection and filter signals
  readonly selectedBeneficiaryId = signal<string | null>(null);
  readonly selectedDate = signal<string | null>(null);
  readonly selectedMonth = signal<string>('2026-08');
  readonly selectedOrganizations = signal<Set<string>>(new Set(['ALL']));
  readonly selectedWeekStart = signal<string>(''); // YYYY-MM-DD del lunes de la semana actual
  readonly exportWeeksCount = signal<number>(1); // Número de semanas a exportar (1-8)
  readonly orgWeeksConfig = signal<Map<string, number>>(new Map()); // Semanas por carrera: org -> numSemanas
  readonly orgSelectedWeeks = signal<Map<string, Set<string>>>(new Map()); // Semanas seleccionadas por carrera: org -> Set<startDate>
  readonly searchTerm = signal<string>('');
  readonly filterStatus = signal<'ALL' | 'ATTENDED' | 'ABSENT' | 'DUPLICATES_ONLY'>('ALL');
  readonly activeTab = signal<'calendar' | 'matrix' | 'daily' | 'beneficiaries' | 'duplicates' | 'stats'>('matrix');

  // Computed: Map for fast beneficiary lookup
  readonly beneficiaryLookup = computed(() => {
    const list = this.beneficiaries();
    const map = new Map<string, Beneficiary>();
    const numericMap = new Map<string, Beneficiary>();
    const nameMap = new Map<string, Beneficiary>();

    for (const b of list) {
      map.set(b.normalizedId.toLowerCase(), b);
      if (b.numericId) {
        numericMap.set(b.numericId, b);
      }
      nameMap.set(this.normalizeString(b.name), b);
    }
    return { byId: map, byNumeric: numericMap, byName: nameMap };
  });

  // Computed: Processed records per person and date with Deduplication
  readonly processedRecords = computed(() => {
    const logs = this.rawAttendanceLogs();
    const lookup = this.beneficiaryLookup();

    // Group logs by personKey + dateStr
    // Person key can be normalized ID
    const grouped = new Map<string, RawAttendanceLog[]>();

    for (const log of logs) {
      const key = `${log.normalizedId}___${log.dateStr}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(log);
    }

    const validRecords: ValidAttendanceRecord[] = [];
    const duplicatesList: RawAttendanceLog[] = [];

    grouped.forEach((groupLogs) => {
      // Sort chronologically by timestamp
      groupLogs.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

      const firstLog = groupLogs[0];
      const dupes = groupLogs.slice(1);

      for (const d of dupes) {
        d.isDuplicate = true;
        d.duplicateReason = `Marcación duplicada detectada a las ${d.timeStr} (primer registro válido a las ${firstLog.timeStr})`;
        duplicatesList.push(d);
      }

      // Match beneficiary
      const matchedBeneficiary: Beneficiary | undefined = 
        lookup.byId.get(firstLog.normalizedId.toLowerCase()) ||
        lookup.byNumeric.get(this.cleanNumeric(firstLog.normalizedId)) ||
        lookup.byName.get(this.normalizeString(firstLog.name));

      validRecords.push({
        id: matchedBeneficiary ? matchedBeneficiary.normalizedId : firstLog.normalizedId,
        beneficiary: matchedBeneficiary,
        personName: matchedBeneficiary ? matchedBeneficiary.name : firstLog.name,
        organization: matchedBeneficiary ? matchedBeneficiary.organization : (firstLog.department || 'Sin Departamento'),
        dateStr: firstLog.dateStr,
        firstTimestamp: firstLog.timestamp,
        firstTimeStr: firstLog.timeStr,
        verificationPoint: firstLog.verificationPoint,
        totalAttemptsToday: groupLogs.length,
        duplicateAttempts: dupes,
        isRegisteredBeneficiary: Boolean(matchedBeneficiary)
      });
    });

    return {
      validRecords,
      duplicatesList
    };
  });

  // Computed: Available Dates sorted
  readonly availableDates = computed(() => {
    const records = this.processedRecords().validRecords;
    const dateSet = new Set<string>();
    for (const r of records) {
      if (r.dateStr) dateSet.add(r.dateStr);
    }
    return Array.from(dateSet).sort();
  });

  // Computed: Available Months (YYYY-MM)
  readonly availableMonths = computed(() => {
    const dates = this.availableDates();
    const monthSet = new Set<string>();
    for (const d of dates) {
      if (d.length >= 7) {
        monthSet.add(d.substring(0, 7));
      }
    }
    const months = Array.from(monthSet).sort();
    if (months.length === 0) return ['2026-08'];
    return months;
  });

  // Computed: Distinct Organizations
  readonly organizations = computed(() => {
    const list = this.beneficiaries();
    const orgs = new Set<string>();
    for (const b of list) {
      if (b.organization) orgs.add(b.organization);
    }
    return Array.from(orgs).sort();
  });

  // Computed: Global Stats
  readonly stats = computed<ProcessingStats>(() => {
    const bens = this.beneficiaries();
    const raw = this.rawAttendanceLogs();
    const processed = this.processedRecords();
    const dates = this.availableDates();
    const months = this.availableMonths();
    const orgs = this.organizations();
    const files = this.uploadedAttendanceFiles();

    const unregisteredCount = processed.validRecords.filter(r => !r.isRegisteredBeneficiary).length;

    const attendedBeneficiaryIds = new Set(
      processed.validRecords
        .filter(r => r.beneficiary)
        .map(r => r.beneficiary!.normalizedId)
    );
    const totalBeneficiariesAttended = attendedBeneficiaryIds.size;
    const overallAttendanceRate = bens.length > 0
      ? Math.round((totalBeneficiariesAttended / bens.length) * 100)
      : 0;

    return {
      totalBeneficiaries: bens.length,
      totalBeneficiariesAttended,
      overallAttendanceRate,
      totalFilesUploaded: files.length,
      totalRawLogs: raw.length,
      totalValidLunches: processed.validRecords.length,
      totalDuplicatesFiltered: processed.duplicatesList.length,
      totalUnregisteredPersons: unregisteredCount,
      dateRange: dates.length > 0 ? { start: dates[0], end: dates[dates.length - 1] } : null,
      availableDates: dates,
      availableMonths: months,
      organizations: orgs
    };
  });

  // Computed: Matrix for Selected Month
  readonly monthlyMatrix = computed(() => {
    const month = this.selectedMonth();
    const bens = this.beneficiaries();
    const processed = this.processedRecords().validRecords;
    const selectedOrgs = this.selectedOrganizations();
    const search = this.searchTerm().toLowerCase().trim();

    // Determine all days in this month that have logs
    const daysInMonthWithLogs = this.availableDates().filter(d => d.startsWith(month));

    // Map by beneficiary ID -> dateStr -> record
    const attendanceMap = new Map<string, Map<string, ValidAttendanceRecord>>();

    for (const rec of processed) {
      if (rec.dateStr.startsWith(month)) {
        const idKey = rec.beneficiary ? rec.beneficiary.normalizedId : rec.id;
        if (!attendanceMap.has(idKey)) {
          attendanceMap.set(idKey, new Map());
        }
        attendanceMap.get(idKey)!.set(rec.dateStr, rec);
      }
    }

    const summaries: BeneficiaryMonthlySummary[] = [];

    for (const b of bens) {
      // Filter by selected organizations (multiple selection)
      if (!selectedOrgs.has('ALL') && !selectedOrgs.has(b.organization)) {
        continue;
      }
      if (search && !b.name.toLowerCase().includes(search) && !b.normalizedId.toLowerCase().includes(search) && !b.organization.toLowerCase().includes(search)) {
        continue;
      }

      const bLogs = attendanceMap.get(b.normalizedId) || new Map();
      let attendedCount = 0;
      const attendanceByDate: Record<string, ValidAttendanceRecord | null> = {};

      for (const d of daysInMonthWithLogs) {
        const rec = bLogs.get(d) || null;
        attendanceByDate[d] = rec;
        if (rec) attendedCount++;
      }

      const totalDays = daysInMonthWithLogs.length;
      const rate = totalDays > 0 ? Math.round((attendedCount / totalDays) * 100) : 0;

      summaries.push({
        beneficiary: b,
        yearMonth: month,
        totalDaysWithLogs: totalDays,
        daysAttended: attendedCount,
        daysAbsent: totalDays - attendedCount,
        attendanceRate: rate,
        attendanceByDate
      });
    }

    // Day attendance totals
    const dayAttendanceTotals: Record<string, { attended: number; total: number; percentage: number }> = {};
    for (const d of daysInMonthWithLogs) {
      const attendedOnDay = summaries.filter(s => s.attendanceByDate[d] !== null).length;
      const totalBens = summaries.length;
      const pct = totalBens > 0 ? Math.round((attendedOnDay / totalBens) * 100) : 0;
      dayAttendanceTotals[d] = {
        attended: attendedOnDay,
        total: totalBens,
        percentage: pct
      };
    }

    const totalBeneficiariesInMatrix = summaries.length;
    const beneficiariesWithAtLeastOneLunch = summaries.filter(s => s.daysAttended > 0).length;
    const monthlyParticipationRate = totalBeneficiariesInMatrix > 0
      ? Math.round((beneficiariesWithAtLeastOneLunch / totalBeneficiariesInMatrix) * 100)
      : 0;

    return {
      month,
      days: daysInMonthWithLogs,
      summaries,
      totalBeneficiariesInMatrix,
      beneficiariesWithAtLeastOneLunch,
      monthlyParticipationRate,
      dayAttendanceTotals
    };
  });

  // Computed: Weekly Matrix for Selected Week (7 days)
  readonly weeklyMatrix = computed(() => {
    const weeks = this.availableWeeks();
    const weekIdx = this.currentWeekIndex();
    const bens = this.beneficiaries();
    const processed = this.processedRecords().validRecords;
    const selectedOrgs = this.selectedOrganizations();
    const search = this.searchTerm().toLowerCase().trim();

    if (weeks.length === 0 || !weeks[weekIdx]) {
      return {
        weekStart: '',
        days: [] as string[],
        summaries: [] as BeneficiaryMonthlySummary[],
        totalBeneficiariesInMatrix: 0,
        beneficiariesWithAtLeastOneLunch: 0,
        weeklyParticipationRate: 0,
        dayAttendanceTotals: {} as Record<string, { attended: number; total: number; percentage: number }>
      };
    }

    const week = weeks[weekIdx];
    const daysInWeek = week.dates; // All 7 days (Mon-Sun)

    // Map by beneficiary ID -> dateStr -> record
    const attendanceMap = new Map<string, Map<string, ValidAttendanceRecord>>();

    for (const rec of processed) {
      if (daysInWeek.includes(rec.dateStr)) {
        const idKey = rec.beneficiary ? rec.beneficiary.normalizedId : rec.id;
        if (!attendanceMap.has(idKey)) {
          attendanceMap.set(idKey, new Map());
        }
        attendanceMap.get(idKey)!.set(rec.dateStr, rec);
      }
    }

    const summaries: BeneficiaryMonthlySummary[] = [];

    for (const b of bens) {
      // Filter by selected organizations (multiple selection)
      if (!selectedOrgs.has('ALL') && !selectedOrgs.has(b.organization)) {
        continue;
      }
      if (search && !b.name.toLowerCase().includes(search) && !b.normalizedId.toLowerCase().includes(search) && !b.organization.toLowerCase().includes(search)) {
        continue;
      }

      const bLogs = attendanceMap.get(b.normalizedId) || new Map();
      let attendedCount = 0;
      const attendanceByDate: Record<string, ValidAttendanceRecord | null> = {};

      for (const d of daysInWeek) {
        const rec = bLogs.get(d) || null;
        attendanceByDate[d] = rec;
        if (rec) attendedCount++;
      }

      const totalDays = daysInWeek.length;
      const rate = totalDays > 0 ? Math.round((attendedCount / totalDays) * 100) : 0;

      summaries.push({
        beneficiary: b,
        yearMonth: week.startDate.substring(0, 7),
        totalDaysWithLogs: totalDays,
        daysAttended: attendedCount,
        daysAbsent: totalDays - attendedCount,
        attendanceRate: rate,
        attendanceByDate
      });
    }

    // Day attendance totals
    const dayAttendanceTotals: Record<string, { attended: number; total: number; percentage: number }> = {};
    for (const d of daysInWeek) {
      const attendedOnDay = summaries.filter(s => s.attendanceByDate[d] !== null).length;
      const totalBens = summaries.length;
      const pct = totalBens > 0 ? Math.round((attendedOnDay / totalBens) * 100) : 0;
      dayAttendanceTotals[d] = {
        attended: attendedOnDay,
        total: totalBens,
        percentage: pct
      };
    }

    const totalBeneficiariesInMatrix = summaries.length;
    const beneficiariesWithAtLeastOneLunch = summaries.filter(s => s.daysAttended > 0).length;
    const weeklyParticipationRate = totalBeneficiariesInMatrix > 0
      ? Math.round((beneficiariesWithAtLeastOneLunch / totalBeneficiariesInMatrix) * 100)
      : 0;

    return {
      weekStart: week.startDate,
      days: daysInWeek,
      summaries,
      totalBeneficiariesInMatrix,
      beneficiariesWithAtLeastOneLunch,
      weeklyParticipationRate,
      dayAttendanceTotals
    };
  });

  // Computed: Daily Report for Selected Date
  readonly selectedDailyReport = computed<DailyReport | null>(() => {
    const dateStr = this.selectedDate();
    if (!dateStr) return null;

    const bens = this.beneficiaries();
    const processed = this.processedRecords();
    const dayRecords = processed.validRecords.filter(r => r.dateStr === dateStr);
    const dayDuplicates = processed.duplicatesList.filter(r => r.dateStr === dateStr);

    const attendedBeneficiaryIds = new Set<string>();
    let unregisteredCount = 0;
    const hourlyDistribution: Record<string, number> = {
      '11:00': 0, '11:30': 0, '12:00': 0, '12:30': 0,
      '13:00': 0, '13:30': 0, '14:00': 0, '14:30': 0, '15:00': 0, 'Otro': 0
    };

    for (const rec of dayRecords) {
      if (rec.beneficiary) {
        attendedBeneficiaryIds.add(rec.beneficiary.normalizedId);
      } else {
        unregisteredCount++;
      }

      // Hour distribution
      const time = rec.firstTimeStr; // e.g. "12:35:59"
      if (time && time.length >= 5) {
        const hour = parseInt(time.substring(0, 2), 10);
        const min = parseInt(time.substring(3, 5), 10);
        if (hour === 11) {
          if (min < 30) hourlyDistribution['11:00']++;
          else hourlyDistribution['11:30']++;
        } else if (hour === 12) {
          if (min < 30) hourlyDistribution['12:00']++;
          else hourlyDistribution['12:30']++;
        } else if (hour === 13) {
          if (min < 30) hourlyDistribution['13:00']++;
          else hourlyDistribution['13:30']++;
        } else if (hour === 14) {
          if (min < 30) hourlyDistribution['14:00']++;
          else hourlyDistribution['14:30']++;
        } else if (hour === 15) {
          hourlyDistribution['15:00']++;
        } else {
          hourlyDistribution['Otro']++;
        }
      }
    }

    const totalBeneficiaries = bens.length;
    const totalAttended = attendedBeneficiaryIds.size;
    const totalAbsent = Math.max(0, totalBeneficiaries - totalAttended);

    return {
      dateStr,
      totalBeneficiaries,
      totalAttended,
      totalAbsent,
      totalUnregisteredSwipes: unregisteredCount,
      totalDuplicateScansFiltered: dayDuplicates.length,
      records: dayRecords,
      hourlyDistribution
    };
  });

  // Computed: Available weeks for calendar navigation
  readonly availableWeeks = computed(() => {
    const dates = this.availableDates();
    if (dates.length === 0) return [];

    // Group dates by week (Monday to Sunday)
    const weeks = new Map<string, string[]>();
    
    for (const dateStr of dates) {
      const d = new Date(dateStr + 'T12:00:00');
      const dayOfWeek = d.getDay(); // 0=Sunday, 1=Monday...
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(d);
      monday.setDate(d.getDate() + mondayOffset);
      const mondayStr = monday.toISOString().split('T')[0];
      
      if (!weeks.has(mondayStr)) {
        weeks.set(mondayStr, []);
      }
      weeks.get(mondayStr)!.push(dateStr);
    }

    // Sort weeks by Monday date
    return Array.from(weeks.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([monday, dates]) => ({
        startDate: monday,
        dates: dates.sort()
      }));
  });

  // Current week index for navigation
  readonly currentWeekIndex = computed(() => {
    const weeks = this.availableWeeks();
    const selectedStart = this.selectedWeekStart();
    if (!selectedStart || weeks.length === 0) return 0;
    const idx = weeks.findIndex(w => w.startDate === selectedStart);
    return idx >= 0 ? idx : 0;
  });

  constructor() {
    // Starts clean by default so users can upload their real CSV files.
    // Demo data can be loaded optionally via the 'Cargar Demo' button.
  }

  // Toggle organization selection
  toggleOrganization(org: string) {
    const current = new Set(this.selectedOrganizations());
    
    if (org === 'ALL') {
      // If clicking ALL, clear others and select only ALL
      this.selectedOrganizations.set(new Set(['ALL']));
      return;
    }
    
    // Remove ALL if selecting specific org
    current.delete('ALL');
    
    if (current.has(org)) {
      current.delete(org);
      // If no org selected, default back to ALL
      if (current.size === 0) {
        current.add('ALL');
      }
    } else {
      current.add(org);
    }
    
    this.selectedOrganizations.set(current);
  }

  // Set number of weeks for a specific organization
  setOrgWeeks(org: string, weeks: number) {
    const config = new Map(this.orgWeeksConfig());
    if (weeks <= 0) {
      config.delete(org); // Remove config, use default
    } else {
      config.set(org, weeks);
    }
    this.orgWeeksConfig.set(config);
  }

  // Get weeks for a specific organization (falls back to global exportWeeksCount)
  getOrgWeeks(org: string): number {
    const config = this.orgWeeksConfig();
    return config.get(org) || this.exportWeeksCount();
  }

  // Toggle a specific week for an organization
  toggleOrgWeek(org: string, weekStartDate: string) {
    const selected = new Map(this.orgSelectedWeeks());
    const orgWeeks = selected.get(org) || new Set<string>();
    
    if (orgWeeks.has(weekStartDate)) {
      orgWeeks.delete(weekStartDate);
    } else {
      orgWeeks.add(weekStartDate);
    }
    
    selected.set(org, orgWeeks);
    this.orgSelectedWeeks.set(selected);
    
    // Update the weeks count to match selection
    const config = new Map(this.orgWeeksConfig());
    config.set(org, orgWeeks.size);
    this.orgWeeksConfig.set(config);
  }

  // Check if a specific week is selected for an organization
  isOrgWeekSelected(org: string, weekStartDate: string): boolean {
    const selected = this.orgSelectedWeeks();
    const orgWeeks = selected.get(org);
    if (!orgWeeks || orgWeeks.size === 0) {
      // If no specific selection, use the last N weeks logic
      const weeksCount = this.getOrgWeeks(org);
      const available = this.availableWeeks();
      const startIdx = this.currentWeekIndex();
      const endIdx = Math.min(startIdx + this.exportWeeksCount(), available.length);
      const orgStartIdx = Math.max(endIdx - weeksCount, startIdx);
      return available.findIndex(w => w.startDate === weekStartDate) >= orgStartIdx;
    }
    return orgWeeks.has(weekStartDate);
  }

  // Export configurations from component (temporary for export)
  private exportConfigs = new Map<string, { weeks: number; selectedWeeks: string[] }>();

  setExportConfigs(configs: Map<string, { weeks: number; selectedWeeks: string[] }>) {
    this.exportConfigs = configs;
  }

  // Get selected weeks for an organization (returns sorted array of startDate strings)
  getOrgSelectedWeeks(org: string): string[] {
    // First check export configs from component
    const exportConfig = this.exportConfigs.get(org);
    if (exportConfig && exportConfig.selectedWeeks.length > 0) {
      return exportConfig.selectedWeeks.sort();
    }
    
    // Then check orgSelectedWeeks signal
    const selected = this.orgSelectedWeeks();
    const orgWeeks = selected.get(org);
    if (!orgWeeks || orgWeeks.size === 0) {
      // Return last N weeks based on config or default
      const weeksCount = exportConfig?.weeks || this.getOrgWeeks(org);
      const available = this.availableWeeks();
      const startIdx = this.currentWeekIndex();
      const endIdx = Math.min(startIdx + this.exportWeeksCount(), available.length);
      const orgStartIdx = Math.max(endIdx - weeksCount, startIdx);
      return available.slice(orgStartIdx, endIdx).map(w => w.startDate);
    }
    return Array.from(orgWeeks).sort();
  }

  // Get weeks count for an organization from export config or signal
  getOrgWeeksForExport(org: string): number {
    const exportConfig = this.exportConfigs.get(org);
    if (exportConfig) {
      return exportConfig.weeks;
    }
    return this.getOrgWeeks(org);
  }

  // Navigate to previous week
  prevWeek() {
    const weeks = this.availableWeeks();
    const idx = this.currentWeekIndex();
    if (idx > 0) {
      this.selectedWeekStart.set(weeks[idx - 1].startDate);
    }
  }

  // Navigate to next week
  nextWeek() {
    const weeks = this.availableWeeks();
    const idx = this.currentWeekIndex();
    if (idx < weeks.length - 1) {
      this.selectedWeekStart.set(weeks[idx + 1].startDate);
    }
  }

  // ==========================================
  // PARSER: BENEFICIARIES CSV (Semicolon Delimited)
  // ==========================================
  parseBeneficiariesCsv(csvContent: string, fileName = 'beneficiarios.csv'): number {
    const lines = csvContent.split(/\r\n|\n|\r/).filter(l => l.trim().length > 0);
    if (lines.length === 0) return 0;

    const parsedList: Beneficiary[] = [];

    // Check if line 0 is header
    let startIndex = 0;
    const firstLineLower = lines[0].toLowerCase();
    if (firstLineLower.includes('persona') || firstLineLower.includes('organizaci') || firstLineLower.includes('nombre') || firstLineLower.includes('id')) {
      startIndex = 1;
    }

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Handle semicolon delimited
      // Account for values with quotes
      const parts = this.splitCsvLine(line, ';');
      if (parts.length >= 3) {
        const rawId = this.cleanField(parts[0]);
        const org = this.cleanField(parts[1]);
        const name = this.cleanField(parts[2]);

        if (rawId || name) {
          const normalizedId = this.cleanId(rawId);
          const numericId = this.cleanNumeric(normalizedId);

          parsedList.push({
            rawId,
            normalizedId,
            numericId,
            organization: org || 'Sin Organización',
            name: name || 'Sin Nombre',
            gender: parts[3] ? this.cleanField(parts[3]) : '',
            phone: parts[4] ? this.cleanField(parts[4]) : '',
            email: parts[5] ? this.cleanField(parts[5]) : '',
            validFrom: parts[6] ? this.cleanField(parts[6]) : '',
            validTo: parts[7] ? this.cleanField(parts[7]) : '',
            cardNumber: parts[8] ? this.cleanField(parts[8]) : '',
            roomNumber: parts[9] ? this.cleanField(parts[9]) : '',
            floorNumber: parts[10] ? this.cleanField(parts[10]) : ''
          });
        }
      }
    }

    this.beneficiaries.set(parsedList);
    this.uploadedBeneficiariesFile.set({
      name: fileName,
      size: csvContent.length,
      rowCount: lines.length,
      validRows: parsedList.length,
      duplicatesFound: 0,
      uploadTime: new Date()
    });

    if (parsedList.length > 0 && !this.selectedBeneficiaryId()) {
      this.selectedBeneficiaryId.set(parsedList[0].normalizedId);
    }

    return parsedList.length;
  }

  // ==========================================
  // PARSER: ATTENDANCE CSVs (Multi-File, Comma/Semicolon)
  // ==========================================
  parseAttendanceCsvs(files: { name: string; content: string; size: number }[], append = true) {
    const currentLogs = append ? [...this.rawAttendanceLogs()] : [];
    const currentFiles = append ? [...this.uploadedAttendanceFiles()] : [];

    for (const file of files) {
      const lines = file.content.split(/\r\n|\n|\r/).filter(l => l.trim().length > 0);
      if (lines.length === 0) continue;

      // Detect delimiter from first line (comma or semicolon)
      const delimiter = lines[0].includes(';') && !lines[0].includes(',') ? ';' : ',';
      let startIndex = 0;
      const firstLineLower = lines[0].toLowerCase();
      if (firstLineLower.includes('persona') || firstLineLower.includes('hora') || firstLineLower.includes('departamento') || firstLineLower.includes('asistencia')) {
        startIndex = 1;
      }

      let fileValidRows = 0;
      let detectedFileDate: string | undefined;

      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const cols = this.splitCsvLine(line, delimiter);
        if (cols.length >= 4) {
          const rawId = this.cleanField(cols[0]);
          const name = this.cleanField(cols[1]);
          const dept = this.cleanField(cols[2]);
          const rawTime = this.cleanField(cols[3]);
          const attendanceStatus = cols[4] ? this.cleanField(cols[4]) : 'Normal';
          const verificationPoint = cols[5] ? this.cleanField(cols[5]) : 'Biométrico';
          const customName = cols[6] ? this.cleanField(cols[6]) : '';
          const dataSource = cols[7] ? this.cleanField(cols[7]) : '';
          const reportManagement = cols[8] ? this.cleanField(cols[8]) : '';
          const temp = cols[9] ? this.cleanField(cols[9]) : '';
          const abnormal = cols[10] ? this.cleanField(cols[10]) : '';

          if (rawId || name || rawTime) {
            const normalizedId = this.cleanId(rawId);
            const { dateStr, timeStr, fullTimestamp } = this.parseDateTime(rawTime);

            if (!detectedFileDate && dateStr) {
              detectedFileDate = dateStr;
            }

            currentLogs.push({
              rawId,
              normalizedId,
              name,
              department: dept,
              timestamp: fullTimestamp,
              dateStr,
              timeStr,
              attendanceStatus,
              verificationPoint,
              customName,
              dataSource,
              reportManagement,
              temperature: temp,
              abnormal,
              fileName: file.name
            });
            fileValidRows++;
          }
        }
      }

      currentFiles.push({
        name: file.name,
        size: file.size,
        rowCount: lines.length,
        validRows: fileValidRows,
        duplicatesFound: 0,
        detectedDate: detectedFileDate,
        uploadTime: new Date()
      });
    }

    this.rawAttendanceLogs.set(currentLogs);
    this.uploadedAttendanceFiles.set(currentFiles);

    // Auto set active date/month if available
    const dates = this.availableDates();
    if (dates.length > 0) {
      if (!this.selectedDate() || !dates.includes(this.selectedDate()!)) {
        this.selectedDate.set(dates[dates.length - 1]);
      }
      const lastMonth = dates[dates.length - 1].substring(0, 7);
      this.selectedMonth.set(lastMonth);
    }
  }

  // Clear all data
  clearAll() {
    this.beneficiaries.set([]);
    this.rawAttendanceLogs.set([]);
    this.uploadedBeneficiariesFile.set(null);
    this.uploadedAttendanceFiles.set([]);
    this.selectedBeneficiaryId.set(null);
    this.selectedDate.set(null);
  }

  // Remove beneficiaries file and its data
  removeBeneficiariesFile() {
    this.beneficiaries.set([]);
    this.uploadedBeneficiariesFile.set(null);
    this.selectedBeneficiaryId.set(null);
  }

  // Remove a specific attendance file and its logs
  removeAttendanceFile(fileName: string) {
    // Remove logs from this file
    const currentLogs = this.rawAttendanceLogs();
    const filteredLogs = currentLogs.filter(log => log.fileName !== fileName);
    this.rawAttendanceLogs.set(filteredLogs);
    
    // Remove file from uploaded list
    const currentFiles = this.uploadedAttendanceFiles();
    const filteredFiles = currentFiles.filter(f => f.name !== fileName);
    this.uploadedAttendanceFiles.set(filteredFiles);
    
    // Update available dates
    const dates = this.availableDates();
    if (dates.length > 0) {
      if (!this.selectedDate() || !dates.includes(this.selectedDate()!)) {
        this.selectedDate.set(dates[dates.length - 1]);
      }
      const lastMonth = dates[dates.length - 1].substring(0, 7);
      this.selectedMonth.set(lastMonth);
    } else {
      this.selectedDate.set(null);
    }
  }

  // Load realistic sample data
  loadDemoData() {
    const demoBeneficiariesCsv = `*ID de persona;*Organización;*Nombre de persona;*Sexo;Tel.;Correo electrónico;Hora de vigencia;Hora de caducidad;N.º de tarjeta;N.º de habitación;Núm. de piso
'00076578;'UNIVERSIDAD/empleados;Tito Salazar;1;;;'2026/07/25 00:00:00;'2036/07/24 23:59:59;;;
'10995475;'UNIVERSIDAD/estudiantes/AGROINDUSTRIAL;JONATAN DAVID OSPINA MOSQUERA;1;;;'2026/08/11 00:00:00;'2036/08/10 23:59:59;;;
'9172;'UNIVERSIDAD/estudiantes/ING INFORMATICA;LAURA ALEJANDRA ROJAS MARTINEZ;2;;;'2026/08/01 00:00:00;'2036/08/01 23:59:59;;;
'10884521;'UNIVERSIDAD/estudiantes/MEDICINA;CAMILO ANDRES PEÑA VARGAS;1;;;'2026/08/01 00:00:00;'2036/08/01 23:59:59;;;
'10957812;'UNIVERSIDAD/estudiantes/ING CIVIL;MARIA FERNANDA GOMEZ SILVA;2;;;'2026/08/01 00:00:00;'2036/08/01 23:59:59;;;
'00045123;'UNIVERSIDAD/empleados;Carlos Alberto Mendoza;1;;;'2026/07/25 00:00:00;'2036/07/24 23:59:59;;;
'10741299;'UNIVERSIDAD/estudiantes/DERECHO;VALENTINA CASTRO RESTREPO;2;;;'2026/08/01 00:00:00;'2036/08/01 23:59:59;;;
'10996841;'UNIVERSIDAD/estudiantes/AGROINDUSTRIAL;SANTIAGO MORALES DUQUE;1;;;'2026/08/11 00:00:00;'2036/08/10 23:59:59;;;
'10204918;'UNIVERSIDAD/estudiantes/ADMINISTRACION;PAULA ANDREA ZULUAGA;2;;;'2026/08/01 00:00:00;'2036/08/01 23:59:59;;;
'00088912;'UNIVERSIDAD/empleados;Marta Elena Rincón;2;;;'2026/07/25 00:00:00;'2036/07/24 23:59:59;;;
'10945820;'UNIVERSIDAD/estudiantes/ING INFORMATICA;DIEGO FELIPE HERRERA;1;;;'2026/08/01 00:00:00;'2036/08/01 23:59:59;;;
'10659832;'UNIVERSIDAD/estudiantes/ENFERMERIA;ANA SOFIA CARDONA;2;;;'2026/08/01 00:00:00;'2036/08/01 23:59:59;;;`;

    this.parseBeneficiariesCsv(demoBeneficiariesCsv, 'Beneficiarios_Almuerzos_IVMS4200_Demo.csv');

    // Demo daily attendance files for week of August 24 - 28, 2026
    const file24 = `ID de persona,Nombre,Departamento,Hora,Estado de asistencia,Punto de verificación de asistencia,Nombre personalizado,Fuente de datos,Gestión de informe,Temperatura,Anormal
'9172,LAURA ALEJANDRA ROJAS MARTINEZ,UNIVERSIDAD/estudiantes/ING INFORMATICA,2026-08-24 12:35:59,Nada,BIOMETRICO 1_Puerta1_Lector de tarjetas de entrada1,-,Registro de deslizamiento de tarjeta,-,-,-
'9172,LAURA ALEJANDRA ROJAS MARTINEZ,UNIVERSIDAD/estudiantes/ING INFORMATICA,2026-08-24 12:36:12,Nada,BIOMETRICO 1_Puerta1_Lector de tarjetas de entrada1,-,Registro de deslizamiento de tarjeta,-,-,-
'00076578,Tito Salazar,UNIVERSIDAD/empleados,2026-08-24 12:15:30,Nada,BIOMETRICO 1_Puerta1_Lector de tarjetas de entrada1,-,Registro de deslizamiento de tarjeta,-,-,-
'10995475,JONATAN DAVID OSPINA MOSQUERA,UNIVERSIDAD/estudiantes/AGROINDUSTRIAL,2026-08-24 12:48:10,Nada,BIOMETRICO 2_Puerta Principal,-,Registro de deslizamiento de tarjeta,-,-,-
'10884521,CAMILO ANDRES PEÑA VARGAS,UNIVERSIDAD/estudiantes/MEDICINA,2026-08-24 13:05:22,Nada,BIOMETRICO 1_Puerta1_Lector de tarjetas de entrada1,-,Registro de deslizamiento de tarjeta,-,-,-
'10957812,MARIA FERNANDA GOMEZ SILVA,UNIVERSIDAD/estudiantes/ING CIVIL,2026-08-24 12:20:45,Nada,BIOMETRICO 1_Puerta1_Lector de tarjetas de entrada1,-,Registro de deslizamiento de tarjeta,-,-,-
'00045123,Carlos Alberto Mendoza,UNIVERSIDAD/empleados,2026-08-24 11:58:30,Nada,BIOMETRICO 1_Puerta1_Lector de tarjetas de entrada1,-,Registro de deslizamiento de tarjeta,-,-,-
'10741299,VALENTINA CASTRO RESTREPO,UNIVERSIDAD/estudiantes/DERECHO,2026-08-24 13:14:02,Nada,BIOMETRICO 2_Puerta Principal,-,Registro de deslizamiento de tarjeta,-,-,-
'10996841,SANTIAGO MORALES DUQUE,UNIVERSIDAD/estudiantes/AGROINDUSTRIAL,2026-08-24 12:55:18,Nada,BIOMETRICO 1_Puerta1_Lector de tarjetas de entrada1,-,Registro de deslizamiento de tarjeta,-,-,-
'00088912,Marta Elena Rincón,UNIVERSIDAD/empleados,2026-08-24 12:10:05,Nada,BIOMETRICO 1_Puerta1_Lector de tarjetas de entrada1,-,Registro de deslizamiento de tarjeta,-,-,-
'99999999,VISITANTE NO REGISTRADO,EXTERNO,2026-08-24 13:40:11,Nada,BIOMETRICO 1_Puerta1_Lector de tarjetas de entrada1,-,Registro de deslizamiento de tarjeta,-,-,-`;

    const file25 = `ID de persona,Nombre,Departamento,Hora,Estado de asistencia,Punto de verificación de asistencia,Nombre personalizado,Fuente de datos,Gestión de informe,Temperatura,Anormal
'00076578,Tito Salazar,UNIVERSIDAD/empleados,2026-08-25 12:22:15,Nada,BIOMETRICO 1_Puerta1_Lector de tarjetas de entrada1,-,Registro de deslizamiento de tarjeta,-,-,-
'00076578,Tito Salazar,UNIVERSIDAD/empleados,2026-08-25 12:22:30,Nada,BIOMETRICO 1_Puerta1_Lector de tarjetas de entrada1,-,Registro de deslizamiento de tarjeta,-,-,-
'10995475,JONATAN DAVID OSPINA MOSQUERA,UNIVERSIDAD/estudiantes/AGROINDUSTRIAL,2026-08-25 12:40:00,Nada,BIOMETRICO 2_Puerta Principal,-,Registro de deslizamiento de tarjeta,-,-,-
'9172,LAURA ALEJANDRA ROJAS MARTINEZ,UNIVERSIDAD/estudiantes/ING INFORMATICA,2026-08-25 12:45:10,Nada,BIOMETRICO 1_Puerta1_Lector de tarjetas de entrada1,-,Registro de deslizamiento de tarjeta,-,-,-
'10957812,MARIA FERNANDA GOMEZ SILVA,UNIVERSIDAD/estudiantes/ING CIVIL,2026-08-25 12:15:33,Nada,BIOMETRICO 1_Puerta1_Lector de tarjetas de entrada1,-,Registro de deslizamiento de tarjeta,-,-,-
'00045123,Carlos Alberto Mendoza,UNIVERSIDAD/empleados,2026-08-25 12:05:19,Nada,BIOMETRICO 1_Puerta1_Lector de tarjetas de entrada1,-,Registro de deslizamiento de tarjeta,-,-,-
'10204918,PAULA ANDREA ZULUAGA,UNIVERSIDAD/estudiantes/ADMINISTRACION,2026-08-25 13:20:44,Nada,BIOMETRICO 1_Puerta1_Lector de tarjetas de entrada1,-,Registro de deslizamiento de tarjeta,-,-,-
'10945820,DIEGO FELIPE HERRERA,UNIVERSIDAD/estudiantes/ING INFORMATICA,2026-08-25 12:50:11,Nada,BIOMETRICO 2_Puerta Principal,-,Registro de deslizamiento de tarjeta,-,-,-
'10659832,ANA SOFIA CARDONA,UNIVERSIDAD/estudiantes/ENFERMERIA,2026-08-25 13:00:25,Nada,BIOMETRICO 1_Puerta1_Lector de tarjetas de entrada1,-,Registro de deslizamiento de tarjeta,-,-,-`;

    const file26 = `ID de persona,Nombre,Departamento,Hora,Estado de asistencia,Punto de verificación de asistencia,Nombre personalizado,Fuente de datos,Gestión de informe,Temperatura,Anormal
'00076578,Tito Salazar,UNIVERSIDAD/empleados,2026-08-26 12:10:40,Nada,BIOMETRICO 1_Puerta1_Lector de tarjetas de entrada1,-,Registro de deslizamiento de tarjeta,-,-,-
'10995475,JONATAN DAVID OSPINA MOSQUERA,UNIVERSIDAD/estudiantes/AGROINDUSTRIAL,2026-08-26 12:35:12,Nada,BIOMETRICO 2_Puerta Principal,-,Registro de deslizamiento de tarjeta,-,-,-
'10884521,CAMILO ANDRES PEÑA VARGAS,UNIVERSIDAD/estudiantes/MEDICINA,2026-08-26 12:55:00,Nada,BIOMETRICO 1_Puerta1_Lector de tarjetas de entrada1,-,Registro de deslizamiento de tarjeta,-,-,-
'10884521,CAMILO ANDRES PEÑA VARGAS,UNIVERSIDAD/estudiantes/MEDICINA,2026-08-26 12:55:40,Nada,BIOMETRICO 1_Puerta1_Lector de tarjetas de entrada1,-,Registro de deslizamiento de tarjeta,-,-,-
'10741299,VALENTINA CASTRO RESTREPO,UNIVERSIDAD/estudiantes/DERECHO,2026-08-26 13:10:15,Nada,BIOMETRICO 2_Puerta Principal,-,Registro de deslizamiento de tarjeta,-,-,-
'10996841,SANTIAGO MORALES DUQUE,UNIVERSIDAD/estudiantes/AGROINDUSTRIAL,2026-08-26 12:44:20,Nada,BIOMETRICO 1_Puerta1_Lector de tarjetas de entrada1,-,Registro de deslizamiento de tarjeta,-,-,-
'00088912,Marta Elena Rincón,UNIVERSIDAD/empleados,2026-08-26 12:18:50,Nada,BIOMETRICO 1_Puerta1_Lector de tarjetas de entrada1,-,Registro de deslizamiento de tarjeta,-,-,-
'10204918,PAULA ANDREA ZULUAGA,UNIVERSIDAD/estudiantes/ADMINISTRACION,2026-08-26 13:05:30,Nada,BIOMETRICO 1_Puerta1_Lector de tarjetas de entrada1,-,Registro de deslizamiento de tarjeta,-,-,-
'10659832,ANA SOFIA CARDONA,UNIVERSIDAD/estudiantes/ENFERMERIA,2026-08-26 12:28:40,Nada,BIOMETRICO 1_Puerta1_Lector de tarjetas de entrada1,-,Registro de deslizamiento de tarjeta,-,-,-`;

    const file27 = `ID de persona,Nombre,Departamento,Hora,Estado de asistencia,Punto de verificación de asistencia,Nombre personalizado,Fuente de datos,Gestión de informe,Temperatura,Anormal
'00076578,Tito Salazar,UNIVERSIDAD/empleados,2026-08-27 12:14:02,Nada,BIOMETRICO 1_Puerta1_Lector de tarjetas de entrada1,-,Registro de deslizamiento de tarjeta,-,-,-
'10995475,JONATAN DAVID OSPINA MOSQUERA,UNIVERSIDAD/estudiantes/AGROINDUSTRIAL,2026-08-27 12:45:00,Nada,BIOMETRICO 2_Puerta Principal,-,Registro de deslizamiento de tarjeta,-,-,-
'9172,LAURA ALEJANDRA ROJAS MARTINEZ,UNIVERSIDAD/estudiantes/ING INFORMATICA,2026-08-27 12:30:19,Nada,BIOMETRICO 1_Puerta1_Lector de tarjetas de entrada1,-,Registro de deslizamiento de tarjeta,-,-,-
'10957812,MARIA FERNANDA GOMEZ SILVA,UNIVERSIDAD/estudiantes/ING CIVIL,2026-08-27 12:18:40,Nada,BIOMETRICO 1_Puerta1_Lector de tarjetas de entrada1,-,Registro de deslizamiento de tarjeta,-,-,-
'00045123,Carlos Alberto Mendoza,UNIVERSIDAD/empleados,2026-08-27 12:02:11,Nada,BIOMETRICO 1_Puerta1_Lector de tarjetas de entrada1,-,Registro de deslizamiento de tarjeta,-,-,-
'10741299,VALENTINA CASTRO RESTREPO,UNIVERSIDAD/estudiantes/DERECHO,2026-08-27 13:12:55,Nada,BIOMETRICO 2_Puerta Principal,-,Registro de deslizamiento de tarjeta,-,-,-
'10945820,DIEGO FELIPE HERRERA,UNIVERSIDAD/estudiantes/ING INFORMATICA,2026-08-27 12:52:30,Nada,BIOMETRICO 1_Puerta1_Lector de tarjetas de entrada1,-,Registro de deslizamiento de tarjeta,-,-,-
'10659832,ANA SOFIA CARDONA,UNIVERSIDAD/estudiantes/ENFERMERIA,2026-08-27 12:39:10,Nada,BIOMETRICO 1_Puerta1_Lector de tarjetas de entrada1,-,Registro de deslizamiento de tarjeta,-,-,-`;

    const file28 = `ID de persona,Nombre,Departamento,Hora,Estado de asistencia,Punto de verificación de asistencia,Nombre personalizado,Fuente de datos,Gestión de informe,Temperatura,Anormal
'00076578,Tito Salazar,UNIVERSIDAD/empleados,2026-08-28 12:08:22,Nada,BIOMETRICO 1_Puerta1_Lector de tarjetas de entrada1,-,Registro de deslizamiento de tarjeta,-,-,-
'10995475,JONATAN DAVID OSPINA MOSQUERA,UNIVERSIDAD/estudiantes/AGROINDUSTRIAL,2026-08-28 12:30:10,Nada,BIOMETRICO 2_Puerta Principal,-,Registro de deslizamiento de tarjeta,-,-,-
'9172,LAURA ALEJANDRA ROJAS MARTINEZ,UNIVERSIDAD/estudiantes/ING INFORMATICA,2026-08-28 12:42:05,Nada,BIOMETRICO 1_Puerta1_Lector de tarjetas de entrada1,-,Registro de deslizamiento de tarjeta,-,-,-
'10884521,CAMILO ANDRES PEÑA VARGAS,UNIVERSIDAD/estudiantes/MEDICINA,2026-08-28 13:02:18,Nada,BIOMETRICO 1_Puerta1_Lector de tarjetas de entrada1,-,Registro de deslizamiento de tarjeta,-,-,-
'10957812,MARIA FERNANDA GOMEZ SILVA,UNIVERSIDAD/estudiantes/ING CIVIL,2026-08-28 12:12:40,Nada,BIOMETRICO 1_Puerta1_Lector de tarjetas de entrada1,-,Registro de deslizamiento de tarjeta,-,-,-
'10996841,SANTIAGO MORALES DUQUE,UNIVERSIDAD/estudiantes/AGROINDUSTRIAL,2026-08-28 12:50:33,Nada,BIOMETRICO 1_Puerta1_Lector de tarjetas de entrada1,-,Registro de deslizamiento de tarjeta,-,-,-
'00088912,Marta Elena Rincón,UNIVERSIDAD/empleados,2026-08-28 12:25:01,Nada,BIOMETRICO 1_Puerta1_Lector de tarjetas de entrada1,-,Registro de deslizamiento de tarjeta,-,-,-
'10204918,PAULA ANDREA ZULUAGA,UNIVERSIDAD/estudiantes/ADMINISTRACION,2026-08-28 13:18:22,Nada,BIOMETRICO 1_Puerta1_Lector de tarjetas de entrada1,-,Registro de deslizamiento de tarjeta,-,-,-
'10945820,DIEGO FELIPE HERRERA,UNIVERSIDAD/estudiantes/ING INFORMATICA,2026-08-28 12:48:15,Nada,BIOMETRICO 2_Puerta Principal,-,Registro de deslizamiento de tarjeta,-,-,-`;

    this.parseAttendanceCsvs([
      { name: 'IVMS_Asistencia_2026-08-24.csv', content: file24, size: file24.length },
      { name: 'IVMS_Asistencia_2026-08-25.csv', content: file25, size: file25.length },
      { name: 'IVMS_Asistencia_2026-08-26.csv', content: file26, size: file26.length },
      { name: 'IVMS_Asistencia_2026-08-27.csv', content: file27, size: file27.length },
      { name: 'IVMS_Asistencia_2026-08-28.csv', content: file28, size: file28.length },
    ], false);
  }

  // ==========================================
  // EXPORT UTILITIES
  // ==========================================
  exportMatrixToCsv(): string {
    const matrix = this.monthlyMatrix();
    const days = matrix.days;

    // Header row
    let csv = `\uFEFFID,Nombre,Organización,Días Asistidos,Total Días,% Asistencia,` + days.join(',') + `\n`;

    for (const item of matrix.summaries) {
      const b = item.beneficiary;
      const dayValues = days.map(d => {
        const rec = item.attendanceByDate[d];
        return rec ? `"${rec.firstTimeStr}"` : `"No asistió"`;
      });

      csv += `"${b.normalizedId}","${b.name}","${b.organization}",${item.daysAttended},${item.totalDaysWithLogs},"${item.attendanceRate}%",` + dayValues.join(',') + `\n`;
    }

    return csv;
  }

  exportDuplicatesToCsv(): string {
    const dupes = this.processedRecords().duplicatesList;
    let csv = `\uFEFFID,Nombre,Departamento,Fecha,Hora,Dispositivo/Punto,Archivo de Origen,Razón de Duplicado\n`;
    for (const d of dupes) {
      csv += `"${d.normalizedId}","${d.name}","${d.department}","${d.dateStr}","${d.timeStr}","${d.verificationPoint}","${d.fileName}","${d.duplicateReason}"\n`;
    }
    return csv;
  }

  exportDailyToCsv(dateStr: string): string {
    const records = this.processedRecords().validRecords.filter(r => r.dateStr === dateStr);
    let csv = `\uFEFFID,Nombre,Organización/Depto,Fecha,Hora de Almuerzo,Punto de Verificación,Estado Beneficiario,Total Intentos\n`;
    for (const r of records) {
      csv += `"${r.id}","${r.personName}","${r.organization}","${r.dateStr}","${r.firstTimeStr}","${r.verificationPoint}","${r.isRegisteredBeneficiary ? 'Beneficiario Registrado' : 'No Registrado'}","${r.totalAttemptsToday}"\n`;
    }
    return csv;
  }

  downloadCsv(content: string, filename: string) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // ==========================================
  // EXPORT EXCEL BY ORGANIZATION (MULTI-WEEK + STYLED)
  // ==========================================
  exportMatrixByOrganizationExcel(): void {
    const maxWeeksCount = this.exportWeeksCount();
    const startWeekIdx = this.currentWeekIndex();
    const availableWeeks = this.availableWeeks();
    const orgWeeksConfig = this.orgWeeksConfig();
    
    if (availableWeeks.length === 0) {
      alert('No hay datos de asistencia para exportar.');
      return;
    }
    
    // Week colors (background, header) - colores vivos
    const weekColors = [
      { bg: 'DCFCE7', header: '16A34A' },  // Verde vivo
      { bg: 'DBEAFE', header: '2563EB' },  // Azul vivo
      { bg: 'FEF3C7', header: 'D97706' },  // Naranja vivo
      { bg: 'FCE7F3', header: 'DB2777' },  // Rosa vivo
      { bg: 'EDE9FE', header: '7C3AED' },  // Morado vivo
      { bg: 'CCFBF1', header: '0D9488' },  // Cyan vivo
    ];
    
    // Generate ALL possible 7 days (Mon-Sun) for maximum weeks
    const allDays: string[] = [];
    const allWeeksUsed: string[] = [];
    
    for (let i = startWeekIdx; i < Math.min(startWeekIdx + maxWeeksCount, availableWeeks.length); i++) {
      const week = availableWeeks[i];
      allWeeksUsed.push(week.startDate);
      
      const startDate = new Date(week.startDate + 'T12:00:00');
      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + dayOffset);
        const dateStr = currentDate.toISOString().split('T')[0];
        allDays.push(dateStr);
      }
    }
    
    const allDaysSorted = [...new Set(allDays)].sort();
    
    if (allDaysSorted.length === 0) {
      alert('No hay datos para exportar.');
      return;
    }
    
    // Build summaries for ALL days
    const bens = this.beneficiaries();
    const processed = this.processedRecords().validRecords;
    const selectedOrgs = this.selectedOrganizations();
    const search = this.searchTerm().toLowerCase().trim();
    
    const attendanceMap = new Map<string, Map<string, ValidAttendanceRecord>>();
    for (const rec of processed) {
      if (allDaysSorted.includes(rec.dateStr)) {
        const idKey = rec.beneficiary ? rec.beneficiary.normalizedId : rec.id;
        if (!attendanceMap.has(idKey)) attendanceMap.set(idKey, new Map());
        attendanceMap.get(idKey)!.set(rec.dateStr, rec);
      }
    }
    
    const summaries: BeneficiaryMonthlySummary[] = [];
    for (const b of bens) {
      if (!selectedOrgs.has('ALL') && !selectedOrgs.has(b.organization)) continue;
      if (search && !b.name.toLowerCase().includes(search) && !b.normalizedId.toLowerCase().includes(search)) continue;
      
      const bLogs = attendanceMap.get(b.normalizedId) || new Map();
      let attendedCount = 0;
      const attendanceByDate: Record<string, ValidAttendanceRecord | null> = {};
      
      for (const d of allDaysSorted) {
        const rec = bLogs.get(d) || null;
        attendanceByDate[d] = rec;
        if (rec) attendedCount++;
      }
      
      summaries.push({
        beneficiary: b,
        yearMonth: allDaysSorted[0].substring(0, 7),
        totalDaysWithLogs: allDaysSorted.length,
        daysAttended: attendedCount,
        daysAbsent: allDaysSorted.length - attendedCount,
        attendanceRate: allDaysSorted.length > 0 ? Math.round((attendedCount / allDaysSorted.length) * 100) : 0,
        attendanceByDate
      });
    }
    
    // Group by organization
    const orgGroups = new Map<string, BeneficiaryMonthlySummary[]>();
    for (const item of summaries) {
      const org = item.beneficiary.organization || 'Sin Organización';
      if (!orgGroups.has(org)) orgGroups.set(org, []);
      orgGroups.get(org)!.push(item);
    }
    
    const wb = XLSX.utils.book_new();
    
    // ===== SUMMARY SHEET (all days) =====
    this.addSummarySheet(wb, allDaysSorted, allWeeksUsed, orgGroups, maxWeeksCount, weekColors);
    
    // ===== ORGANIZATION SHEETS (each org may have different weeks) =====
    for (const [org, items] of orgGroups) {
      const sheetName = this.getSheetName(org);
      
      // Get per-career weeks count from export config or signal
      const orgWeeks = this.getOrgWeeksForExport(org);
      
      // Get selected weeks for this org
      const selectedWeekStartDates = this.getOrgSelectedWeeks(org);
      
      // Generate days for THIS org only based on selected weeks
      const orgAllDays: string[] = [];
      for (const weekStartDate of selectedWeekStartDates) {
        const week = availableWeeks.find(w => w.startDate === weekStartDate);
        if (week) {
          const startDate = new Date(week.startDate + 'T12:00:00');
          for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
            const currentDate = new Date(startDate);
            currentDate.setDate(startDate.getDate() + dayOffset);
            orgAllDays.push(currentDate.toISOString().split('T')[0]);
          }
        }
      }
      const orgDaysSorted = [...new Set(orgAllDays)].sort();
      
      // Check if this org ONLY has weekend attendance (Sat/Sun)
      const hasWeekdayAttendance = items.some(item => {
        return orgDaysSorted.some(d => {
          const date = new Date(d + 'T12:00:00');
          const dow = date.getDay();
          return (dow >= 1 && dow <= 5) && item.attendanceByDate[d] !== null;
        });
      });
      
      // Filter days based on attendance type:
      // - If only weekend attendance: show only Sat/Sun
      // - If weekday attendance: show all 7 days
      let orgDays: string[];
      if (hasWeekdayAttendance) {
        // Weekday orgs: all 7 days
        orgDays = orgDaysSorted;
      } else {
        // Weekend-only orgs: only Sat/Sun
        orgDays = orgDaysSorted.filter(d => {
          const date = new Date(d + 'T12:00:00');
          const dow = date.getDay();
          return dow === 0 || dow === 6;
        });
      }
      
      if (orgDays.length === 0) continue;
      
      // Calculate day attendance for THIS organization only
      const orgDayTotals: Record<string, { attended: number; total: number; percentage: number }> = {};
      for (const d of orgDays) {
        const attendedOnDay = items.filter(i => i.attendanceByDate[d] !== null).length;
        const pct = items.length > 0 ? Math.round((attendedOnDay / items.length) * 100) : 0;
        orgDayTotals[d] = { attended: attendedOnDay, total: items.length, percentage: pct };
      }
      
      // Build sheet data
      const weekendNote = !hasWeekdayAttendance ? ' (Solo fines de semana)' : '';
      const weeksNote = orgWeeks !== maxWeeksCount ? ` [${orgWeeks} sem]` : '';
      const sheetData: any[][] = [
        [`🍽️ ASISTENCIA DE ALMUERZOS - ${this.formatOrgForExcel(org)}${weekendNote}${weeksNote}`],
        [''],
        ['📅 Período:', `${orgDays[0]} al ${orgDays[orgDays.length - 1]}`],
        ['📆 Semanas:', `${orgWeeks} semana(s) (${orgDays.length} días)`],
        ['👥 Beneficiarios:', items.length],
        [''],
        ['ID', 'NOMBRE', 'DÍAS ASISTIDOS', ...orgDays.map(d => `📅 ${this.formatDayHeader(d)}`)]
      ];
      
      // Data rows
      for (const item of items) {
        const b = item.beneficiary;
        const dayValues = orgDays.map(d => {
          const rec = item.attendanceByDate[d];
          const date = new Date(d + 'T12:00:00');
          const dayOfWeek = date.getDay();
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
          
          if (rec) {
            return `✅ ${rec.firstTimeStr}`;
          } else if (hasWeekdayAttendance && !isWeekend) {
            return '❌ No asistió';
          } else if (!hasWeekdayAttendance && isWeekend) {
            return '❌ No asistió';
          } else {
            return '─ Descanso';
          }
        });
        sheetData.push([
          b.normalizedId,
          b.name,
          item.daysAttended,
          ...dayValues
        ]);
      }
      
      // Day attendance totals
      sheetData.push(['']);
      sheetData.push(['', '📈 ASISTENCIA POR DÍA:', '', ...orgDays.map(d => {
        const stat = orgDayTotals[d];
        return stat ? `${stat.attended}/${stat.total} (${stat.percentage}%)` : '';
      })]);
      
      const sheet = XLSX.utils.aoa_to_sheet(sheetData);
      
      // Column widths
      const cols = [
        { wch: 14 },
        { wch: 35 },
        { wch: 16 },
        ...orgDays.map(() => ({ wch: 22 }))
      ];
      sheet['!cols'] = cols;
      
      // Build dayToWeekIdx for this org's days
      const orgDayToWeekIdx = new Map<string, number>();
      let weekIdx = 0;
      let lastWeekStart = '';
      for (const d of allDaysSorted) {
        const weekStart = this.getWeekStart(d);
        if (weekStart !== lastWeekStart) {
          lastWeekStart = weekStart;
          weekIdx++;
        }
        orgDayToWeekIdx.set(d, weekIdx);
      }
      
      // Apply styles
      this.applyOrgSheetStyles(sheet, sheetData.length, orgDays.length, items, orgDays, orgDayToWeekIdx, weekColors, hasWeekdayAttendance);
      
      XLSX.utils.book_append_sheet(wb, sheet, sheetName);
    }
    
    const fileName = `Reporte_Almuerzos_${allDaysSorted[0]}_a_${allDaysSorted[allDaysSorted.length - 1]}.xlsx`;
    XLSX.writeFile(wb, fileName);
  }

  private getWeekStart(dateStr: string): string {
    const d = new Date(dateStr + 'T12:00:00');
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d);
    monday.setDate(diff);
    return monday.toISOString().split('T')[0];
  }

  private addSummarySheet(wb: XLSX.WorkBook, days: string[], weeksUsed: string[], orgGroups: Map<string, BeneficiaryMonthlySummary[]>, weeksCount: number, weekColors: {bg: string; header: string}[]): void {
    const dayToWeekIdx = new Map<string, number>();
    for (let i = 0; i < weeksUsed.length; i++) {
      const startDate = new Date(weeksUsed[i] + 'T12:00:00');
      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + dayOffset);
        const dateStr = currentDate.toISOString().split('T')[0];
        dayToWeekIdx.set(dateStr, i);
      }
    }

    // Classify each day: Sunday -> Desayuno only, Saturday -> Desayuno (7am+) + Almuerzo/Refriegerio, Mon-Fri -> Almuerzo/Refriegerio
    const dayConfig: Record<string, { meals: string[]; label: string }> = {};
    for (const d of days) {
      const date = new Date(d + 'T12:00:00');
      const dow = date.getDay();
      if (dow === 0) {
        dayConfig[d] = { meals: ['Desayuno'], label: 'Des' };
      } else {
        dayConfig[d] = { meals: ['Almuerzo', 'Refriegerio'], label: 'Alm/Ref' };
      }
    }

    // Helper: classify meal type by time
    const classifyMeal = (timeStr: string, dayOfWeek: number): string => {
      if (!timeStr || timeStr === '--:--') return 'Otro';
      const hour = parseInt(timeStr.split(':')[0], 10);
      if (dayOfWeek === 0) return 'Desayuno';
      if (hour >= 11 && hour < 16) return 'Almuerzo';
      if (hour >= 18) return 'Refriegerio';
      return 'Otro';
    };

    // Count subsidies per org per day per meal
    const orgDayMealCounts = new Map<string, Record<string, Record<string, number>>>();
    const dayMealTotals: Record<string, Record<string, number>> = {};

    for (const d of days) {
      dayMealTotals[d] = { Almuerzo: 0, Refriegerio: 0, Desayuno: 0 };
    }

    for (const [org, items] of orgGroups) {
      const mealCounts: Record<string, Record<string, number>> = {};
      for (const d of days) {
        mealCounts[d] = { Almuerzo: 0, Refriegerio: 0, Desayuno: 0 };
      }
      for (const item of items) {
        for (const d of days) {
          const rec = item.attendanceByDate[d];
          if (rec) {
            const date = new Date(d + 'T12:00:00');
            const dow = date.getDay();
            const meal = classifyMeal(rec.firstTimeStr, dow);
            if (dayConfig[d].meals.includes(meal)) {
              mealCounts[d][meal] = (mealCounts[d][meal] || 0) + 1;
              dayMealTotals[d][meal] = (dayMealTotals[d][meal] || 0) + 1;
            }
          }
        }
      }
      orgDayMealCounts.set(org, mealCounts);
    }

    // Compute per-meal grand totals
    const mealGrandTotals = { Almuerzo: 0, Refriegerio: 0, Desayuno: 0 };
    for (const d of days) {
      mealGrandTotals.Almuerzo += dayMealTotals[d]['Almuerzo'];
      mealGrandTotals.Refriegerio += dayMealTotals[d]['Refriegerio'];
      mealGrandTotals.Desayuno += dayMealTotals[d]['Desayuno'];
    }

    // Build header row 1: Carrera | day spanning | TOTAL
    const headerRow1: any[] = ['Carrera'];
    for (const d of days) {
      const date = new Date(d + 'T12:00:00');
      const dow = date.getDay();
      const dayName = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][dow];
      const dayNum = d.split('-')[2];
      const month = d.split('-')[1];
      if (dow === 0) {
        headerRow1.push(`${dayName} ${dayNum}/${month}`);
      } else {
        headerRow1.push(`${dayName} ${dayNum}/${month}`);
        headerRow1.push('');
      }
    }
    headerRow1.push('TOTAL');

    // Build header row 2: meal sub-headers
    const headerRow2: any[] = [''];
    for (const d of days) {
      const date = new Date(d + 'T12:00:00');
      const dow = date.getDay();
      if (dow === 0) {
        headerRow2.push('🌅 Des');
      } else {
        headerRow2.push('🍽️ Alm');
        headerRow2.push('🍷 Ref');
      }
    }
    headerRow2.push('');

    // Build data rows
    const dataRows: any[][] = [];
    for (const [org, items] of orgGroups) {
      const row: any[] = [this.formatOrgForExcel(org)];
      let rowTotal = 0;
      const mealCounts = orgDayMealCounts.get(org) || {};
      for (const d of days) {
        const date = new Date(d + 'T12:00:00');
        const dow = date.getDay();
        const counts = mealCounts[d] || { Almuerzo: 0, Refriegerio: 0, Desayuno: 0 };
        if (dow === 0) {
          // Sunday: only Des
          row.push(counts['Desayuno']);
          rowTotal += counts['Desayuno'];
        } else {
          // Weekday/Saturday: Alm + Ref
          row.push(counts['Almuerzo']);
          row.push(counts['Refriegerio']);
          rowTotal += counts['Almuerzo'] + counts['Refriegerio'];
        }
      }
      row.push(rowTotal);
      dataRows.push(row);
    }

    // Build totals row
    const totalsRow: any[] = ['TOTAL GENERAL'];
    let grandTotal = 0;
    for (const d of days) {
      const date = new Date(d + 'T12:00:00');
      const dow = date.getDay();
      const t = dayMealTotals[d];
      if (dow === 0) {
        // Sunday: only Des
        totalsRow.push(t['Desayuno']);
        grandTotal += t['Desayuno'];
      } else {
        // Weekday/Saturday: Alm + Ref
        totalsRow.push(t['Almuerzo']);
        totalsRow.push(t['Refriegerio']);
        grandTotal += t['Almuerzo'] + t['Refriegerio'];
      }
    }
    totalsRow.push(grandTotal);

    const dateStart = new Date(days[0] + 'T12:00:00');
    const dateEnd = new Date(days[days.length - 1] + 'T12:00:00');
    const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
    const dateRange = `${dateStart.toLocaleDateString('es-ES', opts)} al ${dateEnd.toLocaleDateString('es-ES', opts)}`;
    const weeksLabel = weeksCount === 1 ? '1 semana' : `${weeksCount} semanas`;

    const summaryData: any[][] = [
      ['📊 RESUMEN DE SUBSIDIOS DE ALMUERZOS'],
      [''],
      ['📅 Período:', dateRange],
      ['📆 Semanas incluidas:', `${weeksLabel} (${days.length} días)`],
      ['🕐 Fecha de Exportación:', new Date().toLocaleString('es-ES')],
      [''],
      ['📋 SUBSIDIOS POR CARRERA, DÍA Y TIPO'],
      [''],
      ['Horarios: 🍽️ Almuerzo (11am-4pm) Lun-Vie+Sáb | 🍷 Refrigerio (6pm+) Lun-Vie+Sáb | 🌅 Desayuno (Dom 9am+ y Sáb 7am+)'],
      [''],
      headerRow1,
      headerRow2,
      ...dataRows,
      [''],
      totalsRow,
      [''],
      ['🍽️ Total Almuerzos', mealGrandTotals.Almuerzo],
      ['🍷 Total Refrigerio', mealGrandTotals.Refriegerio],
      ['🌅 Total Desayunos', mealGrandTotals.Desayuno],
      [''],
      ['📊 TOTAL GENERAL', grandTotal]
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);

    // Build merged cell ranges for day headers
    const merges: XLSX.Range[] = [];
    let colIdx = 1;
    for (const d of days) {
      const date = new Date(d + 'T12:00:00');
      const dow = date.getDay();
      if (dow === 0) {
        // Sunday: 1 col (no merge needed)
        colIdx += 1;
      } else {
        // Weekday/Saturday: 2 cols
        merges.push({ s: { r: 10, c: colIdx }, e: { r: 10, c: colIdx + 1 } });
        colIdx += 2;
      }
    }
    summarySheet['!merges'] = merges;

    const cols = [{ wch: 35 }];
    for (const d of days) {
      const date = new Date(d + 'T12:00:00');
      const dow = date.getDay();
      if (dow === 0) {
        cols.push({ wch: 12 });
      } else {
        cols.push({ wch: 10 }, { wch: 10 });
      }
    }
    cols.push({ wch: 12 });
    summarySheet['!cols'] = cols;

    this.applySummaryStyles(summarySheet, summaryData.length, days, dayToWeekIdx, weekColors, dayConfig);
    XLSX.utils.book_append_sheet(wb, summarySheet, 'Resumen');
  }

  private getDayColCount(d: string): number {
    const date = new Date(d + 'T12:00:00');
    const dow = date.getDay();
    if (dow === 0) return 1;
    return 2;
  }

  private styleDayRow(sheet: XLSX.WorkSheet, days: string[], rowNum: number, colStartIdx: number, style: any): number {
    let colIdx = colStartIdx;
    for (const d of days) {
      const colCount = this.getDayColCount(d);
      for (let m = 0; m < colCount; m++) {
        this.setCellStyles(sheet, `${this.getExcelCol(colIdx + m)}${rowNum}`, style);
      }
      colIdx += colCount;
    }
    return colIdx;
  }

  private applySummaryStyles(sheet: XLSX.WorkSheet, totalRows: number, days: string[], dayToWeekIdx: Map<string, number>, weekColors: {bg: string; header: string}[], dayConfig: Record<string, { meals: string[]; label: string }>): void {
    const baseStyle = { border: this.getBorderDef(), alignment: { horizontal: 'center' } as const };
    
    // Title style (row 1)
    this.setCellStyles(sheet, 'A1', { font: { bold: true, sz: 14, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '7C3AED' } }, alignment: { horizontal: 'center' } });
    this.setCellStyles(sheet, 'A3', { font: { bold: true, color: { rgb: '7C3AED' } } });
    this.setCellStyles(sheet, 'A4', { font: { bold: true, color: { rgb: '7C3AED' } } });
    this.setCellStyles(sheet, 'A7', { font: { bold: true, sz: 12, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '059669' } }, alignment: { horizontal: 'center' } });
    this.setCellStyles(sheet, 'A9', { font: { italic: true, sz: 9, color: { rgb: '64748B' } } });
    
    // Row 11: Carrera header + day headers with week colors + TOTAL
    this.setCellStyles(sheet, 'A11', { font: { bold: true, sz: 10, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '334155' } }, border: this.getBorderDef(), alignment: { horizontal: 'center' } });
    let colIdx = 1;
    for (const d of days) {
      const colCount = this.getDayColCount(d);
      const wIdx = dayToWeekIdx.get(d) || 0;
      const weekColor = weekColors[wIdx % weekColors.length];
      for (let m = 0; m < colCount; m++) {
        this.setCellStyles(sheet, `${this.getExcelCol(colIdx + m)}11`, { font: { bold: true, sz: 9, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: weekColor.header } }, border: this.getBorderDef(), alignment: { horizontal: 'center' } });
      }
      colIdx += colCount;
    }
    const totalCol = this.getExcelCol(colIdx);
    this.setCellStyles(sheet, `${totalCol}11`, { font: { bold: true, sz: 10, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '334155' } }, border: this.getBorderDef(), alignment: { horizontal: 'center' } });
    
    // Row 12: meal sub-headers with MEAL colors
    this.setCellStyles(sheet, 'A12', { font: { bold: true, sz: 8, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '475569' } }, border: this.getBorderDef(), alignment: { horizontal: 'center' } });
    colIdx = 1;
    for (const d of days) {
      const cfg = dayConfig[d];
      const mealColors: Record<string, string> = {
        'Desayuno': '7C3AED',    // morado
        'Almuerzo': 'D97706',    // naranja
        'Refriegerio': '60A5FA', // azul claro
      };
      for (const meal of cfg.meals) {
        const color = mealColors[meal] || '475569';
        this.setCellStyles(sheet, `${this.getExcelCol(colIdx)}12`, { font: { bold: true, sz: 8, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: color } }, border: this.getBorderDef(), alignment: { horizontal: 'center' } });
        colIdx++;
      }
    }
    this.setCellStyles(sheet, `${totalCol}12`, { font: { bold: true, sz: 8, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '475569' } }, border: this.getBorderDef(), alignment: { horizontal: 'center' } });
    
    // Data rows
    const dataCount = totalRows - 20;
    for (let rowIdx = 0; rowIdx < dataCount; rowIdx++) {
      const row = 13 + rowIdx;
      const isEven = rowIdx % 2 === 0;
      const bgColor = isEven ? 'F8FAFC' : 'FFFFFF';
      this.setCellStyles(sheet, `A${row}`, { fill: { fgColor: { rgb: bgColor } }, border: this.getBorderDef() });
      this.styleDayRow(sheet, days, row, 1, { fill: { fgColor: { rgb: bgColor } }, border: this.getBorderDef(), alignment: { horizontal: 'center' } });
      this.setCellStyles(sheet, `${totalCol}${row}`, { fill: { fgColor: { rgb: bgColor } }, border: this.getBorderDef(), alignment: { horizontal: 'center' } });
    }
    
    // Totals row (TOTAL GENERAL) - blue
    const totalsRowNum = 14 + dataCount;
    const blueStyle = { font: { bold: true, sz: 10, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '1E40AF' } }, border: this.getBorderDef(), alignment: { horizontal: 'center' } };
    this.setCellStyles(sheet, `A${totalsRowNum}`, { font: { bold: true, sz: 10, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '1E40AF' } }, border: this.getBorderDef() });
    this.styleDayRow(sheet, days, totalsRowNum, 1, blueStyle);
    this.setCellStyles(sheet, `${totalCol}${totalsRowNum}`, blueStyle);
    
    // Almuerzo total - orange
    const almRow = totalsRowNum + 2;
    const almStyle = { font: { bold: true, sz: 10, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: 'D97706' } }, border: this.getBorderDef(), alignment: { horizontal: 'center' } };
    this.setCellStyles(sheet, `A${almRow}`, { font: { bold: true, sz: 10, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: 'D97706' } }, border: this.getBorderDef() });
    this.setCellStyles(sheet, `B${almRow}`, almStyle);
    
    // Refrigerio total - light blue
    const refRow = totalsRowNum + 3;
    const lightBlueStyle = { font: { bold: true, sz: 10, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '60A5FA' } }, border: this.getBorderDef(), alignment: { horizontal: 'center' } };
    this.setCellStyles(sheet, `A${refRow}`, { font: { bold: true, sz: 10, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '60A5FA' } }, border: this.getBorderDef() });
    this.setCellStyles(sheet, `B${refRow}`, lightBlueStyle);
    
    // Desayuno total - purple
    const desRow = totalsRowNum + 4;
    const purpleStyle = { font: { bold: true, sz: 10, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '7C3AED' } }, border: this.getBorderDef(), alignment: { horizontal: 'center' } };
    this.setCellStyles(sheet, `A${desRow}`, { font: { bold: true, sz: 10, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '7C3AED' } }, border: this.getBorderDef() });
    this.setCellStyles(sheet, `B${desRow}`, purpleStyle);
    
    // Total general - green
    const totalGeneralRow = totalsRowNum + 6;
    const greenStyle = { font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '16A34A' } }, border: this.getBorderDef(), alignment: { horizontal: 'center' } };
    this.setCellStyles(sheet, `A${totalGeneralRow}`, { font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '16A34A' } }, border: this.getBorderDef() });
    this.setCellStyles(sheet, `B${totalGeneralRow}`, greenStyle);
  }

  private applyOrgSheetStyles(sheet: XLSX.WorkSheet, totalRows: number, dayCount: number, items: BeneficiaryMonthlySummary[], days: string[], dayToWeekIdx: Map<string, number>, weekColors: {bg: string; header: string}[], hasWeekdayAttendance: boolean): void {
    // Title style (row 1)
    this.setCellStyles(sheet, 'A1', { font: { bold: true, sz: 14, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '7C3AED' } }, alignment: { horizontal: 'center' } });
    
    // Info rows
    this.setCellStyles(sheet, 'A3', { font: { bold: true, color: { rgb: '7C3AED' } } });
    this.setCellStyles(sheet, 'A4', { font: { bold: true, color: { rgb: '7C3AED' } } });
    
    // Table headers (row 7) - base columns
    const headerCells = ['A7', 'B7', 'C7'];
    headerCells.forEach(cell => {
      this.setCellStyles(sheet, cell, { font: { bold: true, sz: 10, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '1E40AF' } }, border: this.getBorderDef(), alignment: { horizontal: 'center' } });
    });
    
    // Day header columns - COLORES POR SEMANA (D=4, E=5, F=6, ...)
    for (let i = 0; i < dayCount; i++) {
      const col = this.getExcelCol(3 + i); // D, E, F, ...
      const d = days[i];
      const wIdx = dayToWeekIdx.get(d) || 0;
      const weekColor = weekColors[wIdx % weekColors.length];
      
      this.setCellStyles(sheet, `${col}7`, { 
        font: { bold: true, sz: 10, color: { rgb: 'FFFFFF' } }, 
        fill: { fgColor: { rgb: weekColor.header } }, 
        border: this.getBorderDef(), 
        alignment: { horizontal: 'center' } 
      });
    }
    
    // Data rows with colored attendance cells
    for (let rowIdx = 0; rowIdx < items.length; rowIdx++) {
      const row = 8 + rowIdx;
      const item = items[rowIdx];
      
      // Base columns (ID, Name, Days Attended)
      const isEven = rowIdx % 2 === 0;
      const baseBgColor = isEven ? 'F8FAFC' : 'FFFFFF';
      
      for (let col = 0; col < 3; col++) {
        const colLetter = this.getExcelCol(col);
        this.setCellStyles(sheet, `${colLetter}${row}`, { 
          fill: { fgColor: { rgb: baseBgColor } }, 
          border: this.getBorderDef() 
        });
      }
      
      // Attendance cells - SIEMPRE VERDE si asistió
      for (let dayIdx = 0; dayIdx < dayCount; dayIdx++) {
        const col = this.getExcelCol(3 + dayIdx); // D, E, F...
        const dateStr = days[dayIdx];
        const hasAttended = item.attendanceByDate[dateStr] !== null;
        const date = new Date(dateStr + 'T12:00:00');
        const dayOfWeek = date.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        
        let cellBgColor: string;
        let cellFontColor: string;
        
        if (hasAttended) {
          // Attended - SIEMPRE VERDE
          cellBgColor = 'DCFCE7';
          cellFontColor = '166534';
        } else if ((hasWeekdayAttendance && !isWeekend) || (!hasWeekdayAttendance && isWeekend)) {
          // Working day but didn't attend - rojo
          cellBgColor = 'FEE2E2';
          cellFontColor = '991B1B';
        } else {
          // Day off - gray
          cellBgColor = 'F1F5F9';
          cellFontColor = '94A3B8';
        }
        
        this.setCellStyles(sheet, `${col}${row}`, { 
          fill: { fgColor: { rgb: cellBgColor } },
          font: { color: { rgb: cellFontColor } },
          border: this.getBorderDef(),
          alignment: { horizontal: 'center' }
        });
      }
    }
    
    // Attendance summary row styling
    const summaryRow = 8 + items.length + 2;
    this.setCellStyles(sheet, `B${summaryRow}`, { 
      font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' } }, 
      fill: { fgColor: { rgb: '475569' } }, 
      border: this.getBorderDef() 
    });
  }

  private setCellStyles(sheet: XLSX.WorkSheet, cellRef: string, styles: any): void {
    if (!sheet[cellRef]) {
      sheet[cellRef] = { t: 's', v: '' };
    }
    sheet[cellRef].s = styles;
  }

  private getBorderDef(): any {
    return {
      top: { style: 'thin', color: { rgb: 'CBD5E1' } },
      bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
      left: { style: 'thin', color: { rgb: 'CBD5E1' } },
      right: { style: 'thin', color: { rgb: 'CBD5E1' } }
    };
  }

  private formatOrgForExcel(org: string): string {
    if (!org) return 'Sin Organización';
    return org.replace(/^UNIVERSIDAD\//i, '').replace(/\//g, ' - ').replace(/_/g, ' ');
  }

  private getSheetName(org: string): string {
    // Excel sheet names have restrictions: max 31 chars, no special chars
    let name = this.formatOrgForExcel(org);
    // Remove invalid characters
    name = name.replace(/[\\\/\*\?\[\]:]/g, '');
    // Truncate to 31 chars
    return name.substring(0, 31);
  }

  private formatDayHeader(dateStr: string): string {
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    try {
      const d = new Date(dateStr + 'T12:00:00');
      const dayName = days[d.getDay()];
      const dayNum = dateStr.split('-')[2];
      return `${dayName} ${dayNum}`;
    } catch {
      return dateStr;
    }
  }

  // ==========================================
  // HELPER FUNCTIONS
  // ==========================================
  
  // Convert column index (0-based) to Excel column letter(s)
  // 0=A, 1=B, ..., 25=Z, 26=AA, 27=AB, ...
  private getExcelCol(index: number): string {
    let result = '';
    let n = index;
    while (n >= 0) {
      result = String.fromCharCode(65 + (n % 26)) + result;
      n = Math.floor(n / 26) - 1;
    }
    return result;
  }

  private cleanField(val: string | undefined): string {
    if (!val) return '';
    let res = val.trim();
    if (res.startsWith("'")) res = res.substring(1).trim();
    if (res.endsWith("'")) res = res.substring(0, res.length - 1).trim();
    if (res.startsWith('"')) res = res.substring(1).trim();
    if (res.endsWith('"')) res = res.substring(0, res.length - 1).trim();
    return res;
  }

  private cleanId(rawId: string): string {
    const cleaned = this.cleanField(rawId);
    return cleaned;
  }

  private cleanNumeric(id: string): string {
    const num = id.replace(/[^0-9]/g, '');
    if (!num) return '';
    // Strip leading zeroes for flexible numeric matching
    return num.replace(/^0+/, '') || '0';
  }

  private normalizeString(str: string): string {
    return (str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  private parseDateTime(dateTimeStr: string): { dateStr: string; timeStr: string; fullTimestamp: string } {
    const cleaned = this.cleanField(dateTimeStr);
    if (!cleaned) {
      return { dateStr: 'Desconocido', timeStr: '--:--', fullTimestamp: '' };
    }

    // Typical formats:
    // '2026-08-24 12:35:59'
    // '2026/08/24 12:35:59'
    // '24/08/2026 12:35:59'
    const parts = cleaned.split(' ');
    let datePart = parts[0] || '';
    const timePart = parts[1] || '12:00:00';

    // Normalize date separator to '-'
    datePart = datePart.replace(/\//g, '-');

    // Check if DD-MM-YYYY
    const subParts = datePart.split('-');
    if (subParts.length === 3) {
      if (subParts[0].length === 2 && subParts[2].length === 4) {
        // DD-MM-YYYY -> YYYY-MM-DD
        datePart = `${subParts[2]}-${subParts[1]}-${subParts[0]}`;
      } else if (subParts[0].length === 4) {
        // YYYY-MM-DD
        datePart = `${subParts[0]}-${subParts[1].padStart(2, '0')}-${subParts[2].padStart(2, '0')}`;
      }
    }

    return {
      dateStr: datePart,
      timeStr: timePart,
      fullTimestamp: `${datePart} ${timePart}`
    };
  }

  private splitCsvLine(line: string, delimiter: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  }
}
