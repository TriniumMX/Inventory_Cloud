/**
 * Convierte milímetros a píxeles según DPI
 * @param mm - Milímetros
 * @param dpi - DPI (dots per inch)
 * @returns Píxeles redondeados
 */
export function mmToPx(mm: number, dpi: number): number {
  return Math.round((mm / 25.4) * dpi);
}

/**
 * Preferencias de impresión de etiquetas
 */
export interface LabelPreferences {
  dpi: 203 | 300;
  showQr: boolean;
  showBarcodeText: boolean;
  copies: number;
}

const STORAGE_KEY = "labels:prefs";

/**
 * Obtiene las preferencias guardadas o valores por defecto
 */
export function getLabelPreferences(): LabelPreferences {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        dpi: parsed.dpi === 300 ? 300 : 203,
        showQr: parsed.showQr !== false,
        showBarcodeText: parsed.showBarcodeText !== false,
        copies: Math.max(1, Math.min(10, parseInt(parsed.copies) || 1)),
      };
    }
  } catch (error) {
    console.warn("Error loading label preferences:", error);
  }

  return {
    dpi: 203,
    showQr: true,
    showBarcodeText: true,
    copies: 1,
  };
}

/**
 * Guarda las preferencias de impresión
 */
export function saveLabelPreferences(prefs: LabelPreferences): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch (error) {
    console.warn("Error saving label preferences:", error);
  }
}
