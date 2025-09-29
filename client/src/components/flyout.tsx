import React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

type FlyoutProps = {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: "start" | "center" | "end";
  className?: string;
};

export const Flyout: React.FC<FlyoutProps> = ({
  trigger,
  children,
  className,
  align = "center",
}) => {
  return (
    <Popover>
      <PopoverTrigger>{trigger}</PopoverTrigger>
      <PopoverContent
        onOpenAutoFocus={(e) => e.preventDefault()}
        align={align}
        className={className}
      >
        {children}
      </PopoverContent>
    </Popover>
  );
};
