import * as SheetPrimitive from "@radix-ui/react-dialog";
import { ArrowLeft } from "lucide-react";

import * as React from "react";

import { cn } from "@/lib/utils";
import { BottomNav } from "@/components/layout/BottomNav";

const Sheet = SheetPrimitive.Root;

const SheetTrigger = SheetPrimitive.Trigger;

const SheetClose = SheetPrimitive.Close;

const SheetPortal = SheetPrimitive.Portal;

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>>(
  ({ className, ...props }, ref) =>
  <SheetPrimitive.Overlay
    className={cn(
      "fixed inset-0 z-50 bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
    ref={ref} />

);
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName;

interface SheetContentProps extends
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content> {
  side?: "top" | "bottom" | "left" | "right";
}

const SheetContent = React.forwardRef<React.ElementRef<typeof SheetPrimitive.Content>, SheetContentProps>(
  ({ side: _side, className, children, ...props }, ref) =>
  <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content
        ref={ref}
        className={cn(
          "fixed inset-0 z-50 flex flex-col w-full h-full bg-background duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
          className
        )}
        {...props}>

        {/* Fullscreen header with back button */}
        <div className="sticky top-0 z-10 border-b border-border/70 bg-background/95 backdrop-blur-xl shrink-0">
          <div className="flex h-14 items-center gap-3 px-4">
            <SheetPrimitive.Close className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors shrink-0">
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">Back</span>
            </SheetPrimitive.Close>
          </div>
        </div>

        {/* Scrollable content area with bottom nav padding */}
        <div className="flex-1 overflow-y-auto px-4 py-4 pb-[calc(5rem+env(safe-area-inset-bottom))]">
          {children}
        </div>

        {/* Persistent bottom nav */}
        <BottomNav />
      </SheetPrimitive.Content>
    </SheetPortal>

);
SheetContent.displayName = SheetPrimitive.Content.displayName;

const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) =>
<div className={cn("flex flex-col space-y-2 text-center sm:text-left", className)} {...props} />;

SheetHeader.displayName = "SheetHeader";

const SheetFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) =>
<div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} {...props} />;

SheetFooter.displayName = "SheetFooter";

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>>(
  ({ className, ...props }, ref) =>
  <SheetPrimitive.Title ref={ref} className={cn("text-lg font-semibold text-foreground ml-0", className)} {...props} />
);
SheetTitle.displayName = SheetPrimitive.Title.displayName;

const SheetDescription = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>>(
  ({ className, ...props }, ref) =>
  <SheetPrimitive.Description ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
);
SheetDescription.displayName = SheetPrimitive.Description.displayName;

export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetOverlay,
  SheetPortal,
  SheetTitle,
  SheetTrigger };