import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-rose-500 text-white shadow-sm hover:bg-rose-600",
        outline: "border border-stone-200 bg-white text-stone-700 hover:bg-stone-50",
        ghost: "text-stone-600 hover:bg-stone-100",
      },
      size: { default: "px-5 py-2.5", sm: "min-h-9 px-3 py-1 text-xs", icon: "size-11 p-0" },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export function Button({ className, variant, size, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>) {
  return <button className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}
