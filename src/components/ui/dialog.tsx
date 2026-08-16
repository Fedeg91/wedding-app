"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogTitle = DialogPrimitive.Title;
export const DialogDescription = DialogPrimitive.Description;

export function DialogContent({ className, children, ...props }: React.ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-stone-950/45 backdrop-blur-[2px] data-[state=open]:animate-in" />
      <DialogPrimitive.Content className={cn("fixed inset-x-0 bottom-0 z-50 max-h-[92dvh] rounded-t-[28px] bg-white px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3 shadow-2xl focus:outline-none sm:left-1/2 sm:bottom-1/2 sm:max-w-lg sm:-translate-x-1/2 sm:translate-y-1/2 sm:rounded-[28px] sm:p-6", className)} {...props}>
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-stone-200 sm:hidden" />
        {children}
        <DialogPrimitive.Close className="absolute right-4 top-4 flex size-11 items-center justify-center rounded-full text-stone-500 hover:bg-stone-100" aria-label="Chiudi">
          <X className="size-5" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
