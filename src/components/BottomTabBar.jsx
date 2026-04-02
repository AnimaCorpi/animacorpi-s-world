import React from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Home, BookOpen, MessageSquare, User as UserIcon, Settings } from "lucide-react";

export default function BottomTabBar({ taskbarColor, user }) {
  const location = useLocation();

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
    <nav className="bottom-tab-bar flex md:hidden border-t border-border bg-background shrink-0">
      {tabs.map((tab) => {
        const active = isActive(tab);
        return (
          <Link
            key={tab.name}
            to={tab.name === "Profile" && user?.id ? `/UserProfile?id=${user.id}` : (tab.rootMatch ? "/" : createPageUrl(tab.path))}
            aria-label={tab.label}
            aria-current={active ? "page" : undefined}
            className="flex flex-col items-center justify-center flex-1 gap-0.5 select-none min-h-[72px] px-1"
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