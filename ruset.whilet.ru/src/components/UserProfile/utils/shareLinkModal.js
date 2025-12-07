export function shareLinkModal(login) {
  // Проверяем поддержку Web Share API
  if (navigator.share) {
    const shareData = {
      title: 'Профиль пользователя',
      text: `Посмотрите профиль пользователя @${login}`,
      url: `https://profile.whilet.ru/${login}`,
    };

    navigator.share(shareData)
      .catch((error) => {
        console.log('Ошибка при попытке поделиться:', error);
        fallbackShareMethod(login);
      });
  } else {
    // Fallback метод для браузеров без поддержки Web Share API
    fallbackShareMethod(login);
  }
}

function fallbackShareMethod(login) {
  const profileUrl = `https://profile.whilet.ru/${login}`;
  
  // Создаем временный input для копирования в буфер обмена
  const tempInput = document.createElement('input');
  tempInput.value = profileUrl;
  document.body.appendChild(tempInput);
  tempInput.select();
  tempInput.setSelectionRange(0, 99999); // Для мобильных устройств

  try {
    const successful = document.execCommand('copy');
    document.body.removeChild(tempInput);
    
    if (successful) {
      // Показываем уведомление об успешном копировании
      showNotification('Ссылка скопирована в буфер обмена');
    } else {
      // Если копирование не удалось, открываем ссылку в новом окне
      window.open(profileUrl, '_blank');
    }
  } catch (err) {
    document.body.removeChild(tempInput);
    // В случае ошибки открываем ссылку в новом окне
    window.open(profileUrl, '_blank');
  }
}

function showNotification(message) {
  // Создаем элемент уведомления
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #333;
    color: white;
    padding: 12px 20px;
    border-radius: 4px;
    z-index: 10000;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 14px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
  `;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  // Автоматически удаляем уведомление через 3 секунды
  setTimeout(() => {
    if (document.body.contains(notification)) {
      document.body.removeChild(notification);
    }
  }, 3000);
}