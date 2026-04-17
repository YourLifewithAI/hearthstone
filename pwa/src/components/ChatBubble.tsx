import type { ConversationMessage } from '../types';

export function ChatBubble({ message }: { message: ConversationMessage }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} px-4`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
          isUser
            ? 'bg-purple-900/60 text-purple-50 rounded-br-sm'
            : 'bg-slate-800 text-slate-100 rounded-bl-sm'
        }`}
      >
        {message.content || <span className="text-slate-500 italic">…</span>}
      </div>
    </div>
  );
}
