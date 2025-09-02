import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

type ExpandableContainerProps = {
  children: React.ReactNode;
  minHeight?: string;
  maxHeight?: string;
  className?: string;
};

const ExpandableContainer: React.FC<ExpandableContainerProps> = ({
  children,
  className,
  minHeight,
  maxHeight,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="relative">
      <div
        className={cn(
          `overflow-hidden transition-all duration-300 ${
            isExpanded ? maxHeight ?? "h-[400px]" : minHeight ?? "h-[180px]"
          }`,
          className
        )}
      >
        {children}
      </div>
      <div className="flex justify-center">
        <button
          onClick={toggleExpand}
          className="flex items-center justify-center p-2"
        >
          {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </button>
      </div>
    </div>
  );
};

export default ExpandableContainer;
