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

    const handleInput = (e) => {
        e.target.style.height = "auto";
        e.target.style.height = Math.min(e.target.scrollHeight, 200) + "px";
    };

    return { handleKeyDown, handleInput };
};
