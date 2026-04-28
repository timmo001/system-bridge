/**
 * Shared style configuration for success/error result banners.
 * Eliminates repeated ternaries on a `success` boolean across render functions.
 */

export interface ResultStyle {
  borderClass: string;
  bgClass: string;
  iconName: string;
  iconClass: string;
  headingClass: string;
  bodyClass: string;
  heading: string;
}

const successStyle: ResultStyle = {
  borderClass: "border-green-800",
  bgClass: "bg-green-950/30",
  iconName: "CheckCircle2",
  iconClass: "text-green-400",
  headingClass: "text-green-200",
  bodyClass: "text-green-300",
  heading: "Success",
};

const errorStyle: ResultStyle = {
  borderClass: "border-red-800",
  bgClass: "bg-red-950/30",
  iconName: "AlertCircle",
  iconClass: "text-red-400",
  headingClass: "text-red-200",
  bodyClass: "text-red-300",
  heading: "Error",
};

export function getResultStyle(success: boolean): ResultStyle {
  return success ? successStyle : errorStyle;
}
