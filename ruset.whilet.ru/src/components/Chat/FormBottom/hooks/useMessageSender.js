import { walert } from "@/utils/miniModal";
import { httpRSCap } from "@/utils/http";
export const useMessageSender = ({
    messages,
    setMessages,
    chatData,
    chatInfo,
    currentUser,
    onMessageSent,
    uploadFiles,
}) => {
    const sendMessage = async ({
        currentText,
        mediaAttachments,
        setMediaAttachments,
        replyingTo,
        setReplyingTo,
        inputRef,
        fileInputRef,
        typeFile
    }) => {
        // if (!currentText.trim() && mediaAttachments.length === 0) return;

        let uploadedMedia = [];

        if (mediaAttachments.length > 0) {
            try {
                uploadedMedia = await uploadFiles(mediaAttachments, typeFile);

                // Очищаем attachments и освобождаем URL
                mediaAttachments.forEach((item) => {
                    if (item.url) {
                        URL.revokeObjectURL(item.url);
                    }
                });
                setMediaAttachments([]);
            } catch (error) {
                console.error("Ошибка загрузки:", error);
                walert(500, "Ошибка при загрузке файлов", error);
                return;
            }
        }

        const dateNow = Date.now();
        const newMsg = {
            id: dateNow,
            temp_id: dateNow,
            text: currentText.trim(),
            sender: "me",
            user_id: currentUser?.id || 1,
            username: currentUser?.username || "Юзер",
            login: currentUser?.login || "user",
            avatar: currentUser?.avatar,
            role: currentUser?.role,
            reply_to: replyingTo?.id ?? null,
            created_at: new Date().toISOString(),
            chatId: chatInfo?.id,
            chatType: chatInfo?.type || "private",
            sendingStatus: "sending",
            is_pinned: false,
            is_edited: false,
            is_read: false,
            reactions: {},
            views: chatInfo?.type === "channel" ? 0 : undefined,
            media: uploadedMedia.length > 0
                ? uploadedMedia.length === 1
                    ? uploadedMedia[0]
                    : uploadedMedia
                : null,
        };

        setMessages((prev) => [...prev, newMsg]);
        setReplyingTo(null);
        onMessageSent?.();

        try {
            const response = await httpRSCap(
                process.env.NEXT_PUBLIC_URL_API_MAIN + `/v2/ruset/chat/sendMessage/${chatData.login}`,
                {
                    method: "POST",
                    credentials: "include",
                    headers: {
                        Origin: "https://whilet.ru",
                        Referer: "https://whilet.ru",
                        Accept: "application/json",
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ message: newMsg }),
                }
            );

            const data = await response.json();
            if (!response.ok) {
                setMessages((prev) =>
                    prev.map((msg) =>
                        msg.id === dateNow ? { ...msg, sendingStatus: "failed" } : msg
                    )
                );
                walert(data.status, data.message);
                return;
            }

            setMessages((prev) => {
                const updatedMessages = prev.filter(msg => msg.id !== dateNow);
                return [
                    ...updatedMessages,
                    {
                        ...newMsg,
                        ...data.data,
                        sendingStatus: "sent"
                    }
                ];
            });
        } catch (error) {
            console.error("Ошибка отправки:", error);
            walert(500, "Не удалось отправить сообщение", error);
        }
    };

    const editMessage = async ({
        editingMessageId,
        currentText,
        setEditingMessageId,
        setEditText,
    }) => {
        setEditingMessageId(null);
        setEditText("");

        try {
            setMessages((prev) =>
                prev.map((msg) =>
                    msg.id === editingMessageId
                        ? { ...msg, text: currentText.trim(), sendingStatus: "sending" }
                        : msg
                )
            );

            const response = await httpRSCap(
                process.env.NEXT_PUBLIC_URL_API_MAIN + `/v2/ruset/chat/editMessage/${chatData.login}/${editingMessageId}`,
                {
                    method: "POST",
                    credentials: "include",
                    headers: {
                        Origin: "https://whilet.ru",
                        Referer: "https://whilet.ru",
                        Accept: "application/json",
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ text: currentText.trim() }),
                }
            );

            const data = await response.json();
            if (!response.ok) {
                setMessages((prev) =>
                    prev.map((msg) =>
                        msg.id === editingMessageId
                            ? { ...msg, sendingStatus: "failed" }
                            : msg
                    )
                );
                walert(data.status, data.message);
                return;
            }

            setMessages((prev) =>
                prev.map((msg) =>
                    msg.id === editingMessageId
                        ? { ...msg, is_edited: true, sendingStatus: "completed" }
                        : msg
                )
            );
        } catch (error) {
            console.error("Ошибка редактирования:", error);
            walert(500, "Не удалось изменить сообщение", error);

        }
    };

    return { sendMessage, editMessage };
};