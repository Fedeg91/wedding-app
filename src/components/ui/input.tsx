import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn("flex min-h-12 w-full rounded-xl border border-stone-200 bg-white px-4 text-base outline-none transition focus:border-rose-400 focus:ring-2 focus:ring-rose-100", className)} {...props} />;
}
