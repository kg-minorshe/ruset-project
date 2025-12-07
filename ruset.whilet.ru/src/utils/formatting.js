export const formatCount = (count, type) => {
    if (!count || !type) return;
    if (count < 1000) {
        if (type === "channel") return `${count} подписчиков`;
        if (type === "group") return `${count} участников`;
        return String(count);
    }

    if (count < 1_000_000) {
        return `${(count / 1000).toFixed(1)}K`;
    }

    return `${(count / 1_000_000).toFixed(1)}M`;
};

export const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
};

export const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + " B";
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    else if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + " MB";
    else return (bytes / 1073741824).toFixed(1) + " GB";
};