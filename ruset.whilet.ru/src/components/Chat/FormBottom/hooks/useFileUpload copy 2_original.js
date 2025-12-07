import { useState, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

export const useFileUpload = () => {
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState([]);
    const activeUploads = useRef(new Map());
    const cancelledUploads = useRef(new Set());

    const clearUploadProgress = () => {
        setUploadProgress([]);
    };

    const getHeaders = async () => {
        const { value } = await Preferences.get({ key: "WTOKEN" });
        return {
            'Origin': 'https://whilet.ru',
            'Referer': 'https://whilet.ru',
            ...(value ? { 'Authorization': `Bearer ${value}` } : {})
        };
    };

    const base64ToBlob = (base64, mimeType) => {
        const byteString = atob(base64.split(',')[1] || base64);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }
        return new Blob([ab], { type: mimeType });
    };

    const uploadFileToServer = async (file, onProgress, abortSignal) => {
        const formData = new FormData();
        const headers = await getHeaders();

        let fileData;
        let fileName = file.name || `file_${Date.now()}`;
        let mimeType = file.type || 'application/octet-stream';

        try {
            if (Capacitor.isNativePlatform() && file.path) {
                // Читаем файл по пути (все файлы теперь сохранены в Cache)
                const readFileResult = await Filesystem.readFile({
                    path: file.path,
                    directory: Directory.Cache,
                });

                const base64Data = readFileResult.data;
                fileData = base64ToBlob(base64Data, mimeType);
            } else {
                // Веб или fallback
                fileData = file instanceof Blob ? file : new Blob([file], { type: mimeType });
            }

            formData.append("file", fileData, fileName);

            return await new Promise((resolve, reject) => {
                const total = fileData.size;
                let loaded = 0;
                let progressInterval;

                const updateProgress = (loaded, total) => {
                    if (onProgress) {
                        onProgress({ lengthComputable: true, loaded, total });
                    }
                };

                progressInterval = setInterval(() => {
                    if (loaded >= total || cancelledUploads.current.has(file.id)) {
                        clearInterval(progressInterval);
                        return;
                    }
                    loaded += Math.max(1, Math.floor(total * 0.1));
                    updateProgress(Math.min(loaded, total), total);
                }, 200);

                fetch(process.env.NEXT_PUBLIC_URL_API_MAIN + "/v2/ruset/chat/uploadFile", {
                    method: 'POST',
                    headers,
                    body: formData,
                    signal: abortSignal,
                })
                    .then(async (response) => {
                        clearInterval(progressInterval);
                        updateProgress(total, total);

                        if (cancelledUploads.current.has(file.id)) {
                            return reject(new Error("Upload cancelled"));
                        }

                        if (!response.ok) {
                            const text = await response.text();
                            throw new Error(`Upload failed: ${response.status} ${text}`);
                        }
                        return response.json();
                    })
                    .then(data => {
                        if (cancelledUploads.current.has(file.id)) {
                            reject(new Error("Upload cancelled"));
                        } else {
                            resolve(data.data);
                        }
                    })
                    .catch(error => {
                        clearInterval(progressInterval);
                        if (error.name === 'AbortError' || error.message === "Upload cancelled") {
                            cancelledUploads.current.add(file.id);
                            reject(new Error("Upload cancelled"));
                        } else {
                            reject(error);
                        }
                    });
            });
        } catch (error) {
            console.error('Ошибка на мобильной платформе:', error);
            throw error;
        }
    };

    const uploadFiles = async (attachments, isTypeFileMode = false) => {
        setIsUploading(true);
        setUploadProgress([]);

        const uploadedMedia = [];

        try {
            for (let i = 0; i < attachments.length; i++) {
                const attachment = attachments[i];

                if (cancelledUploads.current.has(attachment.id)) continue;

                const initialProgress = {
                    id: attachment.id,
                    name: attachment.name,
                    size: attachment.size,
                    progress: 0,
                    loaded: 0,
                    status: "uploading",
                    url: null,
                    storage_name: null,
                };

                setUploadProgress((prev) => [...prev, initialProgress]);

                try {
                    const uploadResult = await uploadFileToServer(
                        attachment.file,
                        (progressEvent) => {
                            if (cancelledUploads.current.has(attachment.id)) return;

                            const percentCompleted = Math.round(
                                (progressEvent.loaded * 100) / progressEvent.total
                            );
                            setUploadProgress((prev) =>
                                prev.map((item) =>
                                    item.id === attachment.id
                                        ? { ...item, progress: percentCompleted, loaded: progressEvent.loaded }
                                        : item
                                )
                            );
                        }
                    );

                    if (cancelledUploads.current.has(attachment.id)) {
                        setUploadProgress((prev) => prev.filter((p) => p.id !== attachment.id));
                        continue;
                    }

                    uploadedMedia.push({
                        id: attachment.id,
                        name: uploadResult.name,
                        type: attachment.file?.isVoiceNote || uploadResult.name === "Голосовое сообщение"
                            ? "audio"
                            : (isTypeFileMode
                                ? "file"
                                : (attachment.sendAsFile ? "file" : uploadResult.type)),
                        url: uploadResult.url,
                        size: uploadResult.size,
                        storage_name: uploadResult.storage_name,
                    });

                    setUploadProgress((prev) =>
                        prev.map((item) =>
                            item.id === attachment.id
                                ? {
                                    ...item,
                                    status: "completed",
                                    progress: 100,
                                    url: uploadResult.url,
                                    storage_name: uploadResult.storage_name
                                }
                                : item
                        )
                    );

                    // Опционально: удалить временный файл после успешной загрузки
                    if (Capacitor.isNativePlatform() && attachment.file.path) {
                        try {
                            await Filesystem.deleteFile({
                                path: attachment.file.path,
                                directory: Directory.Cache,
                            });
                        } catch (e) {
                            console.warn('Не удалось удалить временный файл:', e);
                        }
                    }
                } catch (error) {
                    if (error.message === "Upload cancelled") {
                        setUploadProgress((prev) => prev.filter((p) => p.id !== attachment.id));
                        continue;
                    }

                    setUploadProgress((prev) =>
                        prev.map((item) =>
                            item.id === attachment.id
                                ? { ...item, status: "error", progress: 0 }
                                : item
                        )
                    );
                }
            }

            return uploadedMedia;
        } catch (error) {
            console.error("Ошибка загрузки:", error);
            throw error;
        } finally {
            setIsUploading(false);
            activeUploads.current.clear();
            cancelledUploads.current.clear();
        }
    };

    const cancelAllUploads = () => {
        activeUploads.current.forEach((_, fileId) => {
            cancelledUploads.current.add(fileId);
        });

        activeUploads.current.forEach(({ xhr }) => {
            if (xhr && xhr.readyState !== 4) {
                xhr.abort();
            }
        });

        activeUploads.current.clear();
        setUploadProgress([]);
    };

    return {
        isUploading,
        uploadProgress,
        uploadFiles,
        cancelAllUploads,
        clearUploadProgress
    };
};