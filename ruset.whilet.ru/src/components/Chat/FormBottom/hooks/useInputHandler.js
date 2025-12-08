export const useInputHandler = (isMobile, isInputDisabled, onSendMessage) => {
    const handleKeyDown = (e) => {
        if (isInputDisabled) return;
        if (
            isMobile
                ? e.key === "Enter" && e.shiftKey
                : e.key === "Enter" && !e.shiftKey
        ) {
            e.preventDefault();
            onSendMessage(e);
        }
    };

    const resizeInput = (target) => {
        if (!target) return;
        target.style.height = "auto";
        target.style.height = Math.min(target.scrollHeight, 200) + "px";
    };

    return { handleKeyDown, resizeInput };
};
