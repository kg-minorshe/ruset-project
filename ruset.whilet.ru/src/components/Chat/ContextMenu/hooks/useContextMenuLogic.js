import { useCallback, useMemo } from "react";
import { httpRSCap } from "@/utils/http";
import { walert } from "@/utils/miniModal";
export const useContextMenuLogic = ({
    contextMenu,
    messages,
    currentUser,
    chatData,
    setMessages,
    setEditingMessageId,
    setEditText,
    setSelectionMode,
    setSelectedMessages,
    onReply,
    onPinMessage,
    toggleReaction,
    showReactionPicker,
    messagesContainerRef,
    updateScrollInfo,
    closeContextMenu,
}) => {
    const messageId = contextMenu.messageId;

    const getMessageById = useCallback(
        (id) => messages.find((msg) => msg.id === id),
        [messages]
    );

    const currentMessage = useMemo(() => {
        if (!messageId) return null;
        return getMessageById(messageId);
    }, [messageId, getMessageById]);

    const hasMediaContent = useMemo(() => {
        if (!messageId || !currentMessage?.media) return false;
        return Array.isArray(currentMessage.media)
            ? currentMessage.media.length > 0
            : true;
    }, [messageId, currentMessage]);

    const getCurrentUserReactions = useCallback(() => {
        if (!messageId || !currentMessage?.reactions) return [];
        return Object.entries(currentMessage.reactions)
            .filter(([_, data]) => data.users?.includes(currentUser?.id))
            .map(([emoji]) => emoji);
    }, [messageId, currentMessage, currentUser?.id]);

    const handleCopyText = useCallback(() => {
        if (!messageId || !currentMessage?.text) return;
        navigator.clipboard
            .writeText(currentMessage.text)
            .catch(() => {
                const ta = document.createElement("textarea");
                ta.value = currentMessage.text;
                ta.style.cssText = "position:fixed; opacity:0;";
                document.body.appendChild(ta);
                ta.focus();
                ta.select();
                document.execCommand("copy");
                document.body.removeChild(ta);
            });
        closeContextMenu();
    }, [messageId, currentMessage, closeContextMenu]);

    const handleEditMessage = useCallback(() => {
        if (!messageId || !currentMessage) return;
        updateScrollInfo();
        setEditingMessageId(messageId);
        setEditText(currentMessage.text);
        closeContextMenu();
    }, [
        messageId,
        currentMessage,
        updateScrollInfo,
        setEditingMessageId,
        setEditText,
        closeContextMenu,
    ]);

    const handleReply = useCallback(() => {
        if (messageId) onReply(messageId);
        closeContextMenu();
    }, [messageId, onReply, closeContextMenu]);

    const handlePinMessage = useCallback(() => {
        if (messageId) onPinMessage(messageId);
        closeContextMenu();
    }, [messageId, onPinMessage, closeContextMenu]);

    const handleSelectMessage = useCallback(() => {
        if (messageId) {
            setTimeout(() => {
                setSelectedMessages([messageId]);
                setSelectionMode(true);
            }, 0);
        }
        closeContextMenu();
    }, [messageId, setSelectedMessages, setSelectionMode, closeContextMenu]);

    const handleDownloadMedia = useCallback(() => {
        if (!messageId || !currentMessage?.media) return;

        const downloadFile = (url, filename) => {
            fetch(url)
                .then((res) => res.blob())
                .then((blob) => {
                    const blobUrl = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = blobUrl;
                    a.download = filename;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(blobUrl);
                })
                .catch(() => window.open(currentMessage.media.url, "_blank"));
        };

        const mediaItems = Array.isArray(currentMessage.media)
            ? currentMessage.media
            : [currentMessage.media];

        mediaItems.forEach((item, index) => {
            const filename = item.name || item.caption || `file-${index + 1}`;
            setTimeout(() => downloadFile(item.url, filename), index * 300);
        });
    }, [messageId, currentMessage]);

    const handleDeleteMessage = useCallback(async () => {
        if (!messageId) return;
        closeContextMenu();
        updateScrollInfo();

        setMessages((prev) =>
            prev.map((msg) =>
                msg.id === messageId ? { ...msg, sendingStatus: "loading" } : msg
            )
        );

        try {
            const response = await httpRSCap(
                process.env.NEXT_PUBLIC_URL_API_MAIN + `/v2/ruset/chat/deleteMessages/${chatData.login}`,
                {
                    method: "DELETE",
                    credentials: "include",
                    headers: {
                        Origin: "https://whilet.ru",
                        Referer: "https://whilet.ru",
                        Accept: "application/json",
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ mids: [messageId] }),
                }
            );

            if (!response.ok) throw new Error();

            setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
        } catch (error) {
            setMessages((prev) =>
                prev.map((msg) =>
                    msg.id === messageId ? { ...msg, sendingStatus: "failed" } : msg
                )
            );
            walert(500, "Не удалось удалить сообщение");
        }
    }, [messageId, updateScrollInfo, setMessages, chatData.login, closeContextMenu]);

    const handleReactionClick = useCallback(
        (emoji) => {
            const scrollPos = messagesContainerRef.current?.scrollTop;
            const userReactions = getCurrentUserReactions();
            const hasReaction = userReactions.includes(emoji);
            const maxReactions = currentUser?.isPremium ? 5 : 1;

            if (hasReaction) {
                toggleReaction(messageId, emoji, "remove");
            } else if (userReactions.length >= maxReactions) {
                walert(403,
                    currentUser?.isPremium
                        ? `Максимум ${maxReactions} реакций`
                        : "Только 1 реакция. Премиум — 5!"
                );
            } else {
                toggleReaction(messageId, emoji, "add");
            }

            closeContextMenu();

            setTimeout(() => {
                if (messagesContainerRef.current) {
                    messagesContainerRef.current.scrollTop = scrollPos;
                }
            }, 0);
        },
        [
            messageId,
            getCurrentUserReactions,
            currentUser,
            toggleReaction,
            closeContextMenu,
            messagesContainerRef,
        ]
    );

    const handleShowMoreReactions = useCallback(() => {
        const rect = document.querySelector(".ContextMenu .contextMenuContainer")?.getBoundingClientRect();
        const userReactions = getCurrentUserReactions();

        if (rect && showReactionPicker) {
            showReactionPicker(
                messageId,
                rect.left,
                rect.top - 60,
                userReactions,
                !!currentUser?.isPremium
            );
        }
        closeContextMenu();
    }, [
        messageId,
        getCurrentUserReactions,
        showReactionPicker,
        currentUser,
        closeContextMenu,
    ]);

    const quickReactions = useMemo(() => ["❤️", "⚡", "🤣", "😁", "😎"], []);

    return {
        currentMessage,
        hasMediaContent,
        handleCopyText,
        handleEditMessage,
        handleReply,
        handlePinMessage,
        handleSelectMessage,
        handleDeleteMessage,
        handleDownloadMedia,
        handleReactionClick,
        handleShowMoreReactions,
        getCurrentUserReactions,
        quickReactions,
    };
};