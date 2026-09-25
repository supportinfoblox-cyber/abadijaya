import XLSX from 'xlsx-js-style';
import { ShiftRosterConfig } from '@/types/shiftRoster';

const INDONESIAN_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

interface MonthExportSpec {
  year: number;
  month: number; // 0-indexed: 0 = Jan, 1 = Feb, ..., 11 = Des
}

// Helpers
function formatDateStr(year: number, month: number, day: number): string {
  const y = year;
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export function exportRosterToExcelStyled(
  config: ShiftRosterConfig,
  monthsToExport: MonthExportSpec[],
  customFileName?: string
) {
  const wb = XLSX.utils.book_new();
  const ws: Record<string, unknown> = {};

  const eng1 = config.engineers[0] || { id: 'usr-team-1', name: 'Regu 1' };
  const eng2 = config.engineers[1] || { id: 'usr-team-2', name: 'Regu 2' };

  // Styles
  const blackBorder = {
    top: { style: 'thin', color: { rgb: '000000' } },
    bottom: { style: 'thin', color: { rgb: '000000' } },
    left: { style: 'thin', color: { rgb: '000000' } },
    right: { style: 'thin', color: { rgb: '000000' } },
  };

  const styleMonthHeader = {
    font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: '000000' } },
    fill: { fgColor: { rgb: 'FFFF00' } }, // Yellow
    alignment: { horizontal: 'center', vertical: 'center' },
    border: blackBorder,
  };

  const styleBlackCell = {
    fill: { fgColor: { rgb: '000000' } },
    border: blackBorder,
  };

  const styleDayHeaderWorkday = {
    font: { name: 'Calibri', sz: 10, bold: false, color: { rgb: '000000' } },
    fill: { fgColor: { rgb: 'FFFFFF' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: blackBorder,
  };

  const styleDayHeaderHoliday = {
    font: { name: 'Calibri', sz: 10, bold: false, color: { rgb: '000000' } },
    fill: { fgColor: { rgb: 'FF0000' } }, // Red
    alignment: { horizontal: 'center', vertical: 'center' },
    border: blackBorder,
  };

  const styleNameCell = {
    font: { name: 'Calibri', sz: 10, bold: false, color: { rgb: '000000' } },
    fill: { fgColor: { rgb: 'FFFFFF' } },
    alignment: { horizontal: 'left', vertical: 'center' },
    border: blackBorder,
  };

  const styleShiftWorkday = {
    font: { name: 'Calibri', sz: 10, bold: false, color: { rgb: '000000' } },
    fill: { fgColor: { rgb: 'FFFFFF' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: blackBorder,
  };

  const styleShiftHoliday = {
    fill: { fgColor: { rgb: 'FF0000' } }, // Red
    border: blackBorder,
  };

  const merges: Array<{ s: { r: number; c: number }; e: { r: number; c: number } }> = [];
  const colWidths: Record<number, number> = { 0: 18 }; // Col A width
  for (let c = 1; c <= 32; c++) {
    colWidths[c] = 4.2;
  }

  const rowHeights: Array<{ hpt: number }> = [];

  let currentRow = 0;

  // Determine shift for a specific date
  const getShiftForDate = (dateStr: string, engineerId: string) => {
    const d = new Date(dateStr);
    const dayOfWeek = d.getDay();
    const isRegularWorkday = config.workdays.includes(dayOfWeek);
    const isHoliday = !!(config.holidays && config.holidays[dateStr]);

    // Check override first
    const overrideKey = `${dateStr}_${engineerId}`;
    if (config.overrides && config.overrides[overrideKey]) {
      const ov = config.overrides[overrideKey];
      return {
        shiftId: ov.shiftId,
        isLibur: ov.shiftId === 'shift-off',
        label: ov.shiftId === 'shift-1' ? 'S1' : ov.shiftId === 'shift-2' ? 'S2' : '',
      };
    }

    // If weekend or holiday, it is Libur
    if (!isRegularWorkday || isHoliday) {
      return { shiftId: 'shift-off', isLibur: true, label: '' };
    }

    // Weekly alternating rotation
    const baseMonday = new Date(config.baseWeekMonday || '2026-02-02');
    const currentMonday = getMonday(d);
    const diffWeeks = Math.floor((currentMonday.getTime() - baseMonday.getTime()) / (1000 * 60 * 60 * 24 * 7));
    const isOddWeek = Math.abs(diffWeeks) % 2 === 1;

    const baseShift = config.baseAssignments[engineerId] || 'shift-1';
    let assigned = baseShift;
    if (isOddWeek) {
      assigned = baseShift === 'shift-1' ? 'shift-2' : 'shift-1';
    }

    return {
      shiftId: assigned,
      isLibur: false,
      label: assigned === 'shift-1' ? 'S1' : 'S2',
    };
  };

  // Build each month block
  monthsToExport.forEach((mSpec) => {
    const { year, month } = mSpec;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthTitle = `${INDONESIAN_MONTHS[month]} ${year}`;

    // 1. Month Header Row (Yellow banner)
    rowHeights[currentRow] = { hpt: 20 };
    for (let c = 0; c <= daysInMonth; c++) {
      const cellRef = XLSX.utils.encode_cell({ r: currentRow, c });
      ws[cellRef] = {
        v: c === 0 ? monthTitle : '',
        t: 's',
        s: styleMonthHeader,
      };
    }
    // Merge from Col 0 to Col daysInMonth
    merges.push({
      s: { r: currentRow, c: 0 },
      e: { r: currentRow, c: daysInMonth },
    });
    currentRow++;

    // 2. Day Numbers Row
    rowHeights[currentRow] = { hpt: 19 };
    // Col 0: Black cell
    const blackCellRef = XLSX.utils.encode_cell({ r: currentRow, c: 0 });
    ws[blackCellRef] = { v: '', t: 's', s: styleBlackCell };

    // Cols 1..daysInMonth
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = formatDateStr(year, month, day);
      const d = new Date(year, month, day);
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
      const isHoliday = isWeekend || !!(config.holidays && config.holidays[dateStr]);

      const cellRef = XLSX.utils.encode_cell({ r: currentRow, c: day });
      ws[cellRef] = {
        v: day,
        t: 'n',
        s: isHoliday ? styleDayHeaderHoliday : styleDayHeaderWorkday,
      };
    }
    currentRow++;

    // 3. Team 1 Row (Regu 1)
    rowHeights[currentRow] = { hpt: 19 };
    const t1NameRef = XLSX.utils.encode_cell({ r: currentRow, c: 0 });
    ws[t1NameRef] = { v: ` ${eng1.name}`, t: 's', s: styleNameCell };

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = formatDateStr(year, month, day);
      const sInfo = getShiftForDate(dateStr, eng1.id);

      const cellRef = XLSX.utils.encode_cell({ r: currentRow, c: day });
      ws[cellRef] = {
        v: sInfo.isLibur ? '' : sInfo.label,
        t: 's',
        s: sInfo.isLibur ? styleShiftHoliday : styleShiftWorkday,
      };
    }
    currentRow++;

    // 4. Team 2 Row (Regu 2)
    rowHeights[currentRow] = { hpt: 19 };
    const t2NameRef = XLSX.utils.encode_cell({ r: currentRow, c: 0 });
    ws[t2NameRef] = { v: ` ${eng2.name}`, t: 's', s: styleNameCell };

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = formatDateStr(year, month, day);
      const sInfo = getShiftForDate(dateStr, eng2.id);

      const cellRef = XLSX.utils.encode_cell({ r: currentRow, c: day });
      ws[cellRef] = {
        v: sInfo.isLibur ? '' : sInfo.label,
        t: 's',
        s: sInfo.isLibur ? styleShiftHoliday : styleShiftWorkday,
      };
    }
    currentRow++;

    // Spacer row
    rowHeights[currentRow] = { hpt: 12 };
    currentRow++;
  });

  // Extra spacer
  rowHeights[currentRow] = { hpt: 14 };
  currentRow++;

  // Remark Table
  const s1 = config.shifts.find(s => s.id === 'shift-1') || { startTime: '07.00', endTime: '15.00' };
  const s2 = config.shifts.find(s => s.id === 'shift-2') || { startTime: '14.00', endTime: '22.00' };

  // Remark Header (Yellow)
  rowHeights[currentRow] = { hpt: 19 };
  const rHeaderA = XLSX.utils.encode_cell({ r: currentRow, c: 0 });
  const rHeaderB = XLSX.utils.encode_cell({ r: currentRow, c: 1 });
  ws[rHeaderA] = { v: 'Remark', t: 's', s: styleMonthHeader };
  ws[rHeaderB] = { v: '', t: 's', s: styleMonthHeader };
  merges.push({
    s: { r: currentRow, c: 0 },
    e: { r: currentRow, c: 1 },
  });
  currentRow++;

  // Remark Row 1: S1
  rowHeights[currentRow] = { hpt: 18 };
  ws[XLSX.utils.encode_cell({ r: currentRow, c: 0 })] = { v: 'S1', t: 's', s: styleShiftWorkday };
  ws[XLSX.utils.encode_cell({ r: currentRow, c: 1 })] = { v: `${s1.startTime} - ${s1.endTime}`, t: 's', s: styleShiftWorkday };
  currentRow++;

  // Remark Row 2: S2
  rowHeights[currentRow] = { hpt: 18 };
  ws[XLSX.utils.encode_cell({ r: currentRow, c: 0 })] = { v: 'S2', t: 's', s: styleShiftWorkday };
  ws[XLSX.utils.encode_cell({ r: currentRow, c: 1 })] = { v: `${s2.startTime} - ${s2.endTime}`, t: 's', s: styleShiftWorkday };
  currentRow++;

  // Remark Row 3: Hari Libur (Red block + text)
  rowHeights[currentRow] = { hpt: 18 };
  ws[XLSX.utils.encode_cell({ r: currentRow, c: 0 })] = { v: '', t: 's', s: styleShiftHoliday };
  ws[XLSX.utils.encode_cell({ r: currentRow, c: 1 })] = { v: 'Hari Libur', t: 's', s: styleShiftWorkday };
  currentRow++;

  // Apply merges, ref, and dimensions
  const maxCol = 32;
  ws['!ref'] = XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: currentRow - 1, c: maxCol },
  });
  ws['!merges'] = merges;
  ws['!cols'] = Object.keys(colWidths).map(k => ({ wch: colWidths[Number(k)] }));
  ws['!rows'] = rowHeights;

  XLSX.utils.book_append_sheet(wb, ws, 'Roster Shift');

  const fileName = customFileName || `Jadwal_Shift_${monthsToExport.map(m => INDONESIAN_MONTHS[m.month]).join('_')}_${monthsToExport[0]?.year || 2026}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
