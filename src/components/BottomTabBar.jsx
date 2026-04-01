import React, { useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Home, BookOpen, MessageSquare, User as UserIcon, Settings } from "lucide-react";

export default function BottomTabBar({ taskbarColor, user }) {
  const location = useLocation();
  const prevPathRef = useRef(location.pathname);

  const isAdmin = user?.role === 'admin';

  const baseTabs = [
    { name: "Home", path: "Home", icon: Home, label: "Home", rootMatch: true },
    { name: "Stories", path: "Stories", icon: BookOpen, label: "Stories" },
    { name: "Forum", path: "Forum", icon: MessageSquare, label: "Forum" },
    { name: "Profile", path: "Profile", icon: UserIcon, label: "Profile" },
  ];

  const adminTab = { name: "Admin", path: "Admin", icon: Settings, label: "Admin" };

  const tabs = isAdmin ? [...baseTabs, adminTab] : baseTabs;

  const isActive = (tab) => {
    if (tab.rootMatch) {
      return location.pathname === "/" || location.pathname === createPageUrl(tab.path);
    }
    return location.pathname === `/${tab.path}` || location.pathname === createPageUrl(tab.path);
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[100] flex lg:hidden border-t border-border bg-background overflow-hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {tabs.map((tab) => {
        const active = isActive(tab);
        return (
          <Link
            key={tab.name}
            to={tab.rootMatch ? "/" : createPageUrl(tab.path)}
            aria-label={tab.label}
            aria-current={active ? "page" : undefined}
            className="flex flex-col items-center justify-center flex-1 gap-0.5 select-none min-h-[56px] px-1"
            style={{ WebkitTapHighlightColor: "transparent" }}
          >
            <tab.icon
              className="w-5 h-5 shrink-0"
              style={{ color: active ? taskbarColor || "#e879f9" : "#9ca3af" }}
            />
            <span
              className="text-[9px] font-medium leading-tight text-center w-full truncate"
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