import React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { cn } from "@/lib/utils";

type FlyoutProps = {
  open?: boolean;
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: "start" | "center" | "end";
  disabled?: boolean;
  className?: string;
};

export const Flyout: React.FC<FlyoutProps> = ({
  open,
  trigger,
  children,
  className,
  align = "center",
  disabled = false,
}) => {
  return (
    <Popover {...{ open }}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
        align={align}
        className={cn(className, disabled && "hidden")}
      >
        {children}
      </PopoverContent>
    </Popover>
  );
};
