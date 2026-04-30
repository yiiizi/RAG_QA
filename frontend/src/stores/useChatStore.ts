import { create } from 'zustand';
import type { ChatMessage, Conversation } from '@/types/chat';

interface ChatState {
  conversations: Conversation[];
  activeId: string | null;
  streaming: boolean;
  // actions
  setActive: (id: string) => void;
  newConversation: () => string;
  addMessage: (convId: string, msg: ChatMessage) => void;
  appendToLast: (convId: string, chunk: string) => void;
  updateLastSources: (convId: string, sources: ChatMessage['sources']) => void;
  updateLastMeta: (convId: string, meta: { intent?: string; latency_ms?: number }) => void;
  setStreaming: (v: boolean) => void;
  deleteConversation: (id: string) => void;
}

let _counter = 0;

function genId(): string {
  return `conv_${Date.now()}_${++_counter}`;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  activeId: null,
  streaming: false,

  setActive: (id) => set({ activeId: id }),

  newConversation: () => {
    const id = genId();
    const conv: Conversation = {
      id,
      title: '新对话',
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set((s) => ({ conversations: [conv, ...s.conversations], activeId: id }));
    return id;
  },

  addMessage: (convId, msg) =>
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === convId
          ? {
              ...c,
              messages: [...c.messages, msg],
              title: c.messages.length === 0 ? msg.content.slice(0, 30) : c.title,
              updatedAt: new Date().toISOString(),
            }
          : c
      ),
    })),

  appendToLast: (convId, chunk) =>
    set((s) => ({
      conversations: s.conversations.map((c) => {
        if (c.id !== convId) return c;
        const msgs = [...c.messages];
        const last = msgs[msgs.length - 1];
        if (last && last.role === 'assistant') {
          msgs[msgs.length - 1] = { ...last, content: last.content + chunk };
        }
        return { ...c, messages: msgs, updatedAt: new Date().toISOString() };
      }),
    })),

  updateLastSources: (convId, sources) =>
    set((s) => ({
      conversations: s.conversations.map((c) => {
        if (c.id !== convId) return c;
        const msgs = [...c.messages];
        const last = msgs[msgs.length - 1];
        if (last && last.role === 'assistant') {
          msgs[msgs.length - 1] = { ...last, sources };
        }
        return { ...c, messages: msgs, updatedAt: new Date().toISOString() };
      }),
    })),

  updateLastMeta: (convId, meta: { intent?: string; latency_ms?: number }) =>
    set((s) => ({
      conversations: s.conversations.map((c) => {
        if (c.id !== convId) return c;
        const msgs = [...c.messages];
        const last = msgs[msgs.length - 1];
        if (last && last.role === 'assistant') {
          if (meta.intent) msgs[msgs.length - 1] = { ...last, intent: meta.intent };
          if (meta.latency_ms != null) msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], latency_ms: meta.latency_ms };
        }
        return { ...c, messages: msgs, updatedAt: new Date().toISOString() };
      }),
    })),

  setStreaming: (v) => set({ streaming: v }),

  deleteConversation: (id) =>
    set((s) => ({
      conversations: s.conversations.filter((c) => c.id !== id),
      activeId: s.activeId === id
        ? (s.conversations.find((c) => c.id !== id)?.id ?? null)
        : s.activeId,
    })),
}));
