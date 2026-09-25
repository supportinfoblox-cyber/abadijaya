import { ShiftRosterConfig } from '@/types/shiftRoster';

export const DEFAULT_SHIFT_ROSTER_CONFIG: ShiftRosterConfig = {
  mode: 'SHIFT',
  shifts: [
    {
      id: 'shift-1',
      name: 'Shift 1 (Pagi)',
      shortName: 'S1',
      startTime: '07.00',
      endTime: '15.00',
      color: '#10b981',
      bgColor: 'rgba(16, 185, 129, 0.15)',
      borderColor: 'rgba(16, 185, 129, 0.35)',
    },
    {
      id: 'shift-2',
      name: 'Shift 2 (Sore/Malam)',
      shortName: 'S2',
      startTime: '14.00',
      endTime: '22.00',
      color: '#6366f1',
      bgColor: 'rgba(99, 102, 241, 0.15)',
      borderColor: 'rgba(99, 102, 241, 0.35)',
    },
    {
      id: 'shift-ns',
      name: 'Non-Shift (Office Hours)',
      shortName: 'Office',
      startTime: '08.30',
      endTime: '17.30',
      color: '#f59e0b',
      bgColor: 'rgba(245, 158, 11, 0.15)',
      borderColor: 'rgba(245, 158, 11, 0.35)',
    },
    {
      id: 'shift-off',
      name: 'Hari Libur',
      shortName: 'Off',
      startTime: '-',
      endTime: '-',
      color: '#ef4444',
      bgColor: 'rgba(239, 68, 68, 0.15)',
      borderColor: 'rgba(239, 68, 68, 0.35)',
    },
  ],
  workdays: [1, 2, 3, 4, 5],
  engineers: [
    {
      id: 'usr-team-1',
      name: 'Regu 1',
      username: 'regu_1',
      role: 'Regu 1',
    },
    {
      id: 'usr-team-2',
      name: 'Regu 2',
      username: 'regu_2',
      role: 'Regu 2',
    },
  ],
  baseWeekMonday: '2026-02-02',
  baseAssignments: {
    'usr-team-1': 'shift-2',
    'usr-team-2': 'shift-1',
  },
  holidays: {
    '2026-04-03': 'Wafat Isa Almasih (Jumat Agung)',
  },
  overrides: {},
  lastUpdatedAt: '2026-09-19T03:30:00.000Z',
};
