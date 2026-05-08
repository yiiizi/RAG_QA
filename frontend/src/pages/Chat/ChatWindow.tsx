import { useEffect, useRef } from 'react';
import { Tag, Typography } from 'antd';
import { RobotOutlined, UserOutlined, ExperimentOutlined, CloudOutlined, DatabaseOutlined, FileSearchOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { useChatStore } from '@/stores/useChatStore';
import MarkdownViewer from '@/components/MarkdownViewer';
import { INTENT_LABELS, INTENT_COLORS } from '@/utils/constants';
import { formatLatency } from '@/utils/format';
import type { ChatMessage } from '@/types/chat';

const SUGGESTED_QUESTIONS = [
  { icon: <ExperimentOutlined />, text: '这个系统有哪些核心功能？' },
  { icon: <DatabaseOutlined />, text: '如何上传文档到知识库？' },
  { icon: <CloudOutlined />, text: '支持哪些文件格式？' },
  { icon: <FileSearchOutlined />, text: '知识库检索的原理是什么？' },
  { icon: <ThunderboltOutlined />, text: '如何提高问答的准确率？' },
];

function AssistantBubble({ msg, showThinking }: { msg: ChatMessage; showThinking?: boolean }) {
  const isEmpty = !msg.content || !msg.content.trim();
  return (
    <div style={{ display: 'flex', flexDirection: 'row', gap: 10, marginBottom: 20, padding: '0 8px' }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
        background: 'linear-gradient(135deg, #7c3aed, #5b21b6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 0 12px rgba(124,58,237,0.3)',
      }}>
        <RobotOutlined style={{ color: '#fff' }} />
      </div>
      <div style={{ maxWidth: '75%' }}>
        <div style={{
          padding: '14px 18px', borderRadius: 12,
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          lineHeight: 1.8, wordBreak: 'break-word',
          backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center',
        }}>
          {showThinking && isEmpty ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="thinking-dot" style={{ animationDelay: '0s' }} />
              <span className="thinking-dot" style={{ animationDelay: '0.2s' }} />
              <span className="thinking-dot" style={{ animationDelay: '0.4s' }} />
            </div>
          ) : (
            <MarkdownViewer content={msg.content} />
          )}
        </div>
        {!isEmpty && msg.intent && (
          <div style={{ marginTop: 4, display: 'flex', gap: 8, alignItems: 'center' }}>
            <Tag color={INTENT_COLORS[msg.intent] || 'cyan'} style={{ fontSize: 10, borderRadius: 4 }}>
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

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user';
  if (!isUser) return <AssistantBubble msg={msg} />;
  return (
    <div style={{ display: 'flex', flexDirection: 'row-reverse', gap: 10, marginBottom: 20, padding: '0 8px' }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
        background: 'linear-gradient(135deg, #00d4ff, #0098b3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 0 12px rgba(0,212,255,0.3)',
      }}>
        <UserOutlined style={{ color: '#fff' }} />
      </div>
      <div style={{ maxWidth: '75%' }}>
        <div style={{
          padding: '14px 18px', borderRadius: 12,
          background: 'var(--bg-hover)',
          border: '1px solid var(--border-subtle)',
          lineHeight: 1.8, wordBreak: 'break-word',
          backdropFilter: 'blur(6px)',
        }}>
          <Typography.Text style={{ color: 'var(--text-primary)' }}>{msg.content}</Typography.Text>
        </div>
      </div>
    </div>
  );
}

function WelcomeScreen({ onQuickSend }: { onQuickSend: (text: string) => void }) {
  const handleEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.borderColor = 'var(--accent)';
    e.currentTarget.style.background = 'var(--bg-hover)';
  };
  const handleLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.borderColor = 'var(--border-subtle)';
    e.currentTarget.style.background = 'var(--bg-card)';
  };

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 20,
      padding: '0 20px',
    }}>
      <div style={{ textAlign: 'center' }}>
        <Typography.Title level={3} style={{ margin: 0, color: 'var(--text-primary)', fontWeight: 700 }}>
          RAG 问答系统
        </Typography.Title>
        <Typography.Text style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4, display: 'block' }}>
          基于检索增强生成的智能问答，支持知识库检索与联网搜索
        </Typography.Text>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', maxWidth: 600 }}>
        {SUGGESTED_QUESTIONS.map((q, idx) => (
          <div
            key={idx}
            onClick={() => onQuickSend(q.text)}
            onMouseEnter={handleEnter}
            onMouseLeave={handleLeave}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 8,
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-card)',
              cursor: 'pointer', transition: 'all 0.2s',
              fontSize: 13, color: 'var(--text-primary)',
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ color: 'var(--accent)', fontSize: 14 }}>{q.icon}</span>
            <span>{q.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface ChatWindowProps {
  onQuickSend?: (text: string) => void;
}

export default function ChatWindow({ onQuickSend }: ChatWindowProps) {
  const { conversations, activeId, streaming } = useChatStore();
  const bottomRef = useRef<HTMLDivElement>(null);
  const conv = conversations.find((c) => c.id === activeId);
  const messages = conv?.messages ?? [];

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, streaming]);

  if (!activeId || messages.length === 0) {
    return <WelcomeScreen onQuickSend={onQuickSend || (() => {})} />;
  }

  const lastMsg = messages[messages.length - 1];
  const isLastStreaming = streaming && lastMsg?.role === 'assistant';

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '16px 0' }}>
      {messages.map((msg, idx) => {
        if (idx === messages.length - 1 && isLastStreaming) {
          return <AssistantBubble key={msg.id} msg={msg} showThinking />;
        }
        return <MessageBubble key={msg.id} msg={msg} />;
      })}
      <div ref={bottomRef} />
    </div>
  );
}
