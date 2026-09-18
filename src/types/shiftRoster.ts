export type ShiftMode = 'SHIFT' | 'NON_SHIFT';

export interface ShiftDefinition {
  id: string;
  name: string; // e.g. "Shift 1 (Pagi)", "Shift 2 (Sore)", "Non-Shift (Office)"
  shortName: string; // "S1", "S2", "NS", "OFF"
  startTime: string; // e.g. "07:00"
  endTime: string; // e.g. "15:30"
  color: string;
  bgColor: string;
  borderColor: string;
}

export interface EngineerProfile {
  id: string;
  name: string;
  username: string;
  opNumber?: string;
  role?: string;
}

export interface DayOverride {
  date: string; // YYYY-MM-DD
  engineerId: string;
  shiftId: string; // 'shift-1' | 'shift-2' | 'shift-ns' | 'shift-off'
  isSwapped?: boolean;
  swappedWith?: string; // name or id
  note?: string;
  updatedBy?: string;
  updatedAt?: string;
}

export interface ShiftRosterConfig {
  mode: ShiftMode;
  shifts: ShiftDefinition[];
  workdays: number[]; // 1 = Monday, 2 = Tuesday, ..., 5 = Friday, 6 = Saturday, 0 = Sunday
  engineers: EngineerProfile[];
  baseWeekMonday: string; // YYYY-MM-DD of a known Monday reference
  baseAssignments: { [engineerId: string]: string }; // e.g. { "ismailak": "shift-1", "rekan": "shift-2" }
  overrides: { [overrideKey: string]: DayOverride }; // key: `${date}_${engineerId}`
  holidays?: { [dateStr: string]: string }; // YYYY-MM-DD -> Holiday Name
  lastUpdatedAt: string;
}
