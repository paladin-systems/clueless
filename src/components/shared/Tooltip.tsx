import { Tooltip as HeroTooltip } from "@heroui/react";
import type React from "react";

interface Props {
  content: React.ReactNode;
  children: React.ReactNode;
  placement?:
    | "top"
    | "bottom"
    | "left"
    | "right"
    | "top-start"
    | "top-end"
    | "bottom-start"
    | "bottom-end"
    | "left-start"
    | "left-end"
    | "right-start"
    | "right-end";
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
  return (
    <HeroTooltip
      content={content}
      placement={placement}
      delay={delay}
      className={className}
      color="foreground"
    >
      {children}
    </HeroTooltip>
  );
};

export default Tooltip;
