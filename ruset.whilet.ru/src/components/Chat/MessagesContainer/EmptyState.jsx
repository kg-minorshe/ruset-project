import React, { memo } from "react";

const EmptyState = memo(({ chatMessagesLoading, currentUser }) => {
  if (chatMessagesLoading || !currentUser) {
    return (
      <div className="is-no-info">
        <p>Загружаем чат...</p>
      </div>
    );
  }

  return (
    <div className="is-no-info">
      <p>Сообщений пока нет... Начни диалог с пользователем первым!</p>
    </div>
  );
});

EmptyState.displayName = "EmptyState";

export default EmptyState;
