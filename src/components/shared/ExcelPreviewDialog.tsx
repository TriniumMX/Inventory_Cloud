import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { EXCEL_COLORS, type BuildSheetParams } from "@/lib/excelStyle";

interface ExcelPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileName: string;
  sheetParams: BuildSheetParams | null;
  onDownload: () => void;
}

/** Vista previa en pantalla del Excel con diseño (colores/encabezado), antes de descargar. */
export function ExcelPreviewDialog({
  open,
  onOpenChange,
  fileName,
  sheetParams,
  onDownload,
}: ExcelPreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[95vw] h-[90vh] flex flex-col">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <DialogTitle className="text-lg">Previsualización: {fileName}</DialogTitle>
          <div className="flex gap-2">
            <Button size="sm" onClick={onDownload}>
              <Download className="h-4 w-4 mr-1" />
              Descargar
            </Button>
          </div>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-auto rounded-md border bg-slate-100 p-4">
          {sheetParams && <ExcelPreviewTable {...sheetParams} />}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ExcelPreviewTable({
  title,
  subtitle,
  meta,
  headers,
  rows,
  currencyCols = [],
  totalRow,
  themeColor,
  themeLight,
}: BuildSheetParams) {
  const nc = headers.length;
  const orgName = import.meta.env.VITE_ORG_NAME || "Inventory Cloud";
  const headerColor = themeColor ?? EXCEL_COLORS.BLUE;
  const metaColor = themeLight ?? EXCEL_COLORS.BLUE_LIGHT;

  const currencyFmt = (v: number) =>
    v.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const numberFmt = (v: number) => v.toLocaleString("es-MX", { maximumFractionDigits: 2 });

  return (
    <table
      className="w-full border-collapse bg-white shadow-sm text-[13px]"
      style={{ fontFamily: "Calibri, Arial, sans-serif" }}
    >
      <tbody>
        <tr>
          <td
            colSpan={nc}
            className="text-center font-bold px-2 py-2.5"
            style={{ backgroundColor: `#${EXCEL_COLORS.NAVY}`, color: "#fff", fontSize: 16 }}
          >
            {orgName}
          </td>
        </tr>
        <tr>
          <td
            colSpan={nc}
            className="text-center font-bold px-2 py-2"
            style={{ backgroundColor: `#${headerColor}`, color: "#fff", fontSize: 14 }}
          >
            {title}
          </td>
        </tr>
        {subtitle && (
          <tr>
            <td
              colSpan={nc}
              className="text-center px-2 py-1.5"
              style={{ backgroundColor: `#${headerColor}`, color: "#fff", fontSize: 12 }}
            >
              {subtitle}
            </td>
          </tr>
        )}
        <tr>
          <td
            colSpan={nc}
            className="text-center px-2 py-1.5"
            style={{ backgroundColor: `#${metaColor}`, color: `#${EXCEL_COLORS.DARK}`, fontSize: 11 }}
          >
            {meta}
          </td>
        </tr>
        <tr>
          <td colSpan={nc} style={{ height: 8 }} />
        </tr>
        <tr>
          {headers.map((h, i) => (
            <th
              key={i}
              className="text-center font-bold px-2 py-1.5 border"
              style={{ backgroundColor: `#${headerColor}`, color: "#fff", borderColor: `#${EXCEL_COLORS.BORDER}` }}
            >
              {h}
            </th>
          ))}
        </tr>
        {rows.map((row, ri) => (
          <tr key={ri} style={{ backgroundColor: ri % 2 === 1 ? `#${EXCEL_COLORS.ALT}` : "#fff" }}>
            {row.map((val, ci) => {
              const isNum = typeof val === "number";
              const isCur = currencyCols.includes(ci);
              return (
                <td
                  key={ci}
                  className="px-2 py-1 border"
                  style={{
                    borderColor: `#${EXCEL_COLORS.BORDER}`,
                    textAlign: isNum ? "right" : "left",
                  }}
                >
                  {isNum ? (isCur ? currencyFmt(val as number) : numberFmt(val as number)) : (val ?? "")}
                </td>
              );
            })}
          </tr>
        ))}
        {totalRow && (
          <tr style={{ backgroundColor: `#${EXCEL_COLORS.NAVY}`, color: "#fff", fontWeight: "bold" }}>
            {totalRow.map((val, ci) => {
              const isNum = typeof val === "number";
              const isCur = currencyCols.includes(ci);
              return (
                <td
                  key={ci}
                  className="px-2 py-1.5 border"
                  style={{ borderColor: `#${EXCEL_COLORS.BORDER}`, textAlign: isNum ? "right" : "left" }}
                >
                  {isNum ? (isCur ? currencyFmt(val as number) : numberFmt(val as number)) : (val ?? "")}
                </td>
              );
            })}
          </tr>
        )}
      </tbody>
    </table>
  );
}
