import { Spinner } from "@heroui/react";
import type React from "react";

interface Props {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const LoadingSpinner: React.FC<Props> = ({ size = "md", className }) => {
  return <Spinner size={size} color="primary" className={className} aria-label="Loading" />;
};

export default LoadingSpinner;
