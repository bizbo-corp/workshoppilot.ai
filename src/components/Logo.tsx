import React from "react";

interface LogoIconProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

/** Standalone pointer icon for collapsed/compact contexts */
export const LogoIcon: React.FC<LogoIconProps> = ({ className = "", size = "sm" }) => {
  const sizeClasses = {
    sm: "h-5 w-5",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  };

  return (
    <svg
      className={`${sizeClasses[size]} ${className}`}
      style={{ color: "#8B9A7A" }}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 640 640"
      fill="currentColor"
    >
      <path d="M541.9 139.5C546.4 127.7 543.6 114.3 534.7 105.4C525.8 96.5 512.4 93.6 500.6 98.2L84.6 258.2C71.9 263 63.7 275.2 64 288.7C64.3 302.2 73.1 314.1 85.9 318.3L262.7 377.2L321.6 554C325.9 566.8 337.7 575.6 351.2 575.9C364.7 576.2 376.9 568 381.8 555.4L541.8 139.4z" />
    </svg>
  );
};

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

const Logo: React.FC<LogoProps> = ({ className = "", size = "lg" }) => {
  const sizeClasses = {
    sm: "text-2xl",
    md: "text-4xl",
    lg: "text-6xl",
    xl: "text-8xl",
  };

  const svgSizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-8 w-8",
    xl: "h-12 w-12",
  };

  const svgOffsetClasses = {
    sm: "-top-1 left-[-1px]",
    md: "-top-1.5 left-[-2px]",
    lg: "-top-2 left-[-2px]",
    xl: "-top-3 left-[-3px]",
  };

  return (
    <div
      className={`flex flex-col items-center font-bold tracking-tight text-gray-800  ${sizeClasses[size]} ${className}`}
    >
      <div className="flex items-center">
        <span>Workshop</span>
        <span className="relative">
          <svg
            className={`absolute ${svgOffsetClasses[size]} transform -translate-x-1/2 ${svgSizeClasses[size]}`}
            style={{ color: "#8B9A7A" }} // Sage green color
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 640 640"
            fill="currentColor"
          >
            <path d="M541.9 139.5C546.4 127.7 543.6 114.3 534.7 105.4C525.8 96.5 512.4 93.6 500.6 98.2L84.6 258.2C71.9 263 63.7 275.2 64 288.7C64.3 302.2 73.1 314.1 85.9 318.3L262.7 377.2L321.6 554C325.9 566.8 337.7 575.6 351.2 575.9C364.7 576.2 376.9 568 381.8 555.4L541.8 139.4z" />
          </svg>
          <span className="ml-2">Pilot</span>
          <span>.ai</span>
        </span>
      </div>
    </div>
  );
};

export default Logo;
