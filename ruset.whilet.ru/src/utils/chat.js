export const getOnlineStatus = (chat) => {
    if (chat.type !== "private" || !chat.lastSeen) return null;

    const lastSeenDate = new Date(chat.lastSeen);
    const now = new Date();
    const diffInMinutes = Math.abs(now - lastSeenDate) / 60000;

    if (diffInMinutes < 60) return "был(а) недавно";
    if (diffInMinutes < 1440) {
        const hours = Math.floor(diffInMinutes / 60);
        return `был(а) ${hours}ч назад`;
    }
    return "был(а) давно";
};
