import { Ticket } from '@/types';

export interface ChartCanvasItem {
  key: string;
  label: string;
  subLabel?: string;
  fullLabel?: string;
  total: number;
  dns: number;
  reserve: number;
  ipam: number;
  drp: number;
  other: number;
}

export interface ChartCanvasMeta {
  timeframeLabel: string;
  totalTickets: number;
  averageTickets: number;
  peakItem: ChartCanvasItem | null;
  periodUnit: 'bulan' | 'hari';
  dateGeneratedStr?: string;
}

/**
 * Renders a high-resolution, presentation-grade diagram snapshot to a PNG base64 string
 * using native HTML5 Canvas in the browser.
 */
export async function renderMonthlyChartToCanvasImage(
  chartData: ChartCanvasItem[],
  meta: ChartCanvasMeta
): Promise<string> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('Canvas rendering requires browser environment');
  }

  // 1. Calculate dynamic canvas width based on number of items
  const minWidth = 1200;
  const itemSlotWidth = 75;
  const calculatedWidth = Math.max(minWidth, chartData.length * itemSlotWidth + 240);
  const canvasWidth = calculatedWidth;
  const canvasHeight = 680;

  // Retina scale factor for ultra-crisp text and graphics
  const scale = 2;

  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth * scale;
  canvas.height = canvasHeight * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Gagal menginisialisasi 2D Canvas Context');
  }

  // Scale all operations by scale factor
  ctx.scale(scale, scale);

  // 2. Background gradient (Executive Dark Slate matching app UI)
  const bgGrad = ctx.createLinearGradient(0, 0, canvasWidth, canvasHeight);
  bgGrad.addColorStop(0, '#0F172A'); // deep slate navy
  bgGrad.addColorStop(1, '#1E293B'); // slate dark
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Outer border
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(1, 1, canvasWidth - 2, canvasHeight - 2);

  // Decorative top accent line
  const accentGrad = ctx.createLinearGradient(0, 0, canvasWidth, 0);
  accentGrad.addColorStop(0, '#6366F1'); // indigo
  accentGrad.addColorStop(0.5, '#A855F7'); // purple
  accentGrad.addColorStop(1, '#06B6D4'); // cyan
  ctx.fillStyle = accentGrad;
  ctx.fillRect(0, 0, canvasWidth, 4);

  // 3. Top Header
  // Icon Badge
  const headerY = 24;
  ctx.fillStyle = 'rgba(99, 102, 241, 0.2)';
  ctx.strokeStyle = 'rgba(99, 102, 241, 0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(32, headerY, 42, 42, 10);
  ctx.fill();
  ctx.stroke();

  // BarChart icon inside badge (simple 3-bar drawing)
  ctx.fillStyle = '#A5B4FC';
  ctx.fillRect(40, headerY + 22, 5, 12);
  ctx.fillRect(48, headerY + 14, 5, 20);
  ctx.fillRect(56, headerY + 8, 5, 26);

  // Title Text
  ctx.fillStyle = '#F8FAFC';
  ctx.font = 'bold 18px "Inter", "Segoe UI", Roboto, sans-serif';
  ctx.fillText('Diagram Tiket Bulanan & Peak Velocity', 86, headerY + 20);

  // System Badge
  ctx.fillStyle = 'rgba(168, 85, 247, 0.15)';
  ctx.strokeStyle = 'rgba(168, 85, 247, 0.4)';
  ctx.beginPath();
  const badgeX = 450;
  ctx.roundRect(badgeX, headerY + 4, 86, 22, 6);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#C084FC';
  ctx.font = 'bold 11px "Inter", "Segoe UI", Roboto, sans-serif';
  ctx.fillText('iCare OTRS', badgeX + 11, headerY + 19);

  // Subtitle
  ctx.fillStyle = '#94A3B8';
  ctx.font = '12px "Inter", "Segoe UI", Roboto, sans-serif';
  ctx.fillText(
    `Periode: ${meta.timeframeLabel}   •   Total: ${meta.totalTickets} Tiket   •   Rata-rata: ~${meta.averageTickets} tiket/${meta.periodUnit}`,
    86,
    headerY + 38
  );

  // Timestamp on top right
  const dateStr = meta.dateGeneratedStr || new Date().toLocaleString('id-ID');
  ctx.fillStyle = '#64748B';
  ctx.font = '11px "Inter", "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`Diekspor: ${dateStr}`, canvasWidth - 32, headerY + 20);
  ctx.textAlign = 'left';

  // 4. Peak Velocity Highlight Box
  const peakBoxY = 82;
  const peakBoxHeight = 74;
  const peakItem = meta.peakItem;

  if (peakItem) {
    const peakGrad = ctx.createLinearGradient(32, peakBoxY, canvasWidth - 32, peakBoxY);
    peakGrad.addColorStop(0, 'rgba(245, 158, 11, 0.14)');
    peakGrad.addColorStop(0.5, 'rgba(99, 102, 241, 0.08)');
    peakGrad.addColorStop(1, 'rgba(30, 41, 59, 0.6)');

    ctx.fillStyle = peakGrad;
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.45)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(32, peakBoxY, canvasWidth - 64, peakBoxHeight, 10);
    ctx.fill();
    ctx.stroke();

    // Amber left stripe indicator
    ctx.fillStyle = '#F59E0B';
    ctx.fillRect(32, peakBoxY, 4, peakBoxHeight);

    // Peak Award Icon Badge
    ctx.fillStyle = 'rgba(245, 158, 11, 0.25)';
    ctx.beginPath();
    ctx.roundRect(48, peakBoxY + 14, 46, 46, 10);
    ctx.fill();

    ctx.fillStyle = '#F59E0B';
    ctx.font = '24px sans-serif';
    ctx.fillText('🏆', 55, peakBoxY + 45);

    // Peak Label & Month Name
    ctx.fillStyle = '#F59E0B';
    ctx.font = 'bold 10px "Inter", "Segoe UI", Roboto, sans-serif';
    const peakTitleText = meta.periodUnit === 'hari'
      ? '★ TANGGAL DENGAN TIKET TERBANYAK (PEAK DAY)'
      : '★ BULAN DENGAN TIKET TERBANYAK (PEAK VELOCITY)';
    ctx.fillText(peakTitleText, 106, peakBoxY + 28);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 18px "Inter", "Segoe UI", Roboto, sans-serif';
    const peakLabelText = peakItem.fullLabel || `${peakItem.label} ${peakItem.subLabel || ''}`;
    ctx.fillText(peakLabelText, 106, peakBoxY + 52);

    // Peak Stats (Right side of banner)
    const rightStatX = canvasWidth - 380;

    // Total Count Callout
    ctx.fillStyle = '#818CF8';
    ctx.font = '900 24px "Inter", "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`${peakItem.total}`, rightStatX, peakBoxY + 38);
    ctx.fillStyle = '#94A3B8';
    ctx.font = 'bold 12px "Inter", "Segoe UI", Roboto, sans-serif';
    ctx.fillText('Tiket', rightStatX + 50, peakBoxY + 38);

    // Mini badges breakdown
    const badgeRowX = rightStatX + 110;
    ctx.font = '11px "Inter", "Segoe UI", Roboto, sans-serif';

    // Row 1: DNS & Reserve IP
    ctx.fillStyle = '#C084FC';
    ctx.fillText(`● DNS: ${peakItem.dns}`, badgeRowX, peakBoxY + 30);
    ctx.fillStyle = '#34D399';
    ctx.fillText(`● Reserve IP: ${peakItem.reserve}`, badgeRowX + 110, peakBoxY + 30);

    // Row 2: IPAM & DRP
    ctx.fillStyle = '#FBBF24';
    ctx.fillText(`● IPAM: ${peakItem.ipam}`, badgeRowX, peakBoxY + 52);
    ctx.fillStyle = '#F87171';
    ctx.fillText(`● DRP: ${peakItem.drp}`, badgeRowX + 110, peakBoxY + 52);
  }

  // 5. Chart Graphic Area
  const chartAreaX = 70;
  const chartAreaY = 175;
  const chartAreaWidth = canvasWidth - 110;
  const chartAreaHeight = 390;
  const chartBaselineY = chartAreaY + chartAreaHeight;

  // Calculate maximum total value for scale
  const maxTotal = Math.max(...chartData.map(d => d.total), 1);
  // Rounded nice ceiling for Y-axis
  const yCeiling = Math.ceil(maxTotal * 1.15);

  // Y-axis grid lines (4 horizontal divisions: 0%, 25%, 50%, 75%, 100%)
  const ySteps = 4;
  ctx.font = '11px "Inter", "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'right';

  for (let i = 0; i <= ySteps; i++) {
    const fraction = i / ySteps;
    const yVal = Math.round(fraction * yCeiling);
    const lineY = chartBaselineY - fraction * chartAreaHeight;

    // Grid line
    ctx.strokeStyle = i === 0 ? '#475569' : '#1E293B';
    ctx.lineWidth = i === 0 ? 1.5 : 1;
    ctx.setLineDash(i === 0 ? [] : [4, 4]);

    ctx.beginPath();
    ctx.moveTo(chartAreaX, lineY);
    ctx.lineTo(chartAreaX + chartAreaWidth, lineY);
    ctx.stroke();

    // Value label
    ctx.fillStyle = '#64748B';
    ctx.fillText(String(yVal), chartAreaX - 10, lineY + 4);
  }
  ctx.setLineDash([]);
  ctx.textAlign = 'left';

  // 6. Draw Bars
  if (chartData.length > 0) {
    const totalBars = chartData.length;
    const slotWidth = chartAreaWidth / totalBars;
    const barWidth = Math.min(52, Math.max(16, slotWidth * 0.65));

    chartData.forEach((item, idx) => {
      const slotCenterX = chartAreaX + idx * slotWidth + slotWidth / 2;
      const barX = slotCenterX - barWidth / 2;
      const totalBarHeight = Math.max(6, (item.total / yCeiling) * chartAreaHeight);
      const isPeak = peakItem && peakItem.key === item.key;

      // Draw Stacked Segments
      // Segments: DNS, Reserve, IPAM, DRP, Other
      const segments = [
        { count: item.dns, color: '#8B5CF6' },      // DNS (Purple)
        { count: item.reserve, color: '#10B981' },  // Reserve (Emerald)
        { count: item.ipam, color: '#F59E0B' },     // IPAM (Amber)
        { count: item.drp, color: '#EF4444' },      // DRP (Red)
        { count: item.other, color: '#64748B' },    // Other (Slate)
      ];

      let currentBottomY = chartBaselineY;

      // In case total is 0
      if (item.total === 0) {
        ctx.fillStyle = '#334155';
        ctx.fillRect(barX, chartBaselineY - 3, barWidth, 3);
      } else {
        segments.forEach((seg, sIdx) => {
          if (seg.count <= 0) return;
          const segHeight = (seg.count / item.total) * totalBarHeight;
          const segY = currentBottomY - segHeight;

          // Render segment with gradient
          const segGrad = ctx.createLinearGradient(barX, segY, barX + barWidth, segY + segHeight);
          segGrad.addColorStop(0, seg.color);
          segGrad.addColorStop(1, adjustColor(seg.color, -20));

          ctx.fillStyle = segGrad;

          // Topmost segment gets rounded top corners
          const isTopSegment = (sIdx === segments.filter(s => s.count > 0).length - 1);
          if (isTopSegment) {
            ctx.beginPath();
            ctx.roundRect(barX, segY, barWidth, segHeight, [5, 5, 0, 0]);
            ctx.fill();
          } else {
            ctx.fillRect(barX, segY, barWidth, segHeight);
          }

          currentBottomY = segY;
        });
      }

      // Bar Border / Glow
      if (isPeak) {
        ctx.strokeStyle = '#F59E0B';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(barX - 1, chartBaselineY - totalBarHeight - 1, barWidth + 2, totalBarHeight + 1, [6, 6, 0, 0]);
        ctx.stroke();

        // Crown / Peak badge above peak bar
        const badgeY = chartBaselineY - totalBarHeight - 26;
        ctx.fillStyle = 'rgba(245, 158, 11, 0.95)';
        ctx.beginPath();
        ctx.roundRect(slotCenterX - 22, badgeY, 44, 20, 10);
        ctx.fill();

        ctx.fillStyle = '#000000';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`★ ${item.total}`, slotCenterX, badgeY + 14);
        ctx.textAlign = 'left';
      } else if (item.total > 0) {
        // Standard count above bar
        ctx.fillStyle = '#E2E8F0';
        ctx.font = 'bold 11px "Inter", "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(String(item.total), slotCenterX, chartBaselineY - totalBarHeight - 7);
        ctx.textAlign = 'left';
      }

      // X-Axis Labels below bar
      ctx.textAlign = 'center';
      ctx.fillStyle = isPeak ? '#F59E0B' : '#E2E8F0';
      ctx.font = isPeak ? 'bold 11px "Inter", sans-serif' : '11px "Inter", sans-serif';
      ctx.fillText(item.label, slotCenterX, chartBaselineY + 18);

      if (item.subLabel) {
        ctx.fillStyle = '#64748B';
        ctx.font = '10px "Inter", sans-serif';
        ctx.fillText(item.subLabel, slotCenterX, chartBaselineY + 31);
      }
      ctx.textAlign = 'left';
    });
  }

  // 7. Bottom Legend
  const legendY = canvasHeight - 34;
  const legendItems = [
    { label: 'DNS Request', color: '#8B5CF6' },
    { label: 'Reserve IP / Fixed Address', color: '#10B981' },
    { label: 'IPAM', color: '#F59E0B' },
    { label: 'DRP / Standby', color: '#EF4444' },
    { label: 'Lainnya', color: '#64748B' },
  ];

  let legendStartX = chartAreaX + 20;
  ctx.font = '11px "Inter", "Segoe UI", Roboto, sans-serif';

  legendItems.forEach(leg => {
    // Circle indicator
    ctx.fillStyle = leg.color;
    ctx.beginPath();
    ctx.arc(legendStartX, legendY + 5, 5, 0, Math.PI * 2);
    ctx.fill();

    // Text label
    ctx.fillStyle = '#CBD5E1';
    ctx.fillText(leg.label, legendStartX + 10, legendY + 9);

    legendStartX += ctx.measureText(leg.label).width + 36;
  });

  // Convert canvas to Base64 PNG
  return canvas.toDataURL('image/png');
}

/**
 * Utility to darken or lighten hex colors
 */
function adjustColor(col: string, amt: number): string {
  let usePound = false;
  let color = col;
  if (color[0] === '#') {
    color = color.slice(1);
    usePound = true;
  }
  const num = parseInt(color, 16);
  let r = (num >> 16) + amt;
  let b = ((num >> 8) & 0x00FF) + amt;
  let g = (num & 0x0000FF) + amt;

  if (r > 255) r = 255;
  else if (r < 0) r = 0;
  if (b > 255) b = 255;
  else if (b < 0) b = 0;
  if (g > 255) g = 255;
  else if (g < 0) g = 0;

  return (usePound ? '#' : '') + (g | (b << 8) | (r << 16)).toString(16).padStart(6, '0');
}
