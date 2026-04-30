import { useEffect, useRef, useState } from 'react';
import { Button } from 'antd';
import { MessageOutlined, FileTextOutlined } from '@ant-design/icons';
import { useChatStore } from '@/stores/useChatStore';
import ChatHistory from './ChatHistory';
import ChatWindow from './ChatWindow';
import ChatInput from './ChatInput';
import SourcePanel from './SourcePanel';

export default function ChatPage() {
  const { activeId, newConversation } = useChatStore();
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const initRef = useRef(false);

  useEffect(() => {
    if (!initRef.current && !activeId) {
      initRef.current = true;
      newConversation();
    }
  }, [activeId, newConversation]);

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 48px)', gap: 0, position: 'relative' }}>

      {/* ── Left: toggle + sidebar ──────────────────────── */}
      {leftCollapsed ? (
        <Button
          type="text"
          icon={<MessageOutlined />}
          onClick={() => setLeftCollapsed(false)}
          title="展开对话列表"
          style={{
            width: 32, height: 32, minWidth: 32, borderRadius: 8, margin: '12px 0 0 4px',
            color: 'var(--text-muted)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        />
      ) : (
        <ChatHistory onCollapse={() => setLeftCollapsed(true)} />
      )}

      {/* ── Center ──────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <ChatWindow />
        <ChatInput />
      </div>

      {/* ── Right: sidebar + toggle ─────────────────────── */}
      {rightCollapsed ? (
        <Button
          type="text"
          icon={<FileTextOutlined />}
          onClick={() => setRightCollapsed(false)}
          title="展开来源面板"
          style={{
            width: 32, height: 32, minWidth: 32, borderRadius: 8, margin: '12px 4px 0 0',
            color: 'var(--text-muted)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        />
      ) : (
        <SourcePanel onCollapse={() => setRightCollapsed(true)} />
      )}
    </div>
  );
}
