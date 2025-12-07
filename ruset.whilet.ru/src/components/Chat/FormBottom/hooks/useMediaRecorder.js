import { useState, useRef, useCallback, useEffect } from 'react';

const useMediaRecorder = ({ onAudioReady, onError }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const recordingIntervalRef = useRef(null);
  const audioLevelIntervalRef = useRef(null);
  const chunksRef = useRef([]);

  const formatTime = useCallback((seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const updateAudioLevel = useCallback(() => {
    if (!analyserRef.current) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserRef.current.getByteFrequencyData(dataArray);

    const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
    const normalizedLevel = (average / 255) * 100;

    setAudioLevel(normalizedLevel);
  }, []);

  const checkMicrophonePermission = useCallback(async () => {
    try {
      // Проверяем разрешение через Permission API, если доступно
      if (navigator.permissions) {
        const permissionStatus = await navigator.permissions.query({ name: 'microphone' });
        return permissionStatus.state === 'granted';
      }

      // Если Permission API не доступен, попробуем получить доступ к микрофону
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      return false;
    }
  }, []);

  const requestMicrophonePermission = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      setPermissionDenied(false);
      return true;
    } catch (error) {
      setPermissionDenied(true);
      onError?.(new Error('Microphone permission denied'));
      return false;
    }
  }, [onError]);

  const startRecording = useCallback(async () => {
    try {
      // Проверка среды (не запускать на сервере)
      if (typeof window === 'undefined') return;

      // Проверка поддержки MediaRecorder
      if (!isSupported()) {
        onError?.(new Error('MediaRecorder not supported in this browser'));
        return;
      }

      // Проверка разрешения
      const hasPermission = await checkMicrophonePermission();
      if (!hasPermission) {
        const granted = await requestMicrophonePermission();
        if (!granted) return;
      }

      // Получение аудио-потока через Web API
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });

      streamRef.current = stream;

      // Настройка AudioContext и Analyser для уровня громкости
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);

      analyser.fftSize = 256;
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      // Настройка MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        if (blob.size === 0) {
          console.error('Empty recording');
          onError?.(new Error('Empty recording'));
          cleanup();
          return;
        }

        const audioFile = new File([blob], `recording-${Date.now()}.webm`, {
          type: 'audio/webm',
        });

        onAudioReady?.(audioFile);
        cleanup();
      };

      mediaRecorder.onerror = (e) => {
        console.error('MediaRecorder error:', e.error || e);
        onError?.(new Error(`Recording failed: ${e.error?.message || 'unknown error'}`));
        cleanup();
      };

      mediaRecorder.start(1000); // Буферизация каждые 1 сек
      setIsRecording(true);
      setRecordingTime(0);

      // Обновление времени
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      // Обновление уровня звука
      audioLevelIntervalRef.current = setInterval(updateAudioLevel, 100);
    } catch (error) {
      console.error('Error starting recording:', error);
      let message = 'Failed to start recording';

      if (error.name === 'NotAllowedError') {
        message = 'Microphone access denied';
        setPermissionDenied(true);
      } else if (error.name === 'NotFoundError') {
        message = 'Microphone not found';
      } else if (error.name === 'NotReadableError') {
        message = 'Microphone is in use by another app';
      }

      onError?.(new Error(message));
      cleanup();
    }
  }, [onAudioReady, onError, updateAudioLevel, checkMicrophonePermission, requestMicrophonePermission]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      cleanup();
    }
  }, [isRecording]);

  const cleanup = useCallback(() => {
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }

    if (audioLevelIntervalRef.current) {
      clearInterval(audioLevelIntervalRef.current);
      audioLevelIntervalRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current) {
      if (audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(console.warn);
      }
      audioContextRef.current = null;
    }

    analyserRef.current = null;
    mediaRecorderRef.current = null;
    chunksRef.current = [];
    setRecordingTime(0);
    setAudioLevel(0);
  }, []);

  const isSupported = useCallback(() => {
    if (typeof window === 'undefined') return false;
    return !!(
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia &&
      window.MediaRecorder &&
      (window.AudioContext || window.webkitAudioContext)
    );
  }, []);

  const getAudioDevices = useCallback(async () => {
    if (typeof window === 'undefined') return [];
    try {
      // Сначала запрашиваем разрешение, иначе устройства не будут перечислены
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter((device) => device.kind === 'audioinput');
    } catch (error) {
      console.error('Error getting audio devices:', error);
      return [];
    }
  }, []);

  // Очистка при размонтировании
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    isRecording,
    recordingTime,
    audioLevel,
    permissionDenied,
    startRecording,
    stopRecording,
    cancelRecording,
    formatTime,
    isSupported,
    getAudioDevices,
    cleanup,
  };
};

export default useMediaRecorder;
