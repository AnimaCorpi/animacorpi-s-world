import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { X, Info, AlertTriangle, CheckCircle, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const getDismissedKey = (userId) => userId ? `dismissed_announcements_${userId}` : "dismissed_announcements_guest";

const STYLES = {
  info:     { bg: "bg-white/95 dark:bg-gray-900/95 border-blue-200 dark:border-blue-800",   icon: "text-blue-500", dot: "bg-blue-500",   label: "Info",    Icon: Info },
  warning:  { bg: "bg-white/95 dark:bg-gray-900/95 border-amber-200 dark:border-amber-800",  icon: "text-amber-500", dot: "bg-amber-500",  label: "Alert",   Icon: AlertTriangle },
  success:  { bg: "bg-white/95 dark:bg-gray-900/95 border-green-200 dark:border-green-800",  icon: "text-green-500", dot: "bg-green-500",  label: "Update",  Icon: CheckCircle },
  new_drop: { bg: "bg-white/95 dark:bg-gray-900/95 border-purple-200 dark:border-purple-800", icon: "text-purple-500", dot: "bg-gradient-to-r from-purple-500 to-pink-500", label: "New Drop", Icon: Sparkles }
};

export default function AnnouncementBanner() {
  const [announcement, setAnnouncement] = useState(null);
  const [visible, setVisible] = useState(true);
  const keyRef = React.useRef("dismissed_announcements_guest");

  useEffect(() => {
    (async () => {
      try {
        let userId = null;
        try {
          const isAuth = await base44.auth.isAuthenticated();
          if (isAuth) { const me = await base44.auth.me(); userId = me?.id || null; }
        } catch {}
        keyRef.current = getDismissedKey(userId);

        const list = await base44.entities.Announcement.filter({ active: true }, "-created_date", 1);
        if (!list.length) return;
        const a = list[0];
        if (a.expires_at && new Date(a.expires_at) < new Date()) return;
        const dismissed = JSON.parse(localStorage.getItem(keyRef.current) || "[]");
        if (dismissed.includes(a.id)) return;
        setAnnouncement(a);
        setVisible(true);
      } catch {}
    })();
  }, []);

  const dismiss = () => {
    if (!announcement) return;
    const dismissed = JSON.parse(localStorage.getItem(keyRef.current) || "[]");
    localStorage.setItem(keyRef.current, JSON.stringify([...dismissed, announcement.id]));
    setVisible(false);
    setAnnouncement(null);
  };

  if (!announcement || !visible) return null;

  const style = STYLES[announcement.type] || STYLES.info;
  const { bg, icon, dot, label, Icon } = style;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -12, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -12, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 340, damping: 28 }}
        className="flex justify-center px-4 pt-2 pb-1 z-40"
      >
        <div className={`flex items-center gap-3 ${bg} border rounded-2xl shadow-lg backdrop-blur-md px-4 py-2.5 max-w-xl w-full`}>
          <div className={`w-7 h-7 rounded-full ${dot} flex items-center justify-center shrink-0`}>
            <Icon className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide leading-none mb-0.5">{label}</p>
            <p className="text-sm font-medium text-foreground truncate">{announcement.message}</p>
          </div>
          <button
            onClick={dismiss}
            className="shrink-0 w-6 h-6 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-3 h-3 text-muted-foreground" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}