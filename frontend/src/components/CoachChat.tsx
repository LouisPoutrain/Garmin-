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
  BarChart3,
  Settings2,
  Target,
  Handshake,
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
    { icon: BarChart3, label: 'Analyser ma dernière séance', text: 'Peux-tu analyser en détail ma dernière séance et son impact sur la charge ?' },
    { icon: Settings2, label: 'Adapter la séance de demain', text: 'Au vu de ma récupération actuelle, comment adapter la séance de demain ?' },
    { icon: Handshake, label: 'Synergie de charge Duo', text: 'Comment se coordonnent nos charges respectives entre Louis et Clara cette semaine ?' },
    { icon: Target, label: 'Stratégie 10 km', text: 'Quels sont nos axes de progression clés vers nos objectifs 10 km sub-40 et sub-50 ?' },
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
          <ul key={pIdx} className="list-disc pl-4 space-y-1 my-1.5 text-xs text-ink">
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
            className="text-xs font-bold text-ink mt-2.5 mb-1"
            dangerouslySetInnerHTML={{ __html: formatInline(para.replace('### ', '')) }}
          />
        );
      }

      if (para.startsWith('## ')) {
        return (
          <h3
            key={pIdx}
            className="text-xs font-bold text-ink mt-3 mb-1"
            dangerouslySetInnerHTML={{ __html: formatInline(para.replace('## ', '')) }}
          />
        );
      }

      return (
        <p
          key={pIdx}
          className="text-xs leading-relaxed text-ink mb-1.5 last:mb-0"
          dangerouslySetInnerHTML={{ __html: formatInline(para) }}
        />
      );
    });
  };

  const formatInline = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-ink">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="text-athlete-cyan font-medium">$1</em>');
  };

  return (
    <div className="telemetry-card rounded-card flex flex-col h-[580px] overflow-hidden text-ink">
      {/* Telemetry Console Header */}
      <div className="p-3 px-4 border-b border-border-strong flex items-center justify-between gap-3 bg-surface-2">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-tile bg-surface-3 border border-border-strong flex items-center justify-center text-athlete-cyan">
            <Terminal className="w-3.5 h-3.5 text-athlete-cyan" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-mono font-bold text-ink tracking-wider uppercase">
                Console Performance IA
              </h3>
              <span className="text-micro font-mono font-bold px-1.5 py-0.2 rounded-pill bg-metric-good/20 text-metric-good border border-metric-good/30">
                LIVE
              </span>
            </div>
            <span className="text-micro font-mono text-ink-muted">
              Sciences du sport • Garmin Duo Sync
            </span>
          </div>
        </div>

        {/* Web Search Live Toggle */}
        <button
          type="button"
          onClick={() => setUseSearch(!useSearch)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-tile text-micro font-mono font-semibold border transition-all ${
            useSearch
              ? 'bg-athlete-cyan/15 text-athlete-cyan border-athlete-cyan/40 shadow-[0_0_12px_-2px_rgba(37,99,235,0.30)]'
              : 'bg-surface-2 text-ink-muted border-border'
          }`}
          title="Activer ou désactiver la recherche dans la littérature sportive"
        >
          <Globe className="w-3 h-3" />
          <span>WEB {useSearch ? 'ON' : 'OFF'}</span>
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-bg">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';

          return (
            <div
              key={msg.id}
              className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar Icon */}
              <div
                className={`w-7 h-7 rounded-tile flex items-center justify-center flex-shrink-0 text-xs font-bold border ${
                  isUser
                    ? 'bg-surface-3 border-athlete-cyan/30 text-athlete-cyan'
                    : 'bg-surface-2 border-border-strong text-metric-good'
                }`}
              >
                {isUser ? <User className="w-3.5 h-3.5" /> : <Cpu className="w-3.5 h-3.5" />}
              </div>

              {/* Message Bubble */}
              <div
                className={`max-w-[85%] rounded-tile p-3 text-xs ${
                  isUser
                    ? 'bg-surface-3 border border-athlete-cyan/30 text-ink rounded-tr-xs shadow-sm'
                    : msg.error
                    ? 'bg-metric-bad/10 border border-metric-bad/30 text-metric-bad'
                    : 'bg-surface-2 border border-border text-ink rounded-tl-xs shadow-sm'
                }`}
              >
                {/* Message Body */}
                <div>{renderMessageContent(msg.content)}</div>

                {/* Sources if web search was used */}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-border">
                    <div className="text-micro font-mono uppercase font-bold text-ink-muted flex items-center gap-1 mb-1">
                      <Globe className="w-2.5 h-2.5 text-athlete-cyan" />
                      Sources consultées :
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.sources.map((src, sIdx) => (
                        <a
                          key={sIdx}
                          href={src.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-micro font-mono text-athlete-cyan hover:underline flex items-center gap-0.5 bg-surface-2 px-1.5 py-0.5 rounded-tile border border-border"
                        >
                          <span className="truncate max-w-[130px]">{src.title}</span>
                          <ExternalLink className="w-2 h-2 flex-shrink-0" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Timestamp */}
                <div className="text-micro text-ink-faint text-right mt-1 font-mono">
                  {msg.timestamp}
                </div>
              </div>
            </div>
          );
        })}

        {/* Loading Spinner */}
        {loading && (
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-tile bg-surface-2 border border-border-strong flex items-center justify-center text-athlete-cyan">
              <Bot className="w-3.5 h-3.5" />
            </div>
            <div className="p-3 rounded-tile bg-surface-2 border border-border flex items-center gap-2 text-xs font-mono text-ink-muted">
              <span className="w-2 h-2 rounded-pill bg-athlete-cyan animate-ping" />
              <span>Calcul télémétrique & analyse physiologique en cours...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Action Analyst Chips */}
      <div className="px-3 py-1.5 bg-surface-2 border-t border-border flex items-center gap-1.5 overflow-x-auto scrollbar-none">
        <Sparkles className="w-3 h-3 text-athlete-cyan flex-shrink-0" />
        {quickAnalystActions.map((action, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleQuickAction(action.text)}
            className="text-micro font-mono whitespace-nowrap px-2 py-0.5 rounded-tile bg-surface-3 hover:bg-surface-3/60 text-ink hover:text-ink border border-border transition-colors flex-shrink-0 flex items-center gap-1"
          >
            <action.icon className="w-4 h-4" />
            {action.label}
          </button>
        ))}
      </div>

      {/* Input Bar */}
      <div className="p-3 border-t border-border-strong bg-surface-2">
        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputText}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="Questionner l'analyste (ex: 'Allure seuil pour Clara', 'Régulation volume')..."
              className="w-full resize-none rounded-tile bg-bg border border-border-strong focus:border-athlete-cyan/50 px-3 py-2 text-xs text-ink placeholder:text-ink-faint focus-visible:outline-none transition-colors max-h-28"
            />
          </div>
          <button
            type="submit"
            disabled={!inputText.trim() || loading}
            className="w-9 h-9 rounded-tile btn-primary flex items-center justify-center flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            title="Envoyer le message"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
