import { Badge } from "@/components/ui/badge";
import { AlertCircle } from "lucide-react";

export function DemoBadge() {
  return (
    <Badge variant="outline" className="border-secondary text-secondary">
      <AlertCircle className="mr-1 h-3 w-3" />
      Modo Demo
    </Badge>
  );
}
