import { forwardRef } from "react";

const MessageInput = forwardRef((props, ref) => {
  return (
    <textarea
      ref={ref}
      {...props}
      className="message-input"
      rows="1"
      maxheight="300"
    />
  );
});

export default MessageInput;