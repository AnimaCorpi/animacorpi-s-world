import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { PenTool, Camera, BookOpen, MessageSquare, User as UserIcon } from "lucide-react";

const tabs = [
  { name: "Thoughts", path: "Thoughts", icon: PenTool, label: "Thoughts" },
  { name: "Stories", path: "Stories", icon: BookOpen, label: "Stories" },
  { name: "Forum", path: "Forum", icon: MessageSquare, label: "Forum" },
  { name: "Photography", path: "Photography", icon: Camera, label: "Photos" },
  { name: "Profile", path: "Profile", icon: UserIcon, label: "Profile" },
];

export default function BottomTabBar({ taskbarColor }) {
  const location = useLocation();

  const isActive = (path) =>
    location.pathname === `/${path}` || location.pathname === createPageUrl(path);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[100] flex md:hidden border-t border-border bg-background"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {tabs.map((tab) => {
        const active = isActive(tab.path);
        return (
          <Link
            key={tab.name}
            to={createPageUrl(tab.path)}
            aria-label={tab.label}
            aria-current={active ? "page" : undefined}
            className="flex flex-col items-center justify-center flex-1 py-2 gap-0.5 select-none"
            style={{ WebkitTapHighlightColor: "transparent" }}
          >
            <tab.icon
              className="w-6 h-6"
              style={{ color: active ? taskbarColor || "#e879f9" : "#9ca3af" }}
            />
            <span
              className="text-[10px] font-medium"
              style={{ color: active ? taskbarColor || "#e879f9" : "#9ca3af" }}
            >
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}