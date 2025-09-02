import React from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet";

type SlideoutProps = {
  trigger: React.ReactNode;
  children: React.ReactNode;
  side?: "bottom" | "left" | "right" | "top";
  className?: string;
};

export const Slideout: React.FC<SlideoutProps> = ({
  trigger,
  side,
  children,
  className,
}) => {
  return (
    <Sheet>
      <SheetTrigger>{trigger}</SheetTrigger>
      <SheetContent  className={className} side={side}>
        {children}
      </SheetContent>
    </Sheet>
  );
};
