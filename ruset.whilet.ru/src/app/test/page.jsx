"use client";

import { walert } from "@/utils/miniModal";
import { useEffect, useState } from "react";

export default function SSEPage() {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const socket = new WebSocket("ws://127.0.0.1:3050");

    socket.onopen = () => {
      console.log("Подключено к серверу");
    };

    socket.onmessage = (event) => {
      console.log("Получено значение:", event.data);
    };

    socket.onclose = () => {
      console.log("Отключено от сервера");
    };
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h1>SSE from PHP</h1>
      <ul>
        {messages.map((m, i) => (
          <li key={i}>{m}</li>
        ))}
      </ul>
    </div>
  );
}
