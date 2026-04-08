import { useState, useEffect, useCallback, useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import { DEFAULT_THEME_ID, getThemeById, ALL_THEMES } from "@/constants/themes";
import type { ThemeDefinition, ThemeColors } from "@/constants/themes";

const THEME_STORAGE_KEY = "@openclaw_theme_v1";

const defaultTheme = getThemeById(DEFAULT_THEME_ID);
const defaultValue = {
  themeId: DEFAULT_THEME_ID,
  theme: defaultTheme,
  colors: defaultTheme.colors,
  setTheme: (_id: string) => {},
  loaded: false,
  allThemes: ALL_THEMES,
};

export const [ThemeProvider, useTheme] = createContextHook(() => {
  const [themeId, setThemeId] = useState<string>(DEFAULT_THEME_ID);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void AsyncStorage.getItem(THEME_STORAGE_KEY).then(stored => {
      if (stored) {
        const valid = ALL_THEMES.some(t => t.id === stored);
        if (valid) setThemeId(stored);
      }
      setLoaded(true);
    });
  }, []);

  const setTheme = useCallback((id: string) => {
    console.log("[theme] switching to", id);
    setThemeId(id);
    void AsyncStorage.setItem(THEME_STORAGE_KEY, id);
  }, []);

  const theme: ThemeDefinition = useMemo(() => getThemeById(themeId), [themeId]);
  const colors: ThemeColors = theme.colors;

  return { themeId, theme, colors, setTheme, loaded, allThemes: ALL_THEMES };
}, defaultValue);
