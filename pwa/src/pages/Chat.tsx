import { useEffect, useRef, useState } from 'react';
import {
  fetchConversations,
  fetchConversation,
  createConversation,
  updateConversation,
  streamChat,
} from '../api';
import type { ConversationMessage, ConversationSummary } from '../types';
import { ChatBubble } from '../components/ChatBubble';
import { relativeTime } from '../lib/time';

export function Chat() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showList, setShowList] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchConversations()
      .then(setConversations)
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages]);

  async function loadConversation(id: string) {
    try {
      const conv = await fetchConversation(id);
      setActiveId(id);
      setMessages(conv.messages);
      setShowList(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  function startNew() {
    setActiveId(null);
    setMessages([]);
    setShowList(false);
    setError(null);
  }

  async function send() {
    const text = input.trim();
    if (!text || sending) return;

    const userMsg: ConversationMessage = {
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setSending(true);
    setError(null);

    const assistantMsg: ConversationMessage = {
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
    };
    setMessages([...nextMessages, assistantMsg]);

    try {
      let acc = '';
      for await (const chunk of streamChat({
        messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
        conversation_id: activeId ?? undefined,
      })) {
        acc += chunk;
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { ...assistantMsg, content: acc };
          return copy;
        });
      }

      const finalMessages: ConversationMessage[] = [
        ...nextMessages,
        { ...assistantMsg, content: acc },
      ];

      if (activeId) {
        await updateConversation(activeId, finalMessages);
      } else {
        const conv = await createConversation(finalMessages);
        setActiveId(conv.id);
        fetchConversations().then(setConversations).catch(() => {});
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col h-[100svh] pb-16">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <button
          type="button"
          onClick={() => setShowList((v) => !v)}
          className="text-sm text-slate-300"
        >
          ☰ {showList ? 'Close' : 'History'}
        </button>
        <h1 className="text-sm font-medium text-slate-100">
          {activeId ? 'Conversation' : 'New chat'}
        </h1>
        <button
          type="button"
          onClick={startNew}
          className="text-sm text-purple-300"
        >
          + New
        </button>
      </div>

      {showList && (
        <div className="absolute inset-x-0 top-[49px] bottom-16 z-20 bg-slate-900 overflow-y-auto">
          <ul className="divide-y divide-slate-800">
            {conversations.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => loadConversation(c.id)}
                  className="w-full text-left px-4 py-3 active:bg-slate-800"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-medium text-slate-100 truncate">
                      {c.title}
                    </span>
                    <span className="text-[10px] text-slate-500 shrink-0">
                      {relativeTime(c.updated_at)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 truncate mt-0.5">{c.preview}</p>
                </button>
              </li>
            ))}
            {conversations.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-slate-500 italic">
                No conversations yet.
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto py-3 space-y-3">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-slate-500 text-sm italic px-8 text-center">
            Start a conversation. Claude has your full context.
          </div>
        )}
        {messages.map((m, i) => (
          <ChatBubble key={i} message={m} />
        ))}
        {error && (
          <div className="mx-4 px-3 py-2 bg-red-900/30 border border-red-800 rounded text-xs text-red-300">
            {error}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-slate-800 px-3 py-2 bg-slate-900 fixed bottom-14 left-0 right-0">
        <div className="flex gap-2 items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.metaKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Message Claude..."
            rows={1}
            disabled={sending}
            className="flex-1 bg-slate-800 text-slate-100 rounded-2xl px-4 py-2.5 text-sm resize-none outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 max-h-40"
          />
          <button
            type="button"
            onClick={send}
            disabled={sending || !input.trim()}
            className="h-10 px-4 rounded-full bg-purple-700 text-white text-sm font-medium disabled:opacity-40 active:bg-purple-800"
          >
            {sending ? '…' : '↑'}
          </button>
        </div>
      </div>
    </div>
  );
}
