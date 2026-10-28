import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Globe,
  ExternalLink,
  Bot,
  User,
  Sparkles,
  Cpu,
  Terminal,
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

  const quickAnalystActions = [
    { label: '📊 Analyser ma dernière séance', text: 'Peux-tu analyser en détail ma dernière séance et son impact sur la charge ?' },
    { label: '⚙️ Adapter la séance de demain', text: 'Au vu de ma récupération actuelle, comment adapter la séance de demain ?' },
    { label: '🤝 Synergie de charge Duo', text: 'Comment se coordonnent nos charges respectives entre Louis et Clara cette semaine ?' },
    { label: '🎯 Stratégie 10 km', text: 'Quels sont nos axes de progression clés vers nos objectifs 10 km sub-40 et sub-50 ?' },
  ];

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

  const handleQuickAction = (text: string) => {
    setInputText(text);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
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
      .replace(/\*(.*?)\*/g, '<em class="text-[#00A7E1] font-medium">$1</em>');
  };

  return (
    <div className="telemetry-card rounded-2xl flex flex-col h-[580px] overflow-hidden text-slate-200">
      {/* Telemetry Console Header */}
      <div className="p-3 px-4 border-b border-white/[0.07] flex items-center justify-between gap-3 bg-[#0E131D]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#171D2A] border border-white/[0.08] flex items-center justify-center text-[#00A7E1]">
            <Terminal className="w-3.5 h-3.5 text-[#00A7E1]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-mono font-bold text-white tracking-wider uppercase">
                Console Performance IA
              </h3>
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30">
                LIVE
              </span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">
              Sciences du sport • Garmin Duo Sync
            </span>
          </div>
        </div>

        {/* Web Search Live Toggle */}
        <button
          type="button"
          onClick={() => setUseSearch(!useSearch)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-mono font-semibold border transition-all ${
            useSearch
              ? 'bg-[#00A7E1]/15 text-[#00A7E1] border-[#00A7E1]/40 shadow-[0_0_10px_rgba(0,167,225,0.2)]'
              : 'bg-[#121722] text-slate-400 border-white/[0.06]'
          }`}
          title="Activer ou désactiver la recherche dans la littérature sportive"
        >
          <Globe className="w-3 h-3" />
          <span>WEB {useSearch ? 'ON' : 'OFF'}</span>
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#0B0E14]">
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
                    ? 'bg-[#171D2A] border-[#00A7E1]/30 text-[#00A7E1]'
                    : 'bg-[#121722] border-white/[0.08] text-[#10B981]'
                }`}
              >
                {isUser ? <User className="w-3.5 h-3.5" /> : <Cpu className="w-3.5 h-3.5" />}
              </div>

              {/* Message Bubble */}
              <div
                className={`max-w-[85%] rounded-xl p-3 text-xs ${
                  isUser
                    ? 'bg-[#141C2B] border border-[#00A7E1]/30 text-slate-100 rounded-tr-xs shadow-[0_0_12px_rgba(0,167,225,0.08)]'
                    : msg.error
                    ? 'bg-rose-950/40 border border-rose-500/30 text-rose-200'
                    : 'bg-[#121722] border border-white/[0.06] text-slate-200 rounded-tl-xs shadow-sm'
                }`}
              >
                {/* Message Body */}
                <div>{renderMessageContent(msg.content)}</div>

                {/* Sources if web search was used */}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-white/[0.06]">
                    <div className="text-[10px] font-mono uppercase font-bold text-slate-400 flex items-center gap-1 mb-1">
                      <Globe className="w-2.5 h-2.5 text-[#00A7E1]" />
                      Sources consultées :
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.sources.map((src, sIdx) => (
                        <a
                          key={sIdx}
                          href={src.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] font-mono text-[#00A7E1] hover:underline flex items-center gap-0.5 bg-[#0F141F] px-1.5 py-0.5 rounded border border-white/[0.06]"
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
            <div className="w-7 h-7 rounded-lg bg-[#121722] border border-white/[0.08] flex items-center justify-center text-[#00A7E1]">
              <Bot className="w-3.5 h-3.5" />
            </div>
            <div className="p-3 rounded-xl bg-[#121722] border border-white/[0.06] flex items-center gap-2 text-xs font-mono text-slate-400">
              <span className="w-2 h-2 rounded-full bg-[#00A7E1] animate-ping" />
              <span>Calcul télémétrique & analyse physiologique en cours...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Action Analyst Chips */}
      <div className="px-3 py-1.5 bg-[#0F141F] border-t border-white/[0.04] flex items-center gap-1.5 overflow-x-auto scrollbar-none">
        <Sparkles className="w-3 h-3 text-[#00A7E1] flex-shrink-0" />
        {quickAnalystActions.map((action, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleQuickAction(action.text)}
            className="text-[10.5px] font-mono whitespace-nowrap px-2 py-0.5 rounded-md bg-[#171D2A] hover:bg-[#1E2638] text-slate-300 hover:text-white border border-white/[0.06] transition-colors flex-shrink-0"
          >
            {action.label}
          </button>
        ))}
      </div>

      {/* Input Bar */}
      <div className="p-3 border-t border-white/[0.07] bg-[#121722]">
        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputText}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="Questionner l'analyste (ex: 'Allure seuil pour Clara', 'Régulation volume')..."
              className="w-full resize-none rounded-xl bg-[#0B0E14] border border-white/[0.08] focus:border-[#00A7E1]/50 px-3 py-2 text-xs text-white placeholder-slate-500 focus-visible:outline-none transition-colors max-h-28"
            />
          </div>
          <button
            type="submit"
            disabled={!inputText.trim() || loading}
            className="w-9 h-9 rounded-xl btn-telemetry-cyan flex items-center justify-center flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            title="Envoyer le message"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
