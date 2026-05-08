import { useEffect, useRef, useCallback } from 'react';
import { useChatStore } from '@/stores/useChatStore';
import ChatWindow from './ChatWindow';
import ChatInput from './ChatInput';

export default function ChatPage() {
  const { activeId, newConversation } = useChatStore();
  const initRef = useRef(false);
  const sendRef = useRef<((text: string) => void) | null>(null);

  useEffect(() => {
    if (!initRef.current && !activeId) {
      initRef.current = true;
      newConversation();
    }
  }, [activeId, newConversation]);

  const handleQuickSend = useCallback((text: string) => {
    if (sendRef.current) sendRef.current(text);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <ChatWindow onQuickSend={handleQuickSend} />
      <ChatInput sendRef={sendRef} />
    </div>
  );
}
