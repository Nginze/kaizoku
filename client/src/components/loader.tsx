import { cn } from "@/lib/utils";
import React from "react";

type LoaderVariant = "spinner";

interface LoaderProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: LoaderVariant;
  size?: "sm" | "md" | "lg";
  color?: string;
}

const variantClasses = {
  spinner:
    "border-4 border-solid border-current border-e-transparent rounded-full animate-spin",
};

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-8 w-8",
  lg: "h-12 w-12",
};

export const Loader = React.forwardRef<HTMLDivElement, LoaderProps>(
  ({ className, variant = "spinner", size = "md", color, ...props }, ref) => {
    return (
      <div className="flex items-center justify-center" {...props} ref={ref}>
        <div
          className={cn(
            "inline-block align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]",
            variantClasses[variant],
            sizeClasses[size],
            className
          )}
          role="status"
          style={{
            borderColor: color
              ? `${color} transparent ${color} ${color}`
              : undefined,
          }}
        >
          <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
            Loading...
          </span>
        </div>
      </div>
    );
  }
);

Loader.displayName = "Loader";
