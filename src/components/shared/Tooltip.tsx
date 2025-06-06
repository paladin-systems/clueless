import clsx from "clsx";
import type React from "react";
import { useEffect, useRef, useState } from "react";

interface Props {
  content: React.ReactNode;
  children: React.ReactNode;
  placement?: "top" | "bottom" | "left" | "right";
  delay?: number;
  className?: string;
}

const Tooltip: React.FC<Props> = ({
  content,
  children,
  placement = "top",
  delay = 200,
  className,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  const placements = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-1",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-1",
    left: "right-full top-1/2 -translate-y-1/2 mr-1",
    right: "left-full top-1/2 -translate-y-1/2 ml-1",
  };

  return (
    <div
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {isVisible && (
        <div
          ref={tooltipRef}
          role="tooltip"
          className={clsx(
            "absolute z-50 px-2 py-1 text-xs",
            "rounded bg-gray-900/95 text-gray-100 shadow-lg",
            "border border-gray-700/50 backdrop-blur-sm",
            "fade-in zoom-in-95 animate-in duration-200",
            placements[placement],
            className,
          )}
        >
          {content}
          <div
            className={clsx(
              "absolute h-2 w-2 border border-gray-700/50 bg-gray-900/95",
              "rotate-45 transform",
              {
                "-translate-x-1/2 bottom-[-4px] left-1/2 border-t-0 border-l-0":
                  placement === "top",
                "-translate-x-1/2 top-[-4px] left-1/2 border-r-0 border-b-0":
                  placement === "bottom",
                "-translate-y-1/2 top-1/2 right-[-4px] border-t-0 border-l-0": placement === "left",
                "-translate-y-1/2 top-1/2 left-[-4px] border-r-0 border-b-0": placement === "right",
              },
            )}
          />
        </div>
      )}
    </div>
  );
};

export default Tooltip;
