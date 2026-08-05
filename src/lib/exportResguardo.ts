import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx-js-style';
import { Empleado, Consigna } from './types';
import logoImg from '@/assets/logo.png';
import { buildStyledSheet, type BuildSheetParams } from './excelStyle';

interface ActivoExport {
  numeroInventario: string;
  descripcion: string;
  marca?: string;
  modelo?: string;
  numeroSerie?: string;
}

interface ExportData {
  responsable: {
    nombre: string;
    nomina?: string;
    departamento?: string;
    puesto?: string;
    tipo: 'empleado' | 'institucion';
  };
  bienes: ActivoExport[];
  tipoActivo?: 1 | 2; // 1 = Bienes Muebles, 2 = Enseres
}


// Formatear fecha en español
const formatearFecha = (): string => {
  const opciones: Intl.DateTimeFormatOptions = { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  };
  return new Date().toLocaleDateString('es-MX', opciones);
};

// Formatear fecha corta para nombre de archivo
const formatearFechaCorta = (): string => {
  const fecha = new Date();
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
};

/**
 * Prepara los parámetros de la hoja de Excel del resguardo (título, meta, filas…).
 * Se usa tanto para generar el archivo descargable como para la vista previa en pantalla.
 */
export const getResguardoExcelSheetParams = (data: ExportData): BuildSheetParams => {
  const { responsable, bienes, tipoActivo = 1 } = data;
  const titulo = tipoActivo === 2 ? 'RESGUARDO DE ENSERES' : 'RESGUARDO DE BIENES PATRIMONIALES';

  const metaPartes = [`Responsable: ${responsable.nombre}`];
  if (responsable.tipo === 'empleado') {
    metaPartes.push(`Nómina: ${responsable.nomina || 'N/A'}`);
    if (responsable.departamento) metaPartes.push(`Departamento: ${responsable.departamento}`);
    if (responsable.puesto) metaPartes.push(`Puesto: ${responsable.puesto}`);
  } else {
    metaPartes.push('Tipo: Institución en Comodato');
  }
  metaPartes.push(`Fecha de emisión: ${formatearFecha()}`);
  metaPartes.push(`Total de bienes: ${bienes.length}`);

  return {
    title: titulo,
    meta: metaPartes.join('  |  '),
    headers: ['#', 'No. Inventario', 'Descripción', 'Marca', 'Modelo', 'Serie'],
    widths: [5, 18, 40, 15, 15, 20],
    rows: bienes.map((bien, index) => [
      index + 1,
      bien.numeroInventario || '',
      bien.descripcion || '',
      bien.marca || '',
      bien.modelo || '',
      bien.numeroSerie || '',
    ]),
    totalRow: [`TOTAL — ${bienes.length} bienes`, '', '', '', '', ''],
  };
};

/**
 * Exportar resguardo a archivo Excel (con diseño de marca)
 */
export const exportarResguardoExcel = (data: ExportData): void => {
  const { responsable } = data;
  const ws = buildStyledSheet(getResguardoExcelSheetParams(data));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Resguardo');

  // Descargar archivo
  const identificador = responsable.nomina || responsable.nombre.replace(/\s+/g, '_');
  XLSX.writeFile(wb, `resguardo_${identificador}_${formatearFechaCorta()}.xlsx`);
};

/** Nombre de archivo sugerido para el Excel del resguardo */
export const getNombreArchivoResguardoExcel = (data: ExportData): string => {
  const identificador = data.responsable.nomina || data.responsable.nombre.replace(/\s+/g, '_');
  return `resguardo_${identificador}_${formatearFechaCorta()}.xlsx`;
};

/** Helper para generar nombre de archivo sugerido */
export const getNombreArchivoResguardo = (nomina: string | undefined, nombre: string, tipo: 'resguardo' | 'incidencias' = 'resguardo'): string => {
  const identificador = nomina || nombre.replace(/\s+/g, '_');
  const prefix = tipo === 'incidencias' ? 'acta_incidencias' : 'resguardo';
  return `${prefix}_${identificador}_${formatearFechaCorta()}.pdf`;
};

/**
 * Exportar resguardo a archivo PDF
 */
export const exportarResguardoPDF = async (data: ExportData): Promise<string> => {
  const { responsable, bienes, tipoActivo = 1 } = data;
  const tituloPDF = tipoActivo === 2 ? 'RESGUARDO DE ENSERES' : 'RESGUARDO DE BIENES PATRIMONIALES';

  // Crear documento PDF (tamaño carta)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;

  // Función para agregar encabezado en cada página
  const addHeader = () => {
    // Logo corporativo (izquierda)
    try {
      doc.addImage(logoImg, 'PNG', margin, 8, 18, 18);
    } catch (e) {
      console.warn('No se pudo cargar el logo corporativo');
    }

    // Título
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(tituloPDF, pageWidth / 2, 20, { align: 'center' });
    
  };

  // Función para agregar pie de página con numeración
  const addPageNumbers = () => {
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Página ${i} de ${totalPages}`,
        pageWidth - margin,
        pageHeight - 10,
        { align: 'right' }
      );
    }
  };

  // Agregar encabezado inicial
  addHeader();

  // Línea separadora
  doc.setDrawColor(200);
  doc.line(margin, 30, pageWidth - margin, 30);

  // Datos del responsable
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('RESPONSABLE:', margin, 40);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  
  let yPos = 48;
  doc.text(`Nombre: ${responsable.nombre}`, margin, yPos);
  
  yPos += 6;
  if (responsable.tipo === 'empleado') {
    doc.text(`Nómina: ${responsable.nomina || 'N/A'}`, margin, yPos);
    yPos += 6;
    if (responsable.departamento) {
      doc.text(`Departamento: ${responsable.departamento}`, margin, yPos);
      yPos += 6;
    }
    if (responsable.puesto) {
      doc.text(`Puesto: ${responsable.puesto}`, margin, yPos);
      yPos += 6;
    }
  } else {
    doc.text('Tipo: Institución en Comodato', margin, yPos);
    yPos += 6;
  }

  // Línea separadora
  yPos += 4;
  doc.line(margin, yPos, pageWidth - margin, yPos);

  // Tabla de bienes
  const tableData = bienes.map((bien, index) => [
    (index + 1).toString(),
    bien.numeroInventario || '',
    bien.descripcion || '',
    bien.marca || '',
    bien.modelo || '',
    bien.numeroSerie || ''
  ]);

  autoTable(doc, {
    startY: yPos + 5,
    head: [['#', 'No. Inventario', 'Descripción', 'Marca', 'Modelo', 'Serie']],
    body: tableData,
    theme: 'grid',
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [59, 130, 246], // Color primario azul
      textColor: 255,
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { cellWidth: 30 },
      2: { cellWidth: 55 },
      3: { cellWidth: 25 },
      4: { cellWidth: 25 },
      5: { cellWidth: 30 },
    },
    margin: { left: margin, right: margin, top: 35 },
    didDrawPage: (data) => {
      // Agregar encabezado en páginas nuevas
      if (data.pageNumber > 1) {
        // Dibujar fondo blanco para cubrir cualquier contenido previo
        doc.setFillColor(255, 255, 255);
        doc.rect(0, 0, pageWidth, 35, 'F');
        addHeader();
      }
    },
  });

  // Obtener posición Y después de la tabla
  const finalY = (doc as any).lastAutoTable.finalY || 150;

  // Verificar si hay espacio para la sección de firmas, si no, nueva página
  if (finalY > pageHeight - 80) {
    doc.addPage();
    addHeader();
  }

  const firmaY = finalY > pageHeight - 80 ? 50 : finalY + 15;

  // Total de bienes y fecha
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Total de bienes: ${bienes.length}`, margin, firmaY);
  doc.setFont('helvetica', 'normal');
  doc.text(`Fecha de emisión: ${formatearFecha()}`, pageWidth - margin, firmaY, { align: 'right' });

  // Línea separadora
  doc.line(margin, firmaY + 8, pageWidth - margin, firmaY + 8);

  // Sección de conformidad
  const conformidadY = firmaY + 18;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('CONFORMIDAD:', margin, conformidadY);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const textoConformidad = 'Las partes que intervienen en la presente revisión firman de conformidad, manifestando que los bienes muebles fueron verificados conforme a las obligaciones inherentes a sus funciones, en apego a la Ley General de Contabilidad Gubernamental y al artículo 55 Bis de la Ley para el Manejo de los Recursos Públicos del Estado de Querétaro, así como demás disposiciones aplicables en materia de control patrimonial.';
  
  const splitText = doc.splitTextToSize(textoConformidad, pageWidth - (margin * 2));
  doc.text(splitText, margin, conformidadY + 8);

  // Sección de firmas
  const firmasY = conformidadY + 35;
  const centroIzq = pageWidth / 4;
  const centroDer = (pageWidth / 4) * 3;

  // Líneas de firma
  doc.line(centroIzq - 35, firmasY, centroIzq + 35, firmasY);
  doc.line(centroDer - 35, firmasY, centroDer + 35, firmasY);

  // Etiquetas de firma
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Responsable del Resguardo', centroIzq, firmasY + 5, { align: 'center' });
  doc.text('Control Patrimonial', centroDer, firmasY + 5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.text('Firma', centroIzq, firmasY + 10, { align: 'center' });
  doc.text('Reviso', centroDer, firmasY + 10, { align: 'center' });

  // Agregar numeración de páginas
  addPageNumbers();

  // Retornar blob URL para preview
  const blob = doc.output("blob");
  return URL.createObjectURL(blob);
};

/**
 * Crear datos de exportación desde empleado
 */
export const crearExportDataEmpleado = (
  empleado: Empleado,
  bienes: ActivoExport[]
): ExportData => ({
  responsable: {
    nombre: empleado.nombre,
    nomina: empleado.nomina,
    departamento: empleado.departamento,
    puesto: empleado.puesto,
    tipo: 'empleado',
  },
  bienes,
});

/**
 * Crear datos de exportación desde institución
 */
export const crearExportDataInstitucion = (
  institucion: Consigna,
  bienes: ActivoExport[]
): ExportData => ({
  responsable: {
    nombre: institucion.nombre,
    tipo: 'institucion',
  },
  bienes,
});

// ============================================
// ACTA DE INCIDENCIAS - REVISIÓN FÍSICA
// ============================================

interface IncidenciasData {
  responsable: {
    nombre: string;
    nomina?: string;
    tipo: 'empleado' | 'institucion';
  };
  fechaRevision: string;
  resumen: {
    esperados: number;
    encontrados: number;
    faltantes: number;
    extranos: number;
  };
  faltantes: Array<{
    numeroInventario: string;
    descripcion?: string;
  }>;
  extranos: Array<{
    numeroInventario: string;
    descripcion?: string;
    responsableActual?: string;
  }>;
}

/**
 * Exportar acta de incidencias a PDF
 */
export const exportarActaIncidenciasPDF = async (data: IncidenciasData): Promise<string> => {
  const { responsable, fechaRevision, resumen, faltantes, extranos } = data;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;

  // Función para agregar encabezado
  const addHeader = () => {
    try {
      doc.addImage(logoImg, 'PNG', margin, 8, 18, 18);
    } catch (e) {
      console.warn('No se pudo cargar el logo corporativo');
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('ACTA DE INCIDENCIAS - REVISIÓN FÍSICA', pageWidth / 2, 18, { align: 'center' });
  };

  // Función para agregar pie de página
  const addPageNumbers = () => {
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Página ${i} de ${totalPages}`,
        pageWidth - margin,
        pageHeight - 10,
        { align: 'right' }
      );
    }
  };

  addHeader();

  // Línea separadora
  doc.setDrawColor(200);
  doc.line(margin, 30, pageWidth - margin, 30);

  // Datos del responsable
  let yPos = 40;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('RESPONSABLE:', margin, yPos);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  yPos += 8;
  doc.text(`Nombre: ${responsable.nombre}`, margin, yPos);

  if (responsable.tipo === 'empleado' && responsable.nomina) {
    yPos += 6;
    doc.text(`Nómina: ${responsable.nomina}`, margin, yPos);
  }

  yPos += 6;
  doc.text(`Fecha de Revisión: ${fechaRevision}`, margin, yPos);

  // Línea separadora
  yPos += 8;
  doc.line(margin, yPos, pageWidth - margin, yPos);

  // Sección de Resumen
  yPos += 10;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('RESUMEN DE LA REVISIÓN:', margin, yPos);

  yPos += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  const resumenData = [
    ['Bienes Esperados:', resumen.esperados.toString()],
    ['Bienes Encontrados:', resumen.encontrados.toString()],
    ['Bienes Faltantes:', resumen.faltantes.toString()],
    ['Bienes Extraños:', resumen.extranos.toString()],
  ];

  resumenData.forEach(([label, value]) => {
    doc.text(label, margin + 5, yPos);
    doc.setFont('helvetica', 'bold');
    doc.text(value, margin + 50, yPos);
    doc.setFont('helvetica', 'normal');
    yPos += 6;
  });

  // Sección de Faltantes
  if (faltantes.length > 0) {
    yPos += 6;
    doc.setDrawColor(200);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 8;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(220, 38, 38); // Rojo
    doc.text(`BIENES FALTANTES (${faltantes.length})`, margin, yPos);
    doc.setTextColor(0, 0, 0);

    const faltantesData = faltantes.map((item, idx) => [
      (idx + 1).toString(),
      item.numeroInventario,
      item.descripcion || '—'
    ]);

    autoTable(doc, {
      startY: yPos + 4,
      head: [['#', 'No. Inventario', 'Descripción']],
      body: faltantesData,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: {
        fillColor: [220, 38, 38],
        textColor: 255,
        fontStyle: 'bold',
        halign: 'center',
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        1: { cellWidth: 35 },
        2: { cellWidth: 'auto' },
      },
      margin: { left: margin, right: margin },
    });

    yPos = (doc as any).lastAutoTable.finalY + 5;
  }

  // Sección de Extraños
  if (extranos.length > 0) {
    // Verificar si hay espacio
    if (yPos > pageHeight - 60) {
      doc.addPage();
      addHeader();
      yPos = 40;
    }

    yPos += 6;
    doc.setDrawColor(200);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 8;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(217, 119, 6); // Ámbar
    doc.text(`BIENES EXTRAÑOS (${extranos.length})`, margin, yPos);
    doc.setTextColor(0, 0, 0);

    const extranosData = extranos.map((item, idx) => [
      (idx + 1).toString(),
      item.numeroInventario,
      item.descripcion || '—',
      item.responsableActual || 'Sin asignar'
    ]);

    autoTable(doc, {
      startY: yPos + 4,
      head: [['#', 'No. Inventario', 'Descripción', 'Responsable Actual']],
      body: extranosData,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: {
        fillColor: [217, 119, 6],
        textColor: 255,
        fontStyle: 'bold',
        halign: 'center',
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        1: { cellWidth: 30 },
        2: { cellWidth: 'auto' },
        3: { cellWidth: 40 },
      },
      margin: { left: margin, right: margin },
    });

    yPos = (doc as any).lastAutoTable.finalY + 5;
  }

  // Verificar espacio para firmas
  if (yPos > pageHeight - 70) {
    doc.addPage();
    addHeader();
    yPos = 40;
  }

  // Sección de Notas
  yPos += 10;
  doc.setDrawColor(200);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 8;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('OBSERVACIONES:', margin, yPos);

  yPos += 5;
  doc.setDrawColor(200);
  doc.setLineDashPattern([2, 2], 0);
  for (let i = 0; i < 3; i++) {
    yPos += 8;
    doc.line(margin, yPos, pageWidth - margin, yPos);
  }
  doc.setLineDashPattern([], 0);

  // Leyenda legal de conformidad
  yPos += 10;
  doc.setDrawColor(200);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 8;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const textoConformidadActa = 'Las partes que intervienen en la presente revisión firman de conformidad, manifestando que los bienes muebles fueron verificados conforme a las obligaciones inherentes a sus funciones, en apego a la Ley General de Contabilidad Gubernamental y al artículo 55 Bis de la Ley para el Manejo de los Recursos Públicos del Estado de Querétaro, así como demás disposiciones aplicables en materia de control patrimonial.';
  const splitConformidad = doc.splitTextToSize(textoConformidadActa, pageWidth - (margin * 2));
  doc.text(splitConformidad, margin, yPos);
  yPos += splitConformidad.length * 5;

  // Sección de Firmas
  yPos += 10;
  const centroIzq = pageWidth / 4;
  const centroDer = (pageWidth / 4) * 3;

  doc.line(centroIzq - 35, yPos, centroIzq + 35, yPos);
  doc.line(centroDer - 35, yPos, centroDer + 35, yPos);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Responsable del Resguardo', centroIzq, yPos + 5, { align: 'center' });
  doc.text('Control Patrimonial', centroDer, yPos + 5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.text('Firma', centroIzq, yPos + 10, { align: 'center' });
  doc.text('Reviso', centroDer, yPos + 10, { align: 'center' });

  addPageNumbers();

  // Retornar blob URL para preview
  const blob = doc.output("blob");
  return URL.createObjectURL(blob);
};
