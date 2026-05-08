import { useState, useRef, useCallback, useEffect } from 'react';
import { Input, Button } from 'antd';
import { SendOutlined, DatabaseOutlined, GlobalOutlined } from '@ant-design/icons';
import { useChatStore } from '@/stores/useChatStore';
import { useWebSocket } from '@/hooks/useWebSocket';
import type { SourceItem } from '@/types/chat';
import { v4 as uuidv4 } from './uuid';

interface ChatInputProps {
  sendRef?: React.MutableRefObject<((text: string) => void) | null>;
}

export default function ChatInput({ sendRef }: ChatInputProps) {
  const [value, setValue] = useState('');
  const [kbOnly, setKbOnly] = useState(false);
  const [webSearch, setWebSearch] = useState(false);
  const { activeId, streaming, setStreaming, addMessage, appendToLast, updateLastSources, updateLastMeta, newConversation } =
    useChatStore();
  const inputRef = useRef<any>(null);

  const handleMessage = useCallback(
    (data: Record<string, unknown>) => {
      const type = data.type as string;
      if (type === 'sources') {
        const sources = (data.data as any[]) || [];
        updateLastSources(activeId!, sources.map((s: any) => ({
          text: s.text || '',
          source: s.source || '',
          score: s.score || 0,
          chunk_index: s.chunk_index ?? -1,
        })));
      } else if (type === 'token') {
        appendToLast(activeId!, data.data as string);
      } else if (type === 'done') {
        const meta = data.data as Record<string, unknown> | undefined;
        updateLastMeta(activeId!, {
          intent: meta?.intent as string,
          latency_ms: meta?.latency_ms as number,
        });
        setStreaming(false);
      } else if (type === 'error') {
        appendToLast(activeId!, `\n\n> ⚠️ 错误: ${data.data}`);
        setStreaming(false);
      } else if (type === 'finish') {
        // stream ended
      }
    },
    [activeId, appendToLast, updateLastSources, updateLastMeta, setStreaming]
  );

  const { connect, send } = useWebSocket(handleMessage);

  const doSend = useCallback((textOverride?: string) => {
    const text = (textOverride ?? value).trim();
    if (!text || streaming) return;

    let convId = activeId;
    if (!convId) {
      convId = newConversation();
    }

    const userMsg = {
      id: uuidv4(),
      role: 'user' as const,
      content: text,
      timestamp: new Date().toISOString(),
    };
    addMessage(convId, userMsg);

    const assistantMsg = {
      id: uuidv4(),
      role: 'assistant' as const,
      content: '',
      sources: [] as SourceItem[],
      timestamp: new Date().toISOString(),
    };
    addMessage(convId, assistantMsg);
    setStreaming(true);

    setValue('');
    inputRef.current?.focus();

    connect();
    send({ query: text, kb_only: kbOnly, web_search: webSearch });
  }, [value, streaming, activeId, addMessage, setStreaming, newConversation, connect, send, kbOnly, webSearch]);

  // Expose doSend to parent via ref
  useEffect(() => {
    if (sendRef) {
      sendRef.current = (text: string) => {
        setValue('');
        // Directly send with the given text
        let convId = activeId;
        if (!convId) convId = newConversation();
        const userMsg = { id: uuidv4(), role: 'user' as const, content: text, timestamp: new Date().toISOString() };
        addMessage(convId, userMsg);
        const assistantMsg = { id: uuidv4(), role: 'assistant' as const, content: '', sources: [] as SourceItem[], timestamp: new Date().toISOString() };
        addMessage(convId, assistantMsg);
        setStreaming(true);
        connect();
        send({ query: text, kb_only: kbOnly, web_search: webSearch });
      };
    }
  });

  return (
    <div style={{ padding: '0 0 16px', display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
      <div style={{ position: 'relative', width: '56%', minWidth: 360, maxWidth: 680 }}>
        <Input.TextArea
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="输入你的问题... (Shift+Enter 换行，Enter 发送)"
          autoSize={{ minRows: 2, maxRows: 4 }}
          onPressEnter={(e) => { if (!e.shiftKey) { e.preventDefault(); doSend(); } }}
          disabled={streaming}
          style={{ borderRadius: 12, padding: '10px 52px 36px 14px', fontSize: 14, lineHeight: 1.8, resize: 'none' }}
        />
        {/* KB-only toggle */}
        <span
          onClick={(e) => { e.stopPropagation(); setKbOnly(!kbOnly); }}
          style={{
            position: 'absolute',
            left: 8,
            bottom: 8,
            zIndex: 5,
            height: 28,
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '0 8px',
            cursor: 'pointer',
            color: kbOnly ? '#69b1ff' : 'var(--text-muted)',
            fontSize: 12,
            transition: 'color 0.2s',
            userSelect: 'none',
          }}
        >
          <DatabaseOutlined style={{ fontSize: 14 }} />
          <span>知识库</span>
        </span>
        {/* Web search toggle */}
        <span
          onClick={(e) => { e.stopPropagation(); setWebSearch(!webSearch); }}
          style={{
            position: 'absolute',
            left: 82,
            bottom: 8,
            zIndex: 5,
            height: 28,
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '0 8px',
            cursor: 'pointer',
            color: webSearch ? '#ffa940' : 'var(--text-muted)',
            fontSize: 12,
            transition: 'color 0.2s',
            userSelect: 'none',
          }}
        >
          <GlobalOutlined style={{ fontSize: 14 }} />
          <span>联网</span>
        </span>
        {/* Send button */}
        <Button
          type="primary"
          icon={<SendOutlined style={{ fontSize: 18 }} />}
          onClick={() => doSend()}
          loading={streaming}
          style={{
            position: 'absolute',
            right: 8,
            bottom: 10,
            width: 36,
            height: 36,
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        />
      </div>
    </div>
  );
}
