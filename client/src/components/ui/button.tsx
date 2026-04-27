import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background aria-invalid:ring-destructive/20 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-[#7C3AED] to-[#EC4899] text-white shadow-[0_4px_14px_rgba(124,58,237,0.4)] hover:shadow-[0_6px_24px_rgba(124,58,237,0.6)] hover:scale-[1.03] active:scale-[0.97]",
        destructive:
          "bg-[#EF4444] text-white hover:bg-[#DC2626] shadow-[0_4px_12px_rgba(239,68,68,0.3)] hover:shadow-[0_6px_18px_rgba(239,68,68,0.45)]",
        outline:
          "border border-[#7C3AED]/50 bg-transparent text-foreground hover:bg-gradient-to-r hover:from-[#7C3AED] hover:to-[#EC4899] hover:text-white hover:border-transparent hover:shadow-[0_4px_14px_rgba(124,58,237,0.4)]",
        secondary:
          "bg-[#12122A] text-foreground border border-[#1E1E4A] hover:bg-[#1A1040] hover:border-[#7C3AED]/40",
        ghost:
          "hover:bg-[#7C3AED]/20 text-muted-foreground hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-5 py-2 rounded-[50px] has-[>svg]:px-3",
        sm: "h-8 rounded-[50px] gap-1.5 px-4 has-[>svg]:px-2.5 text-xs",
        lg: "h-11 rounded-[50px] px-8 has-[>svg]:px-5 text-base",
        xl: "h-13 rounded-[50px] px-10 has-[>svg]:px-6 text-base font-bold",
        icon: "size-9 rounded-full",
        "icon-sm": "size-8 rounded-full",
        "icon-lg": "size-10 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
