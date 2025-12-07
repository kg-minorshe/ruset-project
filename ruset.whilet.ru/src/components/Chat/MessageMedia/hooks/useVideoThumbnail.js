import { useState, useEffect } from "react";

export function useVideoThumbnail(videoUrl, fallbackThumbnail = null) {
    const [thumbnail, setThumbnail] = useState(fallbackThumbnail);

    useEffect(() => {
        if (!videoUrl || fallbackThumbnail) {
            setThumbnail(fallbackThumbnail);
            return;
        }

        const video = document.createElement("video");
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        video.crossOrigin = "anonymous";
        video.src = videoUrl;
        video.currentTime = 1;

        video.addEventListener("loadeddata", () => {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            const scale = 320 / video.videoWidth;
            canvas.width = video.videoWidth * scale;
            canvas.height = video.videoHeight * scale;

            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            try {
                const dataUrl = canvas.toDataURL("image/jpeg");
                setThumbnail(dataUrl);
            } catch (err) { }
        });

        video.load();
    }, [videoUrl, fallbackThumbnail]);

    return thumbnail;
}