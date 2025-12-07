export const SlowModeIndicator = ({ chatInfo, getSlowModeTimeLeft }) => {
  const timeLeft = getSlowModeTimeLeft();

  if (!chatInfo?.settings?.slowMode || timeLeft <= 0) {
    return null;
  }

  return <div className="slow-mode-indicator">{Math.ceil(timeLeft)}s</div>;
};
