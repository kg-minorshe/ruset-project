import { useEffect } from "react";

export const useTheme = () => {
  const initializeTheme = () => {
    const rootElement = document.documentElement;
    const savedTheme = localStorage.getItem("w|theme");

    if (savedTheme) {
      rootElement.setAttribute("data-theme", savedTheme);
    } else {
      const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
      const defaultTheme = prefersDark ? "dark" : "light";
      rootElement.setAttribute("data-theme", defaultTheme);
      localStorage.setItem("w|theme", defaultTheme);
    }
  };

  return { initializeTheme };
};