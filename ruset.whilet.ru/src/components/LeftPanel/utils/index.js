import { BREAKPOINTS, STORAGE_KEYS, THEME } from '../constants';

export const deviceUtils = {
    checkIfMobile: () => window.innerWidth <= BREAKPOINTS.MOBILE,
};

export const themeUtils = {
    getSavedTheme: () => localStorage.getItem(STORAGE_KEYS.THEME) || THEME.LIGHT,

    saveTheme: (theme) => {
        localStorage.setItem(STORAGE_KEYS.THEME, theme);
    },

    applyTheme: (theme) => {
        document.documentElement.setAttribute('data-theme', theme);
    },

    toggleTheme: (currentTheme) => {
        return currentTheme === THEME.DARK ? THEME.LIGHT : THEME.DARK;
    },
};