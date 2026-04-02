import React from "react";

export default function KarmaBadge({ karma, size = "sm" }) {
  if (!karma || karma <= 0) return null;
  return (
    <span
      title={`${karma} imas`}
      className={`inline-flex items-center gap-0.5 font-medium text-amber-600 dark:text-amber-400 ${
        size === "sm" ? "text-xs" : "text-sm"
      }`}
    >
      ⭐ {karma}
    </span>
  );
}