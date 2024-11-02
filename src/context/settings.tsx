"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

type Settings = {
  includeUnapproved: boolean;
};

type SettingsContextType = {
  settings: Settings;
  update<T extends keyof Settings>(key: T, value: Settings[T]): void;
};

const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined
);

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>({
    includeUnapproved: false,
  });

  const load = useCallback(() => {
    const stored = localStorage.getItem("settings");
    if (stored) {
      setSettings(JSON.parse(stored));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const update = useCallback(
    <T extends keyof Settings>(key: T, value: Settings[T]) => {
      setSettings((prev) => {
        const newSettings = { ...prev, [key]: value };
        localStorage.setItem("settings", JSON.stringify(newSettings));
        return newSettings;
      });
    },
    []
  );

  return (
    <SettingsContext.Provider value={{ settings, update }}>
      {children}
    </SettingsContext.Provider>
  );
}
