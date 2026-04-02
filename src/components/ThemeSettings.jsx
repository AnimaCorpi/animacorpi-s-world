import React from "react";
import { useTheme } from "@/lib/ThemeContext";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sun, Moon, Monitor, Upload, Check, X } from "lucide-react";

const ACCENT_PRESETS = [
  { name: "Fuchsia", color: "#e879f9" },
  { name: "Purple", color: "#a855f7" },
  { name: "Blue", color: "#3b82f6" },
  { name: "Teal", color: "#14b8a6" },
  { name: "Rose", color: "#f43f5e" },
  { name: "Orange", color: "#f97316" },
  { name: "Lime", color: "#84cc16" },
  { name: "Slate", color: "#64748b" },
];

const BG_PRESETS = [
  { name: "Lavender", color: "#fef7ff" },
  { name: "Mint", color: "#f0fdf4" },
  { name: "Sky", color: "#f0f9ff" },
  { name: "Peach", color: "#fff7ed" },
  { name: "Rose", color: "#fff1f2" },
  { name: "Slate", color: "#f8fafc" },
  { name: "Warm", color: "#fefce8" },
  { name: "Neutral", color: "#fafafa" },
];

export default function ThemeSettings({ themePrefs, onChange, backgroundImages, onBackgroundUpload, uploadingBackground }) {
  const { theme, toggleTheme, resetToAuto, isAuto } = useTheme();

  const setThemeMode = (mode) => {
    if (mode === "system") resetToAuto();
    else if (mode === "light" && theme !== "light") toggleTheme();
    else if (mode === "dark" && theme !== "dark") toggleTheme();
  };

  const currentMode = isAuto ? "system" : theme;

  return (
    <div className="space-y-8">

      {/* UI Theme */}
      <div>
        <Label className="text-base font-semibold">UI Theme</Label>
        <p className="text-sm text-muted-foreground mb-3">Choose your preferred color scheme</p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { key: "light", icon: Sun, label: "Light" },
            { key: "dark", icon: Moon, label: "Dark" },
            { key: "system", icon: Monitor, label: "System" },
          ].map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => setThemeMode(key)}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                currentMode === key
                  ? "border-purple-500 bg-purple-50 dark:bg-purple-950/30"
                  : "border-border hover:border-muted-foreground"
              }`}
            >
              <Icon className={`w-6 h-6 ${currentMode === key ? "text-purple-600" : "text-muted-foreground"}`} />
              <span className={`text-sm font-medium ${currentMode === key ? "text-purple-600" : "text-foreground"}`}>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Accent Color */}
      <div>
        <Label className="text-base font-semibold">Accent Color</Label>
        <p className="text-sm text-muted-foreground mb-3">Used for navigation bar and interactive elements</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {ACCENT_PRESETS.map((preset) => (
            <button
              key={preset.color}
              title={preset.name}
              onClick={() => onChange("taskbar_color", preset.color)}
              className="relative w-9 h-9 rounded-full border-2 transition-transform hover:scale-110"
              style={{
                backgroundColor: preset.color,
                borderColor: themePrefs.taskbar_color === preset.color ? "#1f2937" : "transparent",
                boxShadow: themePrefs.taskbar_color === preset.color ? "0 0 0 2px white, 0 0 0 4px " + preset.color : "none"
              }}
            >
              {themePrefs.taskbar_color === preset.color && (
                <Check className="w-4 h-4 text-white absolute inset-0 m-auto" />
              )}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={themePrefs.taskbar_color}
            onChange={(e) => onChange("taskbar_color", e.target.value)}
            className="w-10 h-10 rounded-lg border border-border cursor-pointer"
          />
          <Input
            value={themePrefs.taskbar_color}
            onChange={(e) => onChange("taskbar_color", e.target.value)}
            className="font-mono w-32"
            placeholder="#e879f9"
          />
        </div>
      </div>

      {/* Background Color */}
      <div>
        <Label className="text-base font-semibold">Background Color</Label>
        <p className="text-sm text-muted-foreground mb-3">Applied when no wallpaper is selected</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {BG_PRESETS.map((preset) => (
            <button
              key={preset.color}
              title={preset.name}
              onClick={() => onChange("background_color", preset.color)}
              className="relative w-9 h-9 rounded-full border-2 transition-transform hover:scale-110"
              style={{
                backgroundColor: preset.color,
                borderColor: themePrefs.background_color === preset.color ? "#a855f7" : "#e5e7eb",
                boxShadow: themePrefs.background_color === preset.color ? "0 0 0 2px white, 0 0 0 4px #a855f7" : "none"
              }}
            >
              {themePrefs.background_color === preset.color && (
                <Check className="w-4 h-4 text-purple-600 absolute inset-0 m-auto" />
              )}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={themePrefs.background_color}
            onChange={(e) => onChange("background_color", e.target.value)}
            className="w-10 h-10 rounded-lg border border-border cursor-pointer"
          />
          <Input
            value={themePrefs.background_color}
            onChange={(e) => onChange("background_color", e.target.value)}
            className="font-mono w-32"
            placeholder="#fef7ff"
          />
        </div>
      </div>

      {/* Wallpaper */}
      <div>
        <Label className="text-base font-semibold">Wallpaper</Label>
        <p className="text-sm text-muted-foreground mb-3">Set a custom background image for your dashboard</p>

        {backgroundImages.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-4">
            {/* "None" option */}
            <button
              onClick={() => onChange("background_image", "")}
              className={`relative rounded-lg border-2 overflow-hidden h-20 flex items-center justify-center transition-all ${
                !themePrefs.background_image ? "border-purple-500" : "border-border hover:border-muted-foreground"
              }`}
            >
              <X className="w-6 h-6 text-muted-foreground" />
              <span className="text-xs mt-1 text-muted-foreground absolute bottom-1">None</span>
            </button>
            {backgroundImages.map((bg) => (
              <button
                key={bg.id}
                onClick={() => onChange("background_image", bg.image_url)}
                className={`relative rounded-lg border-2 overflow-hidden h-20 transition-all ${
                  themePrefs.background_image === bg.image_url ? "border-purple-500" : "border-border hover:border-muted-foreground"
                }`}
              >
                <img src={bg.thumbnail_url || bg.image_url} alt={bg.name} className="w-full h-full object-cover" />
                {themePrefs.background_image === bg.image_url && (
                  <div className="absolute inset-0 bg-purple-500/20 flex items-center justify-center">
                    <Check className="w-5 h-5 text-white drop-shadow" />
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] px-1 py-0.5 truncate">
                  {bg.name}
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3">
          <input type="file" accept="image/*" onChange={onBackgroundUpload} className="hidden" id="bg-upload" disabled={uploadingBackground} />
          <label htmlFor="bg-upload">
            <Button variant="outline" asChild disabled={uploadingBackground}>
              <span>
                <Upload className="w-4 h-4 mr-2" />
                {uploadingBackground ? "Uploading..." : "Upload Custom Wallpaper"}
              </span>
            </Button>
          </label>
          {themePrefs.background_image && (
            <Button variant="ghost" size="sm" onClick={() => onChange("background_image", "")}>
              <X className="w-4 h-4 mr-1" /> Remove
            </Button>
          )}
        </div>
      </div>

      {/* Transparent Banners */}
      <div className="flex items-center justify-between p-4 border border-border rounded-xl">
        <div>
          <p className="font-medium">Transparent Banners</p>
          <p className="text-sm text-muted-foreground">Show your wallpaper through page headers</p>
        </div>
        <button
          onClick={() => onChange("transparent_banners", !themePrefs.transparent_banners)}
          className={`relative w-12 h-6 rounded-full transition-colors ${themePrefs.transparent_banners ? "bg-purple-500" : "bg-muted"}`}
        >
          <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${themePrefs.transparent_banners ? "translate-x-7" : "translate-x-1"}`} />
        </button>
      </div>

      {/* Live Preview */}
      <div>
        <Label className="text-base font-semibold">Preview</Label>
        <div
          className="mt-2 h-28 rounded-xl border overflow-hidden relative flex items-start"
          style={{
            backgroundColor: themePrefs.background_color,
            backgroundImage: themePrefs.background_image ? `url(${themePrefs.background_image})` : "none",
            backgroundSize: "cover",
            backgroundPosition: "center"
          }}
        >
          <div
            className="w-full px-4 py-2 flex items-center gap-3"
            style={{
              backgroundColor: themePrefs.transparent_banners ? "rgba(255,255,255,0.1)" : themePrefs.taskbar_color + "33",
              backdropFilter: "blur(8px)"
            }}
          >
            <div className="w-7 h-7 rounded-full" style={{ backgroundColor: themePrefs.taskbar_color }} />
            <span className="text-sm font-bold text-foreground">Site Name</span>
            <div className="ml-auto flex gap-2">
              {["Home", "Stories", "Forum"].map(n => (
                <span key={n} className="text-xs px-2 py-0.5 rounded" style={{ color: themePrefs.taskbar_color }}>
                  {n}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}