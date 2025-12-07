// components/modals/CreateGroupModal.jsx
import React, { useState, useCallback, useEffect } from "react";
import {
  BiX,
  BiUser,
  BiCheck,
  BiSearch,
  BiGroup,
  BiImage,
  BiLoaderAlt,
} from "react-icons/bi";
import "./Modal.scss";
import { walert } from "@/utils/miniModal";

const CreateGroupModal = ({ isOpen, onClose, onSubmit }) => {
  const [step, setStep] = useState(1);
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [groupName, setGroupName] = useState("");
  const [groupLogin, setGroupLogin] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [groupAvatar, setGroupAvatar] = useState(null);
  const [isPublic, setIsPublic] = useState(true);
  const [contacts, setContacts] = useState([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Загрузка контактов при открытии модалки
  useEffect(() => {
    if (isOpen && step === 1 && contacts.length === 0) {
      loadContacts();
    }
  }, [isOpen, step]);

  const loadContacts = async () => {
    setIsLoadingContacts(true);
    try {
      const token = localStorage.getItem("WTOKEN");
      const response = await fetch(`${process.env.NEXT_PUBLIC_URL_API_MAIN}/v2/ruset/contacts`, {
        credentials: "include",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (data.status === 200) {
        setContacts(data.data.contacts || []);
      } else {
        walert(data.status, data.message || "Ошибка загрузки контактов");
      }
    } catch (error) {
      console.error("Error loading contacts:", error);
      walert(500, "Ошибка загрузки контактов");
    } finally {
      setIsLoadingContacts(false);
    }
  };

  const filteredContacts = contacts.filter(
    (contact) =>
      contact.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.login.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleContact = useCallback((contact) => {
    setSelectedContacts((prev) => {
      const isSelected = prev.some((c) => c.id === contact.id);
      if (isSelected) {
        return prev.filter((c) => c.id !== contact.id);
      } else {
        return [...prev, contact];
      }
    });
  }, []);

  const handleNext = useCallback(() => {
    if (selectedContacts.length === 0) {
      walert(403, "Выберите хотя бы одного участника");
      return;
    }
    setStep(2);
  }, [selectedContacts]);

  const handleSubmit = useCallback(async () => {
    if (!groupName.trim()) {
      walert(403, "Введите название группы");
      return;
    }

    setIsCreating(true);

    try {
      const token = localStorage.getItem("WTOKEN");

      const groupData = {
        name: groupName.trim(),
        login: groupLogin.trim(),
        description: groupDescription.trim(),
        avatar: groupAvatar,
        is_public: isPublic,
        participants: selectedContacts.map((c) => c.id),
      };

      const response = await fetch(`${process.env.NEXT_PUBLIC_URL_API_MAIN}/v2/ruset/new/createGroup`, {
        method: "POST",
        credentials: "include",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(groupData),
      });

      const data = await response.json();

      if (data.status === 200) {
        walert(200, "Группа успешно создана");
        onClose();
        // Сброс формы
        setStep(1);
        setSelectedContacts([]);
        setGroupName("");
        setGroupLogin("");
        setGroupDescription("");
        setGroupAvatar(null);
        setIsPublic(true);
      } else {
        walert(data.status, data.message || "Ошибка создания группы");
      }
    } catch (error) {
      console.error("Error creating group:", error);
      walert(500, "Ошибка при создании группы");
    } finally {
      setIsCreating(false);
    }
  }, [
    groupName,
    groupLogin,
    groupDescription,
    groupAvatar,
    isPublic,
    selectedContacts,
    onSubmit,
    onClose,
  ]);

  const handleAvatarChange = useCallback((e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        walert(400, "Размер изображения не должен превышать 5 МБ");
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => setGroupAvatar(e.target.result);
      reader.readAsDataURL(file);
    }
  }, []);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content create-group-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3>
            <BiGroup />
            {step === 1 ? "Новая группа" : "Настройки группы"}
          </h3>
          <button className="close-button" onClick={onClose}>
            <BiX />
          </button>
        </div>

        {step === 1 ? (
          <>
            <div className="modal-body">
              <div className="search-container">
                <BiSearch className="search-icon" />
                <input
                  type="text"
                  placeholder="Поиск контактов..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
              </div>

              {selectedContacts.length > 0 && (
                <div className="selected-contacts">
                  <h4>Выбранные участники ({selectedContacts.length})</h4>
                  <div className="selected-contacts-list">
                    {selectedContacts.map((contact) => (
                      <div key={contact.id} className="selected-contact">
                        <div className="contact-avatar">
                          {contact.avatar ? (
                            <img src={contact.avatar} alt="" />
                          ) : (
                            <BiUser />
                          )}
                        </div>
                        <span className="contact-name">{contact.username}</span>
                        <button
                          className="remove-contact"
                          onClick={() => toggleContact(contact)}
                        >
                          <BiX />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {isLoadingContacts ? (
                <div className="loading-contacts">
                  <BiLoaderAlt className="spinner spin" />
                  <span>Загрузка контактов...</span>
                </div>
              ) : (
                <div className="contacts-list">
                  <h4>Контакты ({filteredContacts.length})</h4>
                  {filteredContacts.length === 0 ? (
                    <div className="no-contacts">
                      <BiUser />
                      <p>Контакты не найдены</p>
                      <small>
                        Начните общение с пользователями, чтобы добавить их в
                        контакты
                      </small>
                    </div>
                  ) : (
                    filteredContacts.map((contact) => {
                      const isSelected = selectedContacts.some(
                        (c) => c.id === contact.id
                      );
                      return (
                        <div
                          key={contact.id}
                          className={`contact-item ${
                            isSelected ? "selected" : ""
                          }`}
                          onClick={() => toggleContact(contact)}
                        >
                          <div className="contact-avatar">
                            {contact.avatar ? (
                              <img src={contact.avatar} alt="" />
                            ) : (
                              <BiUser />
                            )}
                            {contact.isOnline && (
                              <div className="online-dot"></div>
                            )}
                          </div>
                          <div className="contact-info">
                            <div className="contact-name">
                              {contact.username}
                              {contact.verified && (
                                <span className="verified">✓</span>
                              )}
                            </div>
                            <div className="contact-login">
                              @{contact.login}
                            </div>
                          </div>
                          {isSelected && (
                            <div className="check-icon">
                              <BiCheck />
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="cancel-button" onClick={onClose}>
                Отмена
              </button>
              <button
                className="next-button"
                onClick={handleNext}
                disabled={selectedContacts.length === 0}
              >
                Далее ({selectedContacts.length})
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="modal-body">
              <div className="group-settings">
                <div className="avatar-section">
                  <div className="group-avatar">
                    {groupAvatar ? (
                      <img src={groupAvatar} alt="Group avatar" />
                    ) : (
                      <BiGroup />
                    )}
                    <label className="avatar-upload">
                      <BiImage />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        hidden
                      />
                    </label>
                  </div>
                </div>

                <div className="form-group">
                  <label>Название группы</label>
                  <input
                    type="text"
                    placeholder="Введите название группы"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    maxLength={50}
                  />
                  <small>{groupName.length}/50</small>
                </div>

                <div className="form-group">
                  <label>Ссылка на группу (необязательно)</label>
                  <div className="link-input">
                    <span className="link-prefix">rs.whilet.ru/c/</span>
                    <input
                      type="text"
                      placeholder="group_link"
                      value={groupLogin}
                      onChange={(e) => {
                        const value = e.target.value.replace(
                          /[^a-zA-Z0-9_]/g,
                          ""
                        );
                        setGroupLogin(value);
                      }}
                      maxLength={30}
                    />
                  </div>
                  <small>{groupLogin.length}/30</small>
                  <small>Только латинские буквы, цифры и подчеркивания</small>
                </div>

                <div className="form-group">
                  <label>Описание (необязательно)</label>
                  <textarea
                    placeholder="Введите описание группы"
                    value={groupDescription}
                    onChange={(e) => setGroupDescription(e.target.value)}
                    maxLength={200}
                    rows={3}
                  />
                  <small>{groupDescription.length}/200</small>
                </div>

                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={isPublic}
                      onChange={(e) => setIsPublic(e.target.checked)}
                    />
                    <span className="checkmark"></span>
                    Публичная группа
                  </label>
                  <small>Публичные группы можно найти в поиске</small>
                </div>

                <div className="participants-preview">
                  <h4>Участники ({selectedContacts.length + 1})</h4>
                  <div className="participants-list">
                    <div className="participant-item">
                      <BiUser />
                      <span>Вы (администратор)</span>
                    </div>
                    {selectedContacts.map((contact) => (
                      <div key={contact.id} className="participant-item">
                        {contact.avatar ? (
                          <img src={contact.avatar} alt="" />
                        ) : (
                          <BiUser />
                        )}
                        <span>{contact.username}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="back-button"
                onClick={() => setStep(1)}
                disabled={isCreating}
              >
                Назад
              </button>
              <button
                className="create-button"
                onClick={handleSubmit}
                disabled={!groupName.trim() || isCreating}
              >
                {isCreating ? (
                  <>
                    <BiLoaderAlt className="spin" />
                    Создание...
                  </>
                ) : (
                  "Создать группу"
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CreateGroupModal;
