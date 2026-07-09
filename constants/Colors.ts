// Jarvis OS / G-Project Unified Tokens

const bgBase = '#000000';
const bgSurface = '#141416';
const bgElevated = '#1c1c1e';
const bgOverlay = '#2c2c2e';

const fgPrimary = '#ffffff';
const fgSecondary = '#ebebf5';
const fgMuted = '#8e8e93';

const accent = '#0a84ff';
const success = '#30d158';
const warning = '#ff9f0a';
const error = '#ff453a';
const border = '#2c2c2e';

export default {
  light: {
    // Currently the app is optimized for dark mode (Apple-Level Minimalism)
    // Map light to dark or provide inverted tokens later
    text: fgPrimary,
    background: bgBase,
    surface: bgSurface,
    elevated: bgElevated,
    overlay: bgOverlay,
    tint: accent,
    tabIconDefault: fgMuted,
    tabIconSelected: accent,
    border: border,
    success,
    warning,
    error,
    muted: fgMuted,
    secondary: fgSecondary
  },
  dark: {
    text: fgPrimary,
    background: bgBase,
    surface: bgSurface,
    elevated: bgElevated,
    overlay: bgOverlay,
    tint: accent,
    tabIconDefault: fgMuted,
    tabIconSelected: accent,
    border: border,
    success,
    warning,
    error,
    muted: fgMuted,
    secondary: fgSecondary
  },
};
