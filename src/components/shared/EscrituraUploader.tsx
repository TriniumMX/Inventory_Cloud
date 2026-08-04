import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { FileText, Upload, Eye, Trash2, CheckCircle, AlertCircle } from "lucide-react";
import { uploadEscritura, deleteEscritura, getEscrituraSignedUrl } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface EscrituraUploaderProps {
  inmuebleId: number | null;
  numeroInventario: string;
  escrituraUrl?: string | null;
  onUploadSuccess: (url: string) => void;
  onDeleteSuccess: () => void;
  disabled?: boolean;
}

export function EscrituraUploader({
  inmuebleId,
  numeroInventario,
  escrituraUrl,
  onUploadSuccess,
  onDeleteSuccess,
  disabled = false,
}: EscrituraUploaderProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validaciones
    if (file.type !== "application/pdf") {
      toast({
        title: "Formato no válido",
        description: "Solo se permiten archivos PDF",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Archivo muy grande",
        description: "El tamaño máximo permitido es 10 MB",
        variant: "destructive",
      });
      return;
    }

    if (!inmuebleId) {
      toast({
        title: "Error",
        description: "Debe guardar el inmueble primero antes de subir la escritura",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setProgress(20);

    try {
      setProgress(50);
      const url = await uploadEscritura(inmuebleId, numeroInventario, file);
      setProgress(100);
      
      toast({
        title: "Escritura subida",
        description: "El archivo PDF se ha subido correctamente",
      });
      
      onUploadSuccess(url);
    } catch (error) {
      toast({
        title: "Error al subir",
        description: error instanceof Error ? error.message : "No se pudo subir el archivo",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleView = async () => {
    if (!escrituraUrl) return;

    try {
      const signedUrl = await getEscrituraSignedUrl(escrituraUrl);
      window.open(signedUrl, "_blank");
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo abrir el archivo",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!inmuebleId || !escrituraUrl) return;

    setDeleting(true);
    try {
      await deleteEscritura(inmuebleId, escrituraUrl);
      toast({
        title: "Escritura eliminada",
        description: "El archivo PDF se ha eliminado correctamente",
      });
      onDeleteSuccess();
    } catch (error) {
      toast({
        title: "Error al eliminar",
        description: error instanceof Error ? error.message : "No se pudo eliminar el archivo",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const getFileName = () => {
    if (escrituraUrl) {
      return escrituraUrl.split("/").pop() || "escritura.pdf";
    }
    return null;
  };

  return (
    <div className="space-y-3">
      <Label className="flex items-center gap-2">
        <FileText className="h-4 w-4" />
        Archivo de Escritura (PDF)
      </Label>

      <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
        {/* Input de archivo oculto */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          className="hidden"
          onChange={handleFileSelect}
          disabled={disabled || uploading}
        />

        {/* Estado: Sin archivo */}
        {!escrituraUrl && !uploading && (
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="rounded-full bg-muted p-3">
              <Upload className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground text-center">
              {inmuebleId 
                ? "Selecciona un archivo PDF (máx. 10 MB)"
                : "Guarda el inmueble primero para poder subir la escritura"
              }
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || !inmuebleId}
            >
              <Upload className="h-4 w-4 mr-2" />
              Seleccionar archivo
            </Button>
          </div>
        )}

        {/* Estado: Subiendo */}
        {uploading && (
          <div className="space-y-3 py-4">
            <div className="flex items-center justify-center gap-2">
              <Upload className="h-5 w-5 animate-pulse text-primary" />
              <span className="text-sm">Subiendo archivo...</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Estado: Archivo subido */}
        {escrituraUrl && !uploading && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="h-4 w-4 text-primary" />
              <span className="font-medium truncate">{getFileName()}</span>
            </div>
            
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleView}
                disabled={disabled}
              >
                <Eye className="h-4 w-4 mr-2" />
                Ver PDF
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDelete}
                disabled={disabled || deleting}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {deleting ? "Eliminando..." : "Eliminar"}
              </Button>
            </div>

            {/* Opción para reemplazar */}
            <div className="pt-2 border-t">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled}
                className="text-xs"
              >
                <Upload className="h-3 w-3 mr-1" />
                Reemplazar archivo
              </Button>
            </div>
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground flex items-center gap-1">
        <AlertCircle className="h-3 w-3" />
        Solo archivos PDF, tamaño máximo 10 MB
      </p>
    </div>
  );
}
