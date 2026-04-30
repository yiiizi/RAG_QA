import { useEffect, useRef } from 'react';
import { Tag, Typography } from 'antd';
import { RobotOutlined, UserOutlined } from '@ant-design/icons';
import { useChatStore } from '@/stores/useChatStore';
import MarkdownViewer from '@/components/MarkdownViewer';
import EmptyState from '@/components/EmptyState';
import { INTENT_LABELS, INTENT_COLORS } from '@/utils/constants';
import { formatLatency } from '@/utils/format';
import type { ChatMessage } from '@/types/chat';

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user';
  return (
    <div style={{ display: 'flex', flexDirection: isUser ? 'row-reverse' : 'row', gap: 10, marginBottom: 20, padding: '0 8px' }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
        background: isUser
          ? 'linear-gradient(135deg, #00d4ff, #0098b3)'
          : 'linear-gradient(135deg, #7c3aed, #5b21b6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: isUser
          ? '0 0 12px rgba(0,212,255,0.3)'
          : '0 0 12px rgba(124,58,237,0.3)',
      }}>
        {isUser ? <UserOutlined style={{ color: '#fff' }} /> : <RobotOutlined style={{ color: '#fff' }} />}
      </div>
      <div style={{ maxWidth: '75%' }}>
        <div style={{
          padding: '14px 18px', borderRadius: 12,
          background: isUser ? 'var(--bg-hover)' : 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          lineHeight: 1.8, wordBreak: 'break-word',
          backdropFilter: 'blur(6px)',
        }}>
          {isUser ? (
            <Typography.Text style={{ color: 'var(--text-primary)' }}>{msg.content}</Typography.Text>
          ) : (
            <MarkdownViewer content={msg.content} />
          )}
        </div>
        {!isUser && msg.intent && (
          <div style={{ marginTop: 4, display: 'flex', gap: 8, alignItems: 'center' }}>
            <Tag color="cyan" style={{ fontSize: 10, borderRadius: 4 }}>
              {INTENT_LABELS[msg.intent] || msg.intent}
            </Tag>
            {msg.latency_ms != null && (
              <Typography.Text style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                {formatLatency(msg.latency_ms)}
              </Typography.Text>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ChatWindow() {
  const { conversations, activeId, streaming } = useChatStore();
  const bottomRef = useRef<HTMLDivElement>(null);
  const conv = conversations.find((c) => c.id === activeId);
  const messages = conv?.messages ?? [];

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  if (!activeId || messages.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <EmptyState description="发送一条消息开始对话" />
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '16px 0' }}>
      {messages.map((msg) => <MessageBubble key={msg.id} msg={msg} />)}
      {streaming && (
        <div style={{ padding: '0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', animation: 'pulse 1.5s infinite' }} />
          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>AI 正在思考...</span>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
