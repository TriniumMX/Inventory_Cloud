import * as XLSX from "xlsx-js-style";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoImg from "@/assets/logo.png";
import { buildStyledSheet } from "./excelStyle";

// ============= INTERFACES =============
export interface ActivoReporte {
  numeroInventario: string;
  descripcion: string;
  marca?: string;
  modelo?: string;
  serie?: string;
  fechaFactura?: string;
  fechaAlta?: string;
  costo: number;
  folioFactura?: string;
  observaciones?: string;
  resguardatario?: string;
  clasificacion?: string;
}

export interface InmuebleReporte {
  numeroInventario: string;
  nombre?: string;
  descripcion?: string;
  tipoNombre?: string;
  direccion: string;
  colonia?: string;
  municipio?: string;
  superficieTerreno?: number;
  superficieConstruccion?: number;
  numeroEscritura?: string;
  fechaEscritura?: string;
  notaria?: string;
  claveCatastral?: string;
  valorCatastral?: number;
  valorComercial?: number;
  costoAdquisicion?: number;
  fechaAdquisicion?: string;
  responsableNomina?: string;
}

// ============= HELPERS =============
function formatDate(dateStr?: string): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  } catch { return ""; }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 2 }).format(amount);
}

function truncateText(text: string | undefined, maxLength: number): string {
  if (!text) return "";
  return text.length > maxLength ? text.substring(0, maxLength - 3) + "..." : text;
}

// ============= PDF HEADER HELPER =============
function pdfHeader(doc: jsPDF, title: string, subtitle: string, total: number, pageWidth: number, margin: number): void {
  const pageHeight = doc.internal.pageSize.getHeight();
  try { doc.addImage(logoImg, "PNG", pageWidth - margin - 18, 5, 18, 18); } catch { /* logo opcional */ }
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(title, pageWidth / 2, 11, { align: "center" });
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(subtitle, pageWidth / 2, 17, { align: "center" });
  doc.text(`Total: ${total} registros`, pageWidth / 2, 23, { align: "center" });
  const pg = doc.getCurrentPageInfo().pageNumber;
  const total_pgs = doc.getNumberOfPages();
  doc.setFontSize(7);
  doc.text(`Página ${pg} de ${total_pgs}`, pageWidth / 2, pageHeight - 4, { align: "center" });
}

const PDF_HEAD_STYLE = { fillColor: [13, 31, 78] as [number, number, number], textColor: 255 as number, fontStyle: "bold" as const, fontSize: 7 };
const PDF_ALT = { fillColor: [241, 245, 249] as [number, number, number] };

// ============= INVENTARIO GENERAL =============
export function exportarInventarioGeneralExcel(items: ActivoReporte[]): void {
  const total = items.reduce((s, i) => s + (i.costo || 0), 0);
  const fecha = new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });

  const ws = buildStyledSheet({
    title: "INVENTARIO GENERAL DE BIENES MUEBLES Y ENSERES",
    meta: `Fecha de generación: ${fecha}  |  Total de bienes: ${items.length}  |  Valor total: ${formatCurrency(total)}`,
    headers: ["No. Inventario", "Descripción", "Marca", "Modelo", "Serie", "F. Factura", "F. Alta", "Costo (MXN)", "Folio Factura", "Observaciones", "Resguardatario"],
    widths: [20, 42, 15, 15, 20, 13, 13, 16, 16, 32, 25],
    rows: items.map(i => [
      i.numeroInventario || "", i.descripcion || "", i.marca || "", i.modelo || "",
      i.serie || "", formatDate(i.fechaFactura), formatDate(i.fechaAlta),
      i.costo || 0, i.folioFactura || "", i.observaciones || "", i.resguardatario || "",
    ]),
    currencyCols: [7],
    totalRow: [`TOTAL — ${items.length} bienes`, "", "", "", "", "", "", total, "", "", ""],
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Inventario General");
  XLSX.writeFile(wb, `Inventario_General_${new Date().toISOString().split("T")[0]}.xlsx`);
}

export async function exportarInventarioGeneralPDF(items: ActivoReporte[]): Promise<string> {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "letter" });
  const pw = doc.internal.pageSize.getWidth();
  const m = 10;
  const fecha = new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });
  const total = items.reduce((s, i) => s + (i.costo || 0), 0);

  autoTable(doc, {
    head: [["No. Inventario", "Descripción", "Marca", "Modelo", "Serie", "F. Factura", "F. Alta", "Costo", "Folio Fact.", "Observaciones", "Resguardatario"]],
    body: items.map(i => [
      i.numeroInventario || "", truncateText(i.descripcion, 35), i.marca || "", i.modelo || "",
      i.serie || "", formatDate(i.fechaFactura), formatDate(i.fechaAlta),
      formatCurrency(i.costo || 0), i.folioFactura || "", truncateText(i.observaciones, 22), i.resguardatario || "",
    ]),
    startY: 30, margin: { left: m, right: m },
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: PDF_HEAD_STYLE,
    columnStyles: {
      0: { cellWidth: 22 }, 1: { cellWidth: 38 }, 2: { cellWidth: 17 }, 3: { cellWidth: 17 },
      4: { cellWidth: 20 }, 5: { cellWidth: 18 }, 6: { cellWidth: 18 },
      7: { cellWidth: 20, halign: "right" }, 8: { cellWidth: 17 }, 9: { cellWidth: 30 }, 10: { cellWidth: 25 },
    },
    alternateRowStyles: PDF_ALT,
    didDrawPage: () => pdfHeader(doc, "INVENTARIO GENERAL DE BIENES MUEBLES Y ENSERES", `Fecha de generación: ${fecha}`, items.length, pw, m),
  });

  const finalY = (doc as any).lastAutoTable.finalY || 30;
  const ph = doc.internal.pageSize.getHeight();
  if (finalY + 22 < ph - 15) {
    doc.setFontSize(9); doc.setFont("helvetica", "bold");
    doc.text(`TOTAL DE BIENES: ${items.length}   |   VALOR TOTAL: ${formatCurrency(total)}`, m, finalY + 10);
  }

  return URL.createObjectURL(doc.output("blob"));
}

// ============= BIENES SIN ASIGNAR =============
export function exportarBienesSinAsignarExcel(items: ActivoReporte[]): void {
  const total = items.reduce((s, i) => s + (i.costo || 0), 0);
  const fecha = new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });

  const ws = buildStyledSheet({
    title: "BIENES MUEBLES Y ENSERES SIN RESGUARDATARIO ASIGNADO",
    meta: `Fecha de generación: ${fecha}  |  Total de bienes: ${items.length}  |  Valor total: ${formatCurrency(total)}`,
    headers: ["No. Inventario", "Descripción", "Marca", "Modelo", "Serie", "Fecha de Alta", "Costo (MXN)", "Clasificación", "Observaciones"],
    widths: [20, 42, 15, 15, 20, 13, 16, 22, 32],
    rows: items.map(i => [
      i.numeroInventario || "", i.descripcion || "", i.marca || "", i.modelo || "",
      i.serie || "", formatDate(i.fechaAlta), i.costo || 0, i.clasificacion || "", i.observaciones || "",
    ]),
    currencyCols: [6],
    totalRow: [`TOTAL — ${items.length} bienes`, "", "", "", "", "", total, "", ""],
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sin Asignar");
  XLSX.writeFile(wb, `Bienes_Sin_Asignar_${new Date().toISOString().split("T")[0]}.xlsx`);
}

export async function exportarBienesSinAsignarPDF(items: ActivoReporte[]): Promise<string> {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "letter" });
  const pw = doc.internal.pageSize.getWidth();
  const m = 10;
  const fecha = new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });
  const total = items.reduce((s, i) => s + (i.costo || 0), 0);

  autoTable(doc, {
    head: [["No. Inventario", "Descripción", "Marca", "Modelo", "Serie", "F. Alta", "Costo", "Clasificación", "Observaciones"]],
    body: items.map(i => [
      i.numeroInventario || "", truncateText(i.descripcion, 40), i.marca || "", i.modelo || "",
      i.serie || "", formatDate(i.fechaAlta), formatCurrency(i.costo || 0), i.clasificacion || "", truncateText(i.observaciones, 28),
    ]),
    startY: 30, margin: { left: m, right: m },
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: PDF_HEAD_STYLE,
    columnStyles: {
      0: { cellWidth: 24 }, 1: { cellWidth: 46 }, 2: { cellWidth: 20 }, 3: { cellWidth: 20 },
      4: { cellWidth: 22 }, 5: { cellWidth: 20 }, 6: { cellWidth: 22, halign: "right" }, 7: { cellWidth: 25 }, 8: { cellWidth: 38 },
    },
    alternateRowStyles: PDF_ALT,
    didDrawPage: () => pdfHeader(doc, "BIENES SIN RESGUARDATARIO ASIGNADO", `Fecha de generación: ${fecha}`, items.length, pw, m),
  });

  const finalY = (doc as any).lastAutoTable.finalY || 30;
  const ph = doc.internal.pageSize.getHeight();
  if (finalY + 22 < ph - 15) {
    doc.setFontSize(9); doc.setFont("helvetica", "bold");
    doc.text(`TOTAL DE BIENES: ${items.length}   |   VALOR TOTAL: ${formatCurrency(total)}`, m, finalY + 10);
  }

  return URL.createObjectURL(doc.output("blob"));
}

// ============= ALTAS POR FECHA =============
export function exportarAltasPorFechaExcel(items: ActivoReporte[], fechaInicio: string, fechaFin: string): void {
  const total = items.reduce((s, i) => s + (i.costo || 0), 0);
  const fecha = new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });

  const ws = buildStyledSheet({
    title: "ALTAS DE BIENES MUEBLES Y ENSERES POR FECHA",
    subtitle: `Período: ${fechaInicio} al ${fechaFin}`,
    meta: `Fecha de generación: ${fecha}  |  Total de bienes: ${items.length}  |  Valor total: ${formatCurrency(total)}`,
    headers: ["No. Inventario", "Descripción", "Marca", "Modelo", "Serie", "Fecha de Alta", "Costo (MXN)", "Clasificación", "Observaciones"],
    widths: [20, 42, 15, 15, 20, 13, 16, 22, 32],
    rows: items.map(i => [
      i.numeroInventario || "", i.descripcion || "", i.marca || "", i.modelo || "",
      i.serie || "", formatDate(i.fechaAlta), i.costo || 0, i.clasificacion || "", i.observaciones || "",
    ]),
    currencyCols: [6],
    totalRow: [`TOTAL — ${items.length} bienes`, "", "", "", "", "", total, "", ""],
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Altas por Fecha");
  XLSX.writeFile(wb, `Altas_Bienes_${fechaInicio}_a_${fechaFin}.xlsx`);
}

export async function exportarAltasPorFechaPDF(items: ActivoReporte[], fechaInicio: string, fechaFin: string): Promise<string> {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "letter" });
  const pw = doc.internal.pageSize.getWidth();
  const m = 10;
  const fecha = new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });
  const total = items.reduce((s, i) => s + (i.costo || 0), 0);

  autoTable(doc, {
    head: [["No. Inventario", "Descripción", "Marca", "Modelo", "Serie", "F. Alta", "Costo", "Clasificación", "Observaciones"]],
    body: items.map(i => [
      i.numeroInventario || "", truncateText(i.descripcion, 40), i.marca || "", i.modelo || "",
      i.serie || "", formatDate(i.fechaAlta), formatCurrency(i.costo || 0), i.clasificacion || "", truncateText(i.observaciones, 28),
    ]),
    startY: 35, margin: { left: m, right: m },
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: PDF_HEAD_STYLE,
    columnStyles: {
      0: { cellWidth: 24 }, 1: { cellWidth: 46 }, 2: { cellWidth: 20 }, 3: { cellWidth: 20 },
      4: { cellWidth: 22 }, 5: { cellWidth: 20 }, 6: { cellWidth: 22, halign: "right" }, 7: { cellWidth: 25 }, 8: { cellWidth: 38 },
    },
    alternateRowStyles: PDF_ALT,
    didDrawPage: () => {
      pdfHeader(doc, "ALTAS DE BIENES MUEBLES Y ENSERES", `Del ${fechaInicio} al ${fechaFin}  |  Generado: ${fecha}`, items.length, pw, m);
    },
  });

  const finalY = (doc as any).lastAutoTable.finalY || 35;
  const ph = doc.internal.pageSize.getHeight();
  if (finalY + 22 < ph - 15) {
    doc.setFontSize(9); doc.setFont("helvetica", "bold");
    doc.text(`TOTAL DE BIENES: ${items.length}   |   VALOR TOTAL: ${formatCurrency(total)}`, m, finalY + 10);
  }

  return URL.createObjectURL(doc.output("blob"));
}

// ============= BIENES INMUEBLES =============
export function exportarInmueblesExcel(items: InmuebleReporte[]): void {
  const totalValorCatastral = items.reduce((s, i) => s + (i.valorCatastral || 0), 0);
  const totalCosto = items.reduce((s, i) => s + (i.costoAdquisicion || 0), 0);
  const fecha = new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });

  const ws = buildStyledSheet({
    title: "INVENTARIO DE BIENES INMUEBLES",
    meta: `Fecha de generación: ${fecha}  |  Total de inmuebles: ${items.length}  |  Valor catastral total: ${formatCurrency(totalValorCatastral)}`,
    headers: [
      "No. Inventario", "Nombre", "Tipo", "Dirección", "Colonia", "Municipio",
      "Sup. Terreno m²", "Sup. Const. m²", "No. Escritura", "Fecha Escritura",
      "Notaría", "Clave Catastral", "Valor Catastral", "Valor Comercial", "Costo Adq.", "Responsable",
    ],
    widths: [16, 28, 18, 38, 18, 16, 14, 14, 16, 14, 22, 16, 16, 16, 16, 22],
    rows: items.map(i => [
      i.numeroInventario || "", i.nombre || i.descripcion || "", i.tipoNombre || "",
      i.direccion || "", i.colonia || "", i.municipio || "",
      i.superficieTerreno ?? "", i.superficieConstruccion ?? "",
      i.numeroEscritura || "", formatDate(i.fechaEscritura), i.notaria || "",
      i.claveCatastral || "",
      typeof i.valorCatastral === "number" ? i.valorCatastral : "",
      typeof i.valorComercial === "number" ? i.valorComercial : "",
      typeof i.costoAdquisicion === "number" ? i.costoAdquisicion : "",
      i.responsableNomina || "",
    ]),
    currencyCols: [12, 13, 14],
    totalRow: [
      `TOTAL — ${items.length} inmuebles`, "", "", "", "", "", "", "",
      "", "", "", "", totalValorCatastral, "", totalCosto, "",
    ],
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Bienes Inmuebles");
  XLSX.writeFile(wb, `Bienes_Inmuebles_${new Date().toISOString().split("T")[0]}.xlsx`);
}

export async function exportarInmueblesPDF(items: InmuebleReporte[]): Promise<string> {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "letter" });
  const pw = doc.internal.pageSize.getWidth();
  const m = 8;
  const fecha = new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });
  const totalValor = items.reduce((s, i) => s + (i.valorCatastral || 0), 0);

  autoTable(doc, {
    head: [[
      "No. Inventario", "Nombre / Descripción", "Tipo", "Dirección", "Municipio",
      "Sup. Const. m²", "No. Escritura", "Clave Catastral", "Valor Catastral", "Responsable",
    ]],
    body: items.map(i => [
      i.numeroInventario || "",
      truncateText(i.nombre || i.descripcion, 30),
      i.tipoNombre || "",
      truncateText(i.direccion, 35),
      i.municipio || "",
      i.superficieConstruccion ? i.superficieConstruccion.toLocaleString("es-MX") : "—",
      i.numeroEscritura || "—",
      i.claveCatastral || "—",
      formatCurrency(i.valorCatastral || 0),
      i.responsableNomina || "—",
    ]),
    startY: 30, margin: { left: m, right: m },
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: PDF_HEAD_STYLE,
    columnStyles: {
      0: { cellWidth: 22 }, 1: { cellWidth: 38 }, 2: { cellWidth: 20 }, 3: { cellWidth: 42 },
      4: { cellWidth: 22 }, 5: { cellWidth: 18, halign: "right" }, 6: { cellWidth: 20 },
      7: { cellWidth: 22 }, 8: { cellWidth: 22, halign: "right" }, 9: { cellWidth: 22 },
    },
    alternateRowStyles: PDF_ALT,
    didDrawPage: () => pdfHeader(doc, "INVENTARIO DE BIENES INMUEBLES", `Fecha de generación: ${fecha}`, items.length, pw, m),
  });

  const finalY = (doc as any).lastAutoTable.finalY || 30;
  const ph = doc.internal.pageSize.getHeight();
  if (finalY + 22 < ph - 15) {
    doc.setFontSize(9); doc.setFont("helvetica", "bold");
    doc.text(`TOTAL DE INMUEBLES: ${items.length}   |   VALOR CATASTRAL TOTAL: ${formatCurrency(totalValor)}`, m, finalY + 10);
  }

  return URL.createObjectURL(doc.output("blob"));
}
