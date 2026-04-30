import request from './request';
import type { ChatRequest, ChatResponse } from '@/types/chat';

export async function sendChat(query: string): Promise<ChatResponse> {
  const res = await request.post<ChatResponse>('/chat', { query } as ChatRequest);
  return res.data;
}

export function getWebSocketUrl(): string {
  const base = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000';
  return base.replace(/^http/, 'ws') + '/ws/chat';
}
