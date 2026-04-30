import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu } from 'antd';
import {
  MessageOutlined,
  DatabaseOutlined,
  QuestionCircleOutlined,
  DashboardOutlined,
  SettingOutlined,
  ThunderboltOutlined,
  DoubleLeftOutlined,
  DoubleRightOutlined,
} from '@ant-design/icons';
import { useThemeStore } from '@/stores/useThemeStore';

const { Sider, Content } = Layout;

const menuItems = [
  { key: '/chat', icon: <MessageOutlined />, label: '智能问答' },
  { key: '/knowledge', icon: <DatabaseOutlined />, label: '知识库管理' },
  { key: '/faq', icon: <QuestionCircleOutlined />, label: 'FAQ 管理' },
  { key: '/dashboard', icon: <DashboardOutlined />, label: '数据大盘' },
  { key: '/settings', icon: <SettingOutlined />, label: '系统设置' },
];

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const selectedKey = '/' + location.pathname.split('/')[1] || '/chat';
  const isDark = useThemeStore((s) => s.mode === 'dark');

  return (
    <Layout style={{ height: '100vh', background: 'var(--bg-deep)' }}>
      {/* ── Sidebar ───────────────────────────────────────── */}
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        width={230}
        style={{
          background: 'var(--sidebar-bg)',
          borderRight: '1px solid var(--border-subtle)',
          boxShadow: isDark ? '2px 0 24px rgba(0,0,0,0.4)' : '2px 0 12px rgba(0,0,0,0.06)',
        }}
        trigger={
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            height: '100%', color: 'var(--text-secondary)', fontSize: 14,
          }}>
            {collapsed ? <DoubleRightOutlined /> : <DoubleLeftOutlined />}
          </div>
        }
      >
        {/* Logo */}
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            padding: collapsed ? 0 : '0 20px',
            borderBottom: '1px solid var(--border-subtle)',
            gap: 10,
            cursor: 'pointer',
          }}
          onClick={() => navigate('/chat')}
        >
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: 'linear-gradient(135deg, var(--accent), var(--accent-dim))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: 'var(--accent-glow)',
            flexShrink: 0,
          }}>
            <ThunderboltOutlined style={{ color: '#fff', fontSize: 18 }} />
          </div>
          {!collapsed && (
            <span style={{
              fontWeight: 700, fontSize: 17, letterSpacing: 1,
              color: 'var(--text-primary)',
            }}>
              {isDark ? 'NEURAL RAG' : 'RAG 智能问答'}
            </span>
          )}
        </div>

        {/* Menu */}
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ background: 'transparent', borderInlineEnd: 'none', padding: '12px 0' }}
        />

        {/* Bottom status */}
        {!collapsed && (
          <div style={{
            position: 'absolute', bottom: 48, left: 16, right: 16,
            padding: '10px 14px', borderRadius: 8,
            background: 'var(--bg-hover)',
            border: '1px solid var(--border-subtle)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 7, height: 7, borderRadius: '50%',
                background: 'var(--green)',
                boxShadow: isDark ? '0 0 6px var(--green)' : 'none',
                animation: 'pulse 2s infinite',
              }} />
              <span style={{ fontSize: 11, color: 'var(--green)', fontWeight: 500 }}>系统运行中</span>
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
              Milvus · MySQL · Redis
            </div>
          </div>
        )}
      </Sider>

      {/* ── Content ─────────────────────────────────────────── */}
      <Layout style={{ background: 'transparent' }}>
        <Content style={{ padding: 24, overflow: 'auto', background: 'var(--content-bg)' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
