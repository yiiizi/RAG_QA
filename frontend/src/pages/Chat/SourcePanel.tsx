import { Button, List, Tag, Typography } from 'antd';
import { FileTextOutlined } from '@ant-design/icons';
import { useChatStore } from '@/stores/useChatStore';
import { formatPercent } from '@/utils/format';
import EmptyState from '@/components/EmptyState';

const BOX_HEIGHT = 150;

interface Props {
  onCollapse?: () => void;
}

export default function SourcePanel({ onCollapse }: Props) {
  const { conversations, activeId } = useChatStore();
  const conv = conversations.find((c) => c.id === activeId);

  const lastAssistant = conv?.messages.filter((m) => m.role === 'assistant').at(-1);
  const sources = lastAssistant?.sources ?? [];

  if (sources.length === 0) {
    return (
      <div
        style={{
          width: 280,
          borderLeft: '1px solid var(--border-subtle)',
          background: 'var(--sidebar-panel-bg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {onCollapse && (
          <Button type="text" size="small" icon={<FileTextOutlined />} onClick={onCollapse}
            title="收起" style={{ position: 'absolute', top: 8, right: 8, zIndex: 10, color: 'var(--text-muted)', width: 28, minWidth: 28, borderRadius: 6 }} />
        )}
        <EmptyState description="检索来源将在这里显示" />
      </div>
    );
  }

  return (
    <div style={{
      width: 280, position: 'relative',
      borderLeft: '1px solid var(--border-subtle)',
      background: 'var(--sidebar-panel-bg)',
      overflow: 'auto',
      padding: 16,
    }}>
      {onCollapse && (
        <Button type="text" size="small" icon={<FileTextOutlined />} onClick={onCollapse}
          title="收起" style={{ position: 'absolute', top: 8, right: 8, zIndex: 10, color: 'var(--text-muted)', width: 28, minWidth: 28, borderRadius: 6 }} />
      )}
      <Typography.Title level={5} style={{ margin: '0 0 12px' }}>
        <FileTextOutlined /> 引用来源
      </Typography.Title>

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
