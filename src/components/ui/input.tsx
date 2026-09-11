import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, inputMode, dir, ...props }, ref) => {
    // Project convention: numeric fields are TYPING-ONLY.
    // Native `type="number"` brings spinner arrows, wheel-stepping and
    // up/down-key stepping that fight manual entry, so every numeric
    // field renders as text with a decimal keypad instead. Values are
    // parsed with Number() by callers and validated by Zod on submit.
    // dir="ltr": digits are always left-to-right data — even on RTL pages —
    // otherwise the caret flips and Backspace/Delete behave backwards.
    const isNumeric = type === "number";
    return (
      <input
        type={isNumeric ? "text" : type}
        inputMode={inputMode ?? (isNumeric ? "decimal" : undefined)}
        dir={dir ?? (isNumeric ? "ltr" : undefined)}
        ref={ref}
        className={cn(
          "flex h-10 w-full rounded-xl border border-input bg-card px-3.5 py-1 text-base shadow-sm transition-all placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm",
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
      className={cn(
        "flex min-h-[80px] w-full rounded-xl border border-input bg-card px-3.5 py-2.5 text-base shadow-sm transition-all placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm",
        className,
      )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export { Input, Textarea };
