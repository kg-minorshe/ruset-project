"use client";
import { Suspense } from "react";
import { ChatContainerContent } from "./ChatContainerContent";
import "./ChatContainer.scss";

export function ChatContainer() {
    return (
        <Suspense fallback={<div>Загрузка...</div>}>
            <ChatContainerContent />
        </Suspense>
    );
}