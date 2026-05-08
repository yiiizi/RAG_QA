import { List, Tag, Typography } from 'antd';
import { useChatStore } from '@/stores/useChatStore';
import { formatPercent } from '@/utils/format';
import EmptyState from '@/components/EmptyState';

const BOX_HEIGHT = 150;

export default function SourcePanel() {
  const { conversations, activeId } = useChatStore();
  const conv = conversations.find((c) => c.id === activeId);

  const lastAssistant = conv?.messages.filter((m) => m.role === 'assistant').at(-1);
  const sources = lastAssistant?.sources ?? [];
  const hasAnswer = !!(lastAssistant?.content && lastAssistant.content.trim());

  if (sources.length === 0) {
    return (
      <div style={{
        width: 310, flexShrink: 0,
        borderLeft: '1px solid var(--border-subtle)',
        background: 'var(--sidebar-panel-bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <EmptyState description={hasAnswer ? '知识库中未找到相关信息' : '检索来源将在这里显示'} />
      </div>
    );
  }

  return (
    <div style={{
      width: 310, flexShrink: 0,
      borderLeft: '1px solid var(--border-subtle)',
      background: 'var(--sidebar-panel-bg)',
      overflow: 'auto', padding: 16,
    }}>
      <List
        dataSource={sources}
        renderItem={(item, idx) => (
          <List.Item style={{ display: 'block', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <Typography.Text strong style={{ fontSize: 12, color: 'var(--text-primary)' }}>
                来源 {idx + 1}
              </Typography.Text>
              <Tag color="cyan" style={{ fontSize: 11, marginLeft: 'auto' }}>
                {formatPercent(item.score)}
              </Tag>
            </div>
            <div style={{
              height: BOX_HEIGHT, overflow: 'auto',
              fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7,
              whiteSpace: 'pre-wrap', wordBreak: 'break-all',
              border: '1px solid var(--border-subtle)', borderRadius: 6,
              padding: '6px 10px', background: 'var(--surface-raised)',
            }}>
              {item.text}
            </div>
            {item.source && (
              <Typography.Text style={{ fontSize: 11, display: 'block', marginTop: 4, color: 'var(--text-muted)' }}>
                来自: {item.source}
              </Typography.Text>
            )}
          </List.Item>
        )}
      />
    </div>
  );
}
