import React from "react";
import { User as UserIcon } from "lucide-react";

export default function UserAvatar({ avatarUrl, username, size = "sm" }) {
  const sizeClass = size === "sm" ? "w-7 h-7 text-xs" : "w-9 h-9 text-sm";
  return avatarUrl ? (
    <img
      src={avatarUrl}
      alt={username || "User"}
      className={`${sizeClass} rounded-full object-cover shrink-0`}
    />
  ) : (
    <div className={`${sizeClass} rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0`}>
      <UserIcon className="w-3.5 h-3.5 text-purple-500" />
    </div>
  );
}