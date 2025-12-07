import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useChatContainer } from "./hooks/useChatContainer";
import { ChatLayout } from "./ChatLayout";
import { useMobileDetection } from "./hooks/useMobileDetection";

function ChatContainerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  
  const {
    state,
    actions,
    constants
  } = useChatContainer();
  
  useMobileDetection({ setIsMobile: actions.setIsMobile });

  return (
    <>
      <div className="line">
        <a href="https://ruset.whilet.ru">RuSet</a>
      </div>
      <ChatLayout
        state={state}
        actions={actions}
        constants={constants}
        searchParams={searchParams}
        router={router}
        pathname={pathname}
      />
    </>
  );
}

export { ChatContainerContent };