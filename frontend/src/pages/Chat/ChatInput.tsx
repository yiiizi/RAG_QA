import { useState, useRef, useCallback } from 'react';
import { Input, Button } from 'antd';
import { SendOutlined, DatabaseOutlined } from '@ant-design/icons';
import { useChatStore } from '@/stores/useChatStore';
import { useWebSocket } from '@/hooks/useWebSocket';
import type { SourceItem } from '@/types/chat';
import { v4 as uuidv4 } from './uuid';

export default function ChatInput() {
  const [value, setValue] = useState('');
  const [kbOnly, setKbOnly] = useState(false);
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

  const doSend = useCallback(() => {
    const text = value.trim();
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

    // Placeholder for assistant response
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

    // Connect if needed; message is queued if WS not yet open
    connect();
    send({ query: text, kb_only: kbOnly });
  }, [value, streaming, activeId, addMessage, setStreaming, newConversation, connect, send]);

  return (
    <div style={{ padding: '0 0 20px', display: 'flex', justifyContent: 'center' }}>
      <div style={{ position: 'relative', width: '50%', minWidth: 320 }}>
        <Input.TextArea
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="输入你的问题... (Shift+Enter 换行，Enter 发送)"
          autoSize={{ minRows: 3, maxRows: 6 }}
          onPressEnter={(e) => { if (!e.shiftKey) { e.preventDefault(); doSend(); } }}
          disabled={streaming}
          style={{ borderRadius: 12, padding: '10px 52px 36px 14px', fontSize: 14, lineHeight: 1.8 }}
        />
        {/* KB-only toggle */}
        <Button
          type="text"
          icon={<DatabaseOutlined />}
          onClick={() => setKbOnly(!kbOnly)}
          title={kbOnly ? '知识库模式已开启' : '点击开启知识库模式'}
          style={{
            position: 'absolute',
            left: 8,
            bottom: 8,
            width: 28,
            height: 28,
            minWidth: 28,
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: kbOnly ? 'var(--accent)' : 'var(--text-muted)',
            background: 'transparent',
            fontSize: 14,
            transition: 'color 0.2s',
          }}
        />
        {/* Send button */}
        <Button
          type="primary"
          icon={<SendOutlined style={{ fontSize: 18 }} />}
          onClick={doSend}
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
