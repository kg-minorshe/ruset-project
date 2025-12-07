// utils/fileUtils.js

// Форматирование размера файла
export const formatFileSize = (bytes) => {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + " MB";
  return (bytes / 1073741824).toFixed(1) + " GB";
};

// Определение типа файла
export const getFileType = (file) => {
  const mimeType = file.type;
  
  if (mimeType.startsWith('image/')) return 'photo';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  
  // Проверяем по расширению для дополнительных типов
  const extension = file.name.toLowerCase().split('.').pop();
  
  const documentExtensions = ['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt', 'xls', 'xlsx', 'ppt', 'pptx'];
  const archiveExtensions = ['zip', 'rar', '7z', 'tar', 'gz'];
  
  if (documentExtensions.includes(extension)) return 'document';
  if (archiveExtensions.includes(extension)) return 'archive';
  
  return 'file';
};

// Валидация файла
export const validateFile = (file, options = {}) => {
  const {
    maxSize = 100 * 1024 * 1024, // 100MB по умолчанию
    allowedTypes = [],
    allowedExtensions = []
  } = options;
  
  const errors = [];
  
  // Проверка размера
  if (file.size > maxSize) {
    errors.push(`Файл слишком большой. Максимальный размер: ${formatFileSize(maxSize)}`);
  }
  
  // Проверка типа MIME
  if (allowedTypes.length > 0) {
    const isAllowedType = allowedTypes.some(type => {
      if (type.endsWith('/*')) {
        return file.type.startsWith(type.slice(0, -1));
      }
      return file.type === type;
    });
    
    if (!isAllowedType) {
      errors.push('Неподдерживаемый тип файла');
    }
  }
  
  // Проверка расширения
  if (allowedExtensions.length > 0) {
    const extension = file.name.toLowerCase().split('.').pop();
    if (!allowedExtensions.includes(extension)) {
      errors.push('Неподдерживаемое расширение файла');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Создание превью для файла
export const createFilePreview = async (file) => {
  const fileType = getFileType(file);
  let previewUrl = null;
  
  try {
    if (fileType === 'photo' || fileType === 'video') {
      previewUrl = URL.createObjectURL(file);
    }
    
    // Для видео можем создать thumbnail
    if (fileType === 'video') {
      // Оставляем URL как есть, превью будет создано в компоненте
      // при помощи video элемента
    }
    
    return {
      id: Date.now() + Math.random(),
      file,
      name: file.name,
      size: file.size,
      type: fileType,
      url: previewUrl,
      lastModified: file.lastModified
    };
    
  } catch (error) {
    console.error('Error creating file preview:', error);
    return {
      id: Date.now() + Math.random(),
      file,
      name: file.name,
      size: file.size,
      type: fileType,
      url: null,
      lastModified: file.lastModified
    };
  }
};

// Обработка множественных файлов
export const processFiles = async (files, setAttachments, options = {}) => {
  const {
    replace = false,
    maxFiles = 10,
    validate = true,
    validationOptions = {}
  } = options;
  
  try {
    const fileArray = Array.isArray(files) ? files : Array.from(files);
    
    if (fileArray.length === 0) return;
    
    // Валидация если включена
    const validFiles = [];
    const errors = [];
    
    for (const file of fileArray) {
      if (validate) {
        const validation = validateFile(file, validationOptions);
        if (!validation.isValid) {
          errors.push(`${file.name}: ${validation.errors.join(', ')}`);
          continue;
        }
      }
      validFiles.push(file);
    }
    
    // Показываем ошибки валидации
    if (errors.length > 0) {
      console.warn('File validation errors:', errors);
      // Можно показать toast или alert
    }
    
    if (validFiles.length === 0) return;
    
    // Проверяем лимит файлов
    const filesToProcess = validFiles.slice(0, maxFiles);
    if (filesToProcess.length < validFiles.length) {
      console.warn(`Only first ${maxFiles} files will be processed`);
    }
    
    // Создаем превью для файлов
    const processedFiles = await Promise.all(
      filesToProcess.map(file => createFilePreview(file))
    );
    
    // Обновляем состояние
    setAttachments(prev => {
      if (replace) {
        // Освобождаем старые URLs
        prev.forEach(item => {
          if (item.url && item.url.startsWith('blob:')) {
            URL.revokeObjectURL(item.url);
          }
        });
        return processedFiles;
      } else {
        return [...prev, ...processedFiles];
      }
    });
    
    return processedFiles;
    
  } catch (error) {
    console.error('Error processing files:', error);
    throw error;
  }
};

// Очистка URLs (для освобождения памяти)
export const cleanupFileUrls = (files) => {
  files.forEach(file => {
    if (file.url && file.url.startsWith('blob:')) {
      URL.revokeObjectURL(file.url);
    }
  });
};

// Проверка поддержки API
export const checkApiSupport = () => {
  return {
    fileApi: !!(window.File && window.FileReader && window.FileList && window.Blob),
    dragAndDrop: 'draggable' in document.createElement('span'),
    clipboard: !!navigator.clipboard,
    camera: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
    mediaRecorder: !!window.MediaRecorder
  };
};

// Сжатие изображений (опционально)
export const compressImage = async (file, options = {}) => {
  const {
    maxWidth = 1920,
    maxHeight = 1080,
    quality = 0.8,
    outputFormat = 'image/jpeg'
  } = options;

  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // Вычисляем новые размеры с сохранением пропорций
      let { width, height } = img;
      
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      
      if (height > maxHeight) {
        width = (width * maxHeight) / height;
        height = maxHeight;
      }

      canvas.width = width;
      canvas.height = height;

      // Рисуем изображение на canvas
      ctx.drawImage(img, 0, 0, width, height);

      // Конвертируем в blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: outputFormat,
              lastModified: Date.now()
            });
            resolve(compressedFile);
          } else {
            reject(new Error('Failed to compress image'));
          }
        },
        outputFormat,
        quality
      );
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
};

// Создание thumbnail для видео
export const createVideoThumbnail = async (file, timeOffset = 1) => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    video.onloadeddata = () => {
      video.currentTime = Math.min(timeOffset, video.duration);
    };

    video.onseeked = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      ctx.drawImage(video, 0, 0);
      
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create thumbnail'));
        }
      }, 'image/jpeg', 0.7);
      
      URL.revokeObjectURL(video.src);
    };

    video.onerror = () => {
      reject(new Error('Failed to load video'));
      URL.revokeObjectURL(video.src);
    };

    video.src = URL.createObjectURL(file);
  });
};

// Drag & Drop обработчики
export const createDragDropHandlers = (onFilesDropped) => {
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      onFilesDropped(files);
    }
  };

  return {
    onDragOver: handleDragOver,
    onDragEnter: handleDragEnter,
    onDragLeave: handleDragLeave,
    onDrop: handleDrop
  };
};

// Обработка файлов из буфера обмена
export const handleClipboardPaste = async (e, onFilesFound) => {
  const items = e.clipboardData?.items;
  if (!items) return false;

  const files = [];
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    
    if (item.kind === 'file') {
      const file = item.getAsFile();
      if (file) {
        files.push(file);
      }
    }
  }

  if (files.length > 0) {
    onFilesFound(files);
    return true;
  }

  return false;
};