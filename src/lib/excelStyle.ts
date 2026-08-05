import * as XLSX from "xlsx-js-style";

// ============= EXCEL STYLE CONSTANTS =============
export const EXCEL_COLORS = {
  NAVY: "0D1F4E",
  BLUE: "1E40AF",
  BLUE_LIGHT: "DBEAFE",
  ALT: "F1F5F9",
  WHITE: "FFFFFF",
  DARK: "1E293B",
  GRAY: "475569",
  BORDER: "CBD5E1",
};

export interface CellStyleOpts {
  bold?: boolean;
  italic?: boolean;
  sz?: number;
  color?: string;
  bg?: string;
  align?: "left" | "center" | "right";
  border?: boolean;
  wrap?: boolean;
  numFmt?: string;
}

export function cellStyle(opts: CellStyleOpts): object {
  const s: any = {};
  if (opts.color || opts.bold || opts.sz || opts.italic) {
    s.font = { name: "Calibri" };
    if (opts.bold) s.font.bold = true;
    if (opts.italic) s.font.italic = true;
    if (opts.sz) s.font.sz = opts.sz;
    if (opts.color) s.font.color = { rgb: opts.color };
  }
  if (opts.bg) s.fill = { patternType: "solid", fgColor: { rgb: opts.bg } };
  s.alignment = { horizontal: opts.align ?? "left", vertical: "center" };
  if (opts.wrap) s.alignment.wrapText = true;
  if (opts.border) {
    const b = { style: "thin", color: { rgb: EXCEL_COLORS.BORDER } };
    s.border = { top: b, bottom: b, left: b, right: b };
  }
  if (opts.numFmt) s.numFmt = opts.numFmt;
  return s;
}

export interface BuildSheetParams {
  title: string;
  subtitle?: string;
  meta: string;
  headers: string[];
  widths: number[];
  rows: (string | number | null)[][];
  currencyCols?: number[];
  totalRow?: (string | number | null)[];
  /** Color de tema (hex sin #) para título/encabezado — por defecto EXCEL_COLORS.BLUE. */
  themeColor?: string;
  /** Tinte claro del tema (hex sin #) para la fila de metadatos — por defecto EXCEL_COLORS.BLUE_LIGHT. */
  themeLight?: string;
}

/** Colores de tema por reporte, alineados con el color de acento de su card en pantalla. */
export const REPORT_THEMES = {
  blue: { main: "2563EB", light: "EFF6FF" },
  orange: { main: "EA580C", light: "FFF7ED" },
  green: { main: "16A34A", light: "F0FDF4" },
  purple: { main: "9333EA", light: "FAF5FF" },
} as const;

/** Construye una hoja de Excel con encabezado de marca, título, filas con bandas y fila de total. */
export function buildStyledSheet(params: BuildSheetParams): any {
  const { title, subtitle, meta, headers, widths, rows, currencyCols = [], totalRow, themeColor, themeLight } = params;
  const C = EXCEL_COLORS;
  const headerColor = themeColor ?? C.BLUE;
  const metaColor = themeLight ?? C.BLUE_LIGHT;
  const nc = headers.length;
  const ws: any = {};
  let r = 0;

  const fillRow = (text: string, style: object) => {
    ws[XLSX.utils.encode_cell({ r, c: 0 })] = { v: text, t: "s", s: style };
    for (let c = 1; c < nc; c++)
      ws[XLSX.utils.encode_cell({ r, c })] = { v: "", t: "s", s: cellStyle({ bg: (style as any).fill?.fgColor?.rgb }) };
    r++;
  };

  // Institution
  fillRow(
    import.meta.env.VITE_ORG_NAME || "Inventory Cloud",
    cellStyle({ bold: true, sz: 13, color: C.WHITE, bg: C.NAVY, align: "center" })
  );
  // Title
  fillRow(title, cellStyle({ bold: true, sz: 11, color: C.WHITE, bg: headerColor, align: "center" }));
  // Subtitle
  if (subtitle) fillRow(subtitle, cellStyle({ sz: 10, color: C.WHITE, bg: headerColor, align: "center" }));
  // Meta
  fillRow(meta, cellStyle({ sz: 9, color: C.DARK, bg: metaColor, align: "center" }));
  // Empty separator
  for (let c = 0; c < nc; c++) ws[XLSX.utils.encode_cell({ r, c })] = { v: "", t: "s", s: cellStyle({ bg: C.WHITE }) };
  r++;

  // Headers
  headers.forEach(
    (h, c) =>
      (ws[XLSX.utils.encode_cell({ r, c })] = {
        v: h,
        t: "s",
        s: cellStyle({ bold: true, sz: 9, color: C.WHITE, bg: headerColor, align: "center", border: true }),
      })
  );
  r++;

  // Data rows
  rows.forEach((row, ri) => {
    const bg = ri % 2 === 1 ? C.ALT : C.WHITE;
    row.forEach((val, c) => {
      const isCur = currencyCols.includes(c);
      const isNum = typeof val === "number";
      if (isNum) {
        ws[XLSX.utils.encode_cell({ r, c })] = {
          v: val,
          t: "n",
          s: cellStyle({ sz: 9, bg, align: "right", border: true, numFmt: isCur ? "#,##0.00" : "#,##0.##" }),
        };
      } else {
        ws[XLSX.utils.encode_cell({ r, c })] = {
          v: val ?? "",
          t: "s",
          s: cellStyle({ sz: 9, bg, align: "left", border: true }),
        };
      }
    });
    r++;
  });

  // Totals row
  if (totalRow) {
    totalRow.forEach((val, c) => {
      const isCur = currencyCols.includes(c);
      const isNum = typeof val === "number";
      if (isNum) {
        ws[XLSX.utils.encode_cell({ r, c })] = {
          v: val,
          t: "n",
          s: cellStyle({ bold: true, sz: 9, color: C.WHITE, bg: C.NAVY, align: "right", border: true, numFmt: isCur ? "#,##0.00" : undefined }),
        };
      } else {
        ws[XLSX.utils.encode_cell({ r, c })] = {
          v: val ?? "",
          t: "s",
          s: cellStyle({ bold: true, sz: 9, color: C.WHITE, bg: C.NAVY, align: "left", border: true }),
        };
      }
    });
    r++;
  }

  ws["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: r - 1, c: nc - 1 } });
  ws["!cols"] = widths.map((w) => ({ wch: w }));
  ws["!rows"] = Array.from({ length: r }, (_, i) => ({ hpx: i === 0 ? 28 : i === 1 ? 24 : 20 }));

  const metaRow = subtitle ? 3 : 2;
  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: nc - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: nc - 1 } },
    ...(subtitle ? [{ s: { r: 2, c: 0 }, e: { r: 2, c: nc - 1 } }] : []),
    { s: { r: metaRow, c: 0 }, e: { r: metaRow, c: nc - 1 } },
  ];

  return ws;
}
