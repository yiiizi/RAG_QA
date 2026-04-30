export const INTENT_LABELS: Record<string, string> = {
  chat: '闲聊',
  faq: '高频问答',
  knowledge_qa: '知识问答',
};

export const INTENT_COLORS: Record<string, string> = {
  chat: '#52c41a',
  faq: '#1890ff',
  knowledge_qa: '#fa8c16',
};

export const FILE_TYPE_ICONS: Record<string, string> = {
  '.pdf': '📄',
  '.docx': '📝',
  '.txt': '📃',
  '.md': '📘',
  '.html': '🌐',
  '.csv': '📊',
  '.xlsx': '📈',
  '.pptx': '📽️',
  '.json': '📋',
  '.epub': '📚',
  '.png': '🖼️',
  '.jpg': '🖼️',
  '.jpeg': '🖼️',
};

export const SUPPORTED_FILE_TYPES = [
  '.pdf', '.docx', '.txt', '.md', '.html', '.htm',
  '.csv', '.xlsx', '.pptx', '.json', '.epub',
  '.png', '.jpg', '.jpeg',
  '.py', '.java', '.go', '.js', '.ts', '.cpp', '.c',
];
