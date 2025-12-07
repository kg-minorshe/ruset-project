import { useState, useEffect, useCallback } from 'react';
export const useSlowMode = (chatInfo, currentUser) => {
    const [lastMessageTime, setLastMessageTime] = useState(0);
    const getUserInfo = useCallback(
        (userId) => {
            if (!chatInfo) return null;

            const participant =
                chatInfo.participants &&
                chatInfo.participants.find(
                    (p) => p.id === userId || p.user_id === userId
                );

            if (participant) {
                return {
                    id: participant.id,
                    username:
                        participant.username || participant.login || "Пользователь",
                    avatar: participant.avatar || null,
                    role: participant.role || null,
                    login: participant.login || null,
                };
            }

            if (chatInfo.user_id === userId) {
                return {
                    id: chatInfo.user_id,
                    username: chatInfo.name || "Пользователь",
                    avatar: chatInfo.avatar || null,
                    role: "owner",
                    login: chatInfo.login || null,
                };
            }

            return {
                id: userId,
                username: "Неизвестно",
                avatar: null,
                role: null,
                login: null,
            };
        },
        [chatInfo, currentUser]
    );

    const getSlowModeTimeLeft = () => {
        if (!chatInfo?.settings?.slowMode) return 0;
        const timeSinceLastMessage = (Date.now() - lastMessageTime) / 1000;
        return Math.max(0, chatInfo.settings.slowMode - timeSinceLastMessage);
    };

    const canSendMessages = () => {
        if (!chatInfo || !currentUser) return true;
        if (chatInfo.type === "private") return true;
        if (chatInfo.type === "channel") {
            return ["owner", "admin"].includes(getUserInfo(currentUser.id).role);
        }
        if (chatInfo.type === "group") {
            if (
                !chatInfo.settings.can_members_send_messages &&
                !["owner", "admin", "moderator"].includes(currentUser.role)
            ) {
                return false;
            }
        }
        return true;
    };

    const canSendNow = () => {
        if (!chatInfo?.settings?.slowMode) return true;
        if (["owner", "admin", "moderator"].includes(currentUser?.role))
            return true;
        return getSlowModeTimeLeft() <= 0;
    };

    return {
        lastMessageTime,
        setLastMessageTime,
        getSlowModeTimeLeft,
        canSendMessages,
        canSendNow,
    };
};