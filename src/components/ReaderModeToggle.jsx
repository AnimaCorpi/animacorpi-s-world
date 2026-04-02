import React from "react";
import { Button } from "@/components/ui/button";
import { Sun, Moon, BookOpen } from "lucide-react";

export default function ReaderModeToggle({ readingMode, onModeChange }) {
  const modes = [
    { id: 'light', label: 'Light', icon: Sun },
    { id: 'sepia', label: 'Sepia', icon: BookOpen },
    { id: 'dark', label: 'Dark', icon: Moon }
  ];

  return (
    <div className="flex gap-1 bg-muted p-1 rounded-lg">
      {modes.map(mode => {
        const Icon = mode.icon;
        return (
          <Button
            key={mode.id}
            variant={readingMode === mode.id ? "default" : "ghost"}
            size="sm"
            onClick={() => onModeChange(mode.id)}
            title={mode.label}
            className="px-2"
          >
            <Icon className="w-4 h-4" />
          </Button>
        );
      })}
    </div>
  );
}