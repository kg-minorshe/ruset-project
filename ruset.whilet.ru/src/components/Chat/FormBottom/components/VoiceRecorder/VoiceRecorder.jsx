import { BiMicrophone, BiMicrophoneOff } from "react-icons/bi";

const VoiceRecorder = ({
  isRecording,
  recordingTime,
  formatTime,
  onStart,
  onStop,
  isDisabled,
}) => {
  return !isRecording ? (
    <span
      className={`voice-icon ${isDisabled ? "disabled" : ""}`}
      onClick={!isDisabled ? onStart : undefined}
      title="Записать голосовое сообщение"
    >
      <BiMicrophone />
    </span>
  ) : (
    <div className="recording-indicator" title="Остановить запись">
      <div className="recording-dot"></div>
      <span className="recording-time">{formatTime(recordingTime)}</span>
      <span className="stop-recording" onClick={onStop} title="Отменить запись">
        <BiMicrophoneOff />
      </span>
    </div>
  );
};

export default VoiceRecorder;
