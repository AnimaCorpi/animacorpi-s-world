import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { X, Info, AlertTriangle, CheckCircle, Sparkles } from "lucide-react";

const getDismissedKey = (userId) => userId ? `dismissed_announcements_${userId}` : "dismissed_announcements_guest";

const STYLES = {
  info:     { bg: "bg-blue-500",   Icon: Info },
  warning:  { bg: "bg-amber-500",  Icon: AlertTriangle },
  success:  { bg: "bg-green-500",  Icon: CheckCircle },
  new_drop: { bg: "bg-gradient-to-r from-purple-500 to-pink-500", Icon: Sparkles }
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

  const { bg, Icon } = STYLES[announcement.type] || STYLES.info;

  return (
    <div className={`${bg} text-white px-4 py-2.5 flex items-center justify-between gap-3 text-sm font-medium`}>
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <Icon className="w-4 h-4 shrink-0" />
        <span className="truncate">{announcement.message}</span>
      </div>
      <button onClick={dismiss} className="hover:opacity-70 transition-opacity shrink-0" aria-label="Dismiss">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}