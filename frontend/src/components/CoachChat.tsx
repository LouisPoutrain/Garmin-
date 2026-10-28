import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Globe,
  ExternalLink,
  Bot,
  User,
} from 'lucide-react';
import type { ChatMessage } from '../types';

interface CoachChatProps {
  messages: ChatMessage[];
  loading: boolean;
  onSendMessage: (text: string, useSearch: boolean) => void;
}

export const CoachChat: React.FC<CoachChatProps> = ({
  messages,
  loading,
  onSendMessage,
}) => {
  const [inputText, setInputText] = useState('');
  const [useSearch, setUseSearch] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() || loading) return;
    onSendMessage(inputText.trim(), useSearch);
    setInputText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  const renderMessageContent = (content: string) => {
    const paragraphs = content.split('\n\n');

    return paragraphs.map((para, pIdx) => {
      if (para.startsWith('- ') || para.startsWith('* ')) {
        const items = para.split('\n');
        return (
          <ul key={pIdx} className="list-disc pl-4 space-y-1 my-1.5 text-xs text-slate-300">
            {items.map((it, iIdx) => (
              <li
                key={iIdx}
                dangerouslySetInnerHTML={{
                  __html: formatInline(it.replace(/^[-*]\s+/, '')),
                }}
              />
            ))}
          </ul>
        );
      }

      if (para.startsWith('### ')) {
        return (
          <h4
            key={pIdx}
            className="text-xs font-bold text-slate-100 mt-2.5 mb-1"
            dangerouslySetInnerHTML={{ __html: formatInline(para.replace('### ', '')) }}
          />
        );
      }

      if (para.startsWith('## ')) {
        return (
          <h3
            key={pIdx}
            className="text-xs font-bold text-white mt-3 mb-1"
            dangerouslySetInnerHTML={{ __html: formatInline(para.replace('## ', '')) }}
          />
        );
      }

      return (
        <p
          key={pIdx}
          className="text-xs leading-relaxed text-slate-300 mb-1.5 last:mb-0"
          dangerouslySetInnerHTML={{ __html: formatInline(para) }}
        />
      );
    });
  };

  const formatInline = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-white">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="text-[#4EA8DE]">$1</em>');
  };

  return (
    <div className="matte-card rounded-2xl flex flex-col h-[560px] overflow-hidden text-slate-200">
      {/* Console Header */}
      <div className="p-3 px-4 border-b border-[#1E2535] flex items-center justify-between gap-3 bg-[#171C2B]">
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-[#3FA372]" />
          <div>
            <h3 className="text-xs font-bold text-white tracking-wide">
              Coach IA Connecté
            </h3>
            <span className="text-[10px] text-slate-400 font-medium">
              Sciences du sport & Contexte Garmin Duo
            </span>
          </div>
        </div>

        {/* Web Search Live Toggle */}
        <button
          type="button"
          onClick={() => setUseSearch(!useSearch)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-semibold border transition-colors ${
            useSearch
              ? 'bg-[#1C2836] text-[#4EA8DE] border-[#4EA8DE]/40'
              : 'bg-[#131722] text-slate-400 border-[#242C3E]'
          }`}
          title="Activer ou désactiver la recherche dans la littérature sportive"
        >
          <Globe className="w-3 h-3" />
          <span>Recherche Web</span>
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#0D1017]">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';

          return (
            <div
              key={msg.id}
              className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar Icon */}
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold border ${
                  isUser
                    ? 'bg-[#1C2333] border-[#2B354C] text-[#E0583A]'
                    : 'bg-[#171C2B] border-[#252D3E] text-[#4EA8DE]'
                }`}
              >
                {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
              </div>

              {/* Message Bubble */}
              <div
                className={`max-w-[85%] rounded-xl p-3 text-xs ${
                  isUser
                    ? 'bg-[#1C2333] border border-[#2B354C] text-slate-100 rounded-tr-xs'
                    : msg.error
                    ? 'bg-[#2B1717] border border-rose-500/30 text-rose-200'
                    : 'bg-[#131722] border border-[#1E2535] text-slate-200 rounded-tl-xs shadow-sm'
                }`}
              >
                {/* Message Body */}
                <div>{renderMessageContent(msg.content)}</div>

                {/* Sources if web search was used */}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-[#1E2535]">
                    <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1 mb-1">
                      <Globe className="w-2.5 h-2.5 text-[#4EA8DE]" />
                      Sources consultées :
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.sources.map((src, sIdx) => (
                        <a
                          key={sIdx}
                          href={src.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] text-[#4EA8DE] hover:underline flex items-center gap-0.5 bg-[#171C2B] px-1.5 py-0.5 rounded border border-[#232B3E]"
                        >
                          <span className="truncate max-w-[130px]">{src.title}</span>
                          <ExternalLink className="w-2 h-2 flex-shrink-0" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Timestamp */}
                <div className="text-[9px] text-slate-500 text-right mt-1 font-mono">
                  {msg.timestamp}
                </div>
              </div>
            </div>
          );
        })}

        {/* Loading Spinner */}
        {loading && (
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#171C2B] border border-[#252D3E] flex items-center justify-center text-[#4EA8DE]">
              <Bot className="w-3.5 h-3.5" />
            </div>
            <div className="p-3 rounded-xl bg-[#131722] border border-[#1E2535] flex items-center gap-2 text-xs text-slate-400">
              <span className="w-2 h-2 rounded-full bg-[#4EA8DE] animate-pulse" />
              <span>Analyse biométrique et calcul en cours...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="p-3 border-t border-[#1E2535] bg-[#121622]">
        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputText}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="Posez une question au coach (ex: 'Rappelle-moi le planning', 'Comment optimiser mon sommeil ?')..."
              className="w-full resize-none rounded-xl bg-[#171C2B] border border-[#232B3E] focus:border-[#4EA8DE]/50 px-3 py-2 text-xs text-white placeholder-slate-500 focus-visible:outline-none transition-colors max-h-28"
            />
          </div>
          <button
            type="submit"
            disabled={!inputText.trim() || loading}
            className="w-9 h-9 rounded-xl btn-matte-primary flex items-center justify-center flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Envoyer le message"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
