import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

const MessageInput = forwardRef(
  ({ value, disabled, placeholder, className = "", onInput, ...props }, ref) => {
    const innerRef = useRef(null);

    useImperativeHandle(ref, () => innerRef.current);

    useEffect(() => {
      if (!innerRef.current) return;
      if (innerRef.current.innerHTML !== value) {
        innerRef.current.innerHTML = value || "";
      }
    }, [value]);

    return (
      <div
        ref={innerRef}
        className={`message-input ${className}`.trim()}
        role="textbox"
        contentEditable={!disabled}
        aria-disabled={disabled}
        suppressContentEditableWarning={true}
        data-placeholder={!disabled ? placeholder : ""}
        onInput={onInput}
        spellCheck={true}
        {...props}
      />
    );
  }
);

export default MessageInput;