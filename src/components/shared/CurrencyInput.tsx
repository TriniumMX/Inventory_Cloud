import { forwardRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface CurrencyInputProps {
  value?: string | number;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  name?: string;
}

function formatDisplay(raw: string): string {
  if (raw === "" || raw == null) return "";
  const num = Number(raw);
  if (Number.isNaN(num)) return raw;
  return num.toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Input de dinero: prefijo $, agrupa miles con coma al perder el foco, guarda número plano. */
export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  function CurrencyInput(
    { value, onChange, onBlur, placeholder = "0.00", className, disabled, name },
    ref
  ) {
    const [focused, setFocused] = useState(false);
    const rawValue = value === undefined || value === null ? "" : String(value);
    const displayValue = focused ? rawValue : formatDisplay(rawValue);

    return (
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
          $
        </span>
        <Input
          ref={ref}
          name={name}
          type="text"
          inputMode="decimal"
          placeholder={placeholder}
          disabled={disabled}
          className={cn("pl-6", className)}
          value={displayValue}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            onBlur?.();
          }}
          onChange={(e) => {
            let v = e.target.value.replace(/[^0-9.]/g, "");
            const firstDot = v.indexOf(".");
            if (firstDot !== -1) {
              v = v.slice(0, firstDot + 1) + v.slice(firstDot + 1).replace(/\./g, "");
            }
            onChange(v);
          }}
        />
      </div>
    );
  }
);
