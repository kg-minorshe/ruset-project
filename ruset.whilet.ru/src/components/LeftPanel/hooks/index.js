import { useState, useEffect } from 'react';
import { deviceUtils, themeUtils } from '../utils';
import { THEME } from '../constants';

export const useDeviceDetection = () => {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkIfMobile = () => {
            setIsMobile(deviceUtils.checkIfMobile());
        };

        checkIfMobile();
        window.addEventListener('resize', checkIfMobile);

        return () => window.removeEventListener('resize', checkIfMobile);
    }, []);

    return isMobile;
};

export const useTheme = () => {
    const [isDarkTheme, setIsDarkTheme] = useState(false);

    useEffect(() => {
        const savedTheme = themeUtils.getSavedTheme();
        const isDark = savedTheme === THEME.DARK;

        setIsDarkTheme(isDark);
        themeUtils.applyTheme(savedTheme);
    }, []);

    const toggleTheme = () => {
        const newTheme = themeUtils.toggleTheme(isDarkTheme ? THEME.DARK : THEME.LIGHT);
        setIsDarkTheme(!isDarkTheme);
        themeUtils.applyTheme(newTheme);
        themeUtils.saveTheme(newTheme);
    };

    return {
        isDarkTheme,
        toggleTheme,
    };
};

export const useMenuState = (initialStates = {}) => {
    const [menuStates, setMenuStates] = useState({
        isExpandedMenu: false,
        isExpandedChat: false,
        isExpandedProfile: false,
        isExpandedNewChats: false,
        isExpandedGift: false,
        ...initialStates,
    });

    const updateMenuState = (key, value) => {
        setMenuStates(prev => ({
            ...prev,
            [key]: value,
        }));
    };

    const toggleMenuState = (key) => {
        setMenuStates(prev => ({
            ...prev,
            [key]: !prev[key],
        }));
    };

    return {
        menuStates,
        updateMenuState,
        toggleMenuState,
    };
};