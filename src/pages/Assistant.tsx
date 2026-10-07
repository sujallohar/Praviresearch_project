import React, { useState, useEffect, useRef } from 'react';
import { askAssistant } from '../lib/gemini';
import { Sparkles, Send, User, Bot, Shield, Trash2, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isMock?: boolean;
}

// Lightweight, secure formatted text renderer for AI responses
const FormattedContent: React.FC<{ content: string; isUser: boolean }> = ({ content, isUser }) => {
  if (isUser) {
    return <div className="break-words whitespace-pre-wrap">{content}</div>;
  }

  const lines = content.split('\n');

  const renderInline = (text: string) => {
    // Replace markdown links [text](url)
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const parts: (string | React.ReactNode)[] = [];
    let lastIdx = 0;
    let match;

    while ((match = linkRegex.exec(text)) !== null) {
      if (match.index > lastIdx) {
        parts.push(text.slice(lastIdx, match.index));
      }
      parts.push(
        <a 
          key={match.index} 
          href={match[2]} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-blue-600 underline font-semibold hover:text-blue-800 break-all"
        >
          {match[1]}
        </a>
      );
      lastIdx = linkRegex.lastIndex;
    }
    if (lastIdx < text.length) {
      parts.push(text.slice(lastIdx));
    }

    return parts.map((part, pIdx) => {
      if (typeof part !== 'string') return part;

      // Split by code `code`
      const codeParts = part.split(/(`[^`]+`)/g);
      return codeParts.map((cPart, cIdx) => {
        if (cPart.startsWith('`') && cPart.endsWith('`')) {
          return (
            <code key={`${pIdx}-${cIdx}`} className="bg-slate-100 text-slate-800 px-1 py-0.5 rounded text-[11px] font-mono border border-slate-200">
              {cPart.slice(1, -1)}
            </code>
          );
        }

        // Split by bold **bold**
        const boldParts = cPart.split(/(\*\*[^*]+\*\*)/g);
        return boldParts.map((bPart, bIdx) => {
          if (bPart.startsWith('**') && bPart.endsWith('**')) {
            return <strong key={`${pIdx}-${cIdx}-${bIdx}`} className="font-bold text-slate-900">{bPart.slice(2, -2)}</strong>;
          }
          return bPart;
        });
      });
    });
  };

  return (
    <div className="space-y-1.5 text-xs sm:text-sm leading-relaxed break-words overflow-hidden">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={idx} className="h-1.5" />;
        }
        if (trimmed.startsWith('### ')) {
          return (
            <h3 key={idx} className="text-sm sm:text-base font-extrabold text-slate-900 mt-2.5 mb-1 border-b border-slate-100 pb-1 break-words">
              {renderInline(trimmed.replace('### ', ''))}
            </h3>
          );
        }
        if (trimmed.startsWith('#### ')) {
          return (
            <h4 key={idx} className="text-xs sm:text-sm font-bold text-slate-800 mt-2 mb-0.5 break-words">
              {renderInline(trimmed.replace('#### ', ''))}
            </h4>
          );
        }
        if (trimmed.startsWith('- ') || trimmed.startsWith('• ') || trimmed.startsWith('* ')) {
          return (
            <div key={idx} className="flex items-start gap-1.5 pl-1 my-0.5">
              <span className="text-blue-500 font-bold shrink-0 mt-0.5">•</span>
              <span className="flex-1 break-words min-w-0">{renderInline(trimmed.slice(2))}</span>
            </div>
          );
        }
        if (trimmed.startsWith('> ')) {
          return (
            <div key={idx} className="bg-blue-50/80 border-l-2 border-blue-500 p-2 rounded-r-lg text-slate-700 text-xs italic my-1.5 break-words">
              {renderInline(trimmed.slice(2))}
            </div>
          );
        }
        return (
          <p key={idx} className="break-words">
            {renderInline(line)}
          </p>
        );
      })}
    </div>
  );
};

export const Assistant: React.FC = () => {
  const { profile, role, currentUser, loading: authLoading } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const getSuggestedQuestions = () => {
    if (role === 'Field Engineer') {
      return [
        "What are my assigned tasks and reported issues?",
        "Which assets require urgent inspection?",
        "Show critical condition assets in my zone",
        "Explain my field engineer access permissions"
      ];
    }
    if (role === 'Contractor') {
      return [
        "What are my scheduled work orders?",
        "Which maintenance tasks are pending?",
        "Show repair costs and deadlines",
        "Explain my contractor permissions"
      ];
    }
    if (role === 'Viewer') {
      return [
        "Overview of public infrastructure condition",
        "Which capital projects are ongoing?",
        "Show public safety notices and hazards",
        "How do I report a civic hazard?"
      ];
    }
    if (role === 'Admin') {
      return [
        "Full system audit: asset health, budgets & critical risks",
        "Which projects are over budget or delayed?",
        "Show critical infrastructure risks across all departments",
        "Overview of active work orders, contractors, and unresolved issues"
      ];
    }
    // Government Officer default
    return [
      "Which assets require attention this week?",
      "What are my assigned records and supervised assets?",
      "Show projects delayed and budget utilization",
      "Explain my access control permissions and authority"
    ];
  };

  const getStorageKey = () => {
    const uid = currentUser?.uid || 'guest';
    const currentRole = role || 'Viewer';
    return `govasset_chat_history_${uid}_${currentRole}`;
  };

  const getDefaultGreeting = (): Message => ({
    id: 'initial-greeting',
    role: 'assistant',
    content: `Hello **${profile?.name || 'Citizen'}**! I am your GovAsset Intelligence Assistant. I am grounded directly in your live Firestore database and synchronized with your **${role || 'Viewer'}** security credentials.\n\nHow can I assist your operations today?`
  });

  const [messages, setMessages] = useState<Message[]>([getDefaultGreeting()]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const activeKeyRef = useRef<string>('');
  const isInitializedRef = useRef<boolean>(false);

  // Auto-scroll chat to bottom
  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  };

  // Safe load of chat history keyed to current user/role
  useEffect(() => {
    if (authLoading) return; // Wait until Firebase Auth resolves

    const currentKey = getStorageKey();
    activeKeyRef.current = currentKey;

    try {
      const saved = localStorage.getItem(currentKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          isInitializedRef.current = true;
          return;
        }
      }
    } catch (e) {
      console.warn('Failed to parse saved chat history:', e);
    }

    // Default message if no history exists for this user
    setMessages([getDefaultGreeting()]);
    isInitializedRef.current = true;
  }, [currentUser?.uid, role, authLoading, profile?.name]);

  // Persist messages only AFTER this key has been properly loaded
  useEffect(() => {
    if (!isInitializedRef.current || !activeKeyRef.current) return;

    try {
      localStorage.setItem(activeKeyRef.current, JSON.stringify(messages));
    } catch (e) {
      console.warn('Failed to save chat history to localStorage:', e);
    }
  }, [messages]);

  // Scroll to bottom on new message or loading change
  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (question: string) => {
    if (!question.trim()) return;
    
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: question.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const response = await askAssistant(question, {
        name: profile?.name || 'User',
        role: role || 'Government Officer',
        email: currentUser?.email || '',
        department: profile?.department || 'Public Works'
      });

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.text,
        isMock: response.isMock
      }]);
    } catch (error) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I encountered an issue querying the intelligence database. Please try again."
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    const refreshed: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: `Conversation refreshed. Ready to assist you, **${profile?.name || 'User'}** (${role || 'Viewer'}).`
    };
    setMessages([refreshed]);
    if (activeKeyRef.current) {
      try {
        localStorage.setItem(activeKeyRef.current, JSON.stringify([refreshed]));
      } catch {
        // Ignore
      }
    }
  };

  const suggestions = getSuggestedQuestions();

  return (
    <div className="flex flex-col h-[calc(100dvh-10.5rem)] sm:h-[calc(100vh-8rem)] max-h-[820px] min-h-[460px] bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden min-w-0 w-full">
      {/* Header */}
      <div className="bg-slate-900 text-white p-3.5 sm:p-4 flex items-center justify-between gap-3 border-b border-slate-800 flex-shrink-0 min-w-0">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
          <div className="p-2 sm:p-2.5 bg-blue-600 rounded-xl shadow-inner shrink-0">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-bold text-sm sm:text-base tracking-tight truncate">Intelligence Engine</h1>
              <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 shrink-0">
                Live Data Grounded
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 flex items-center gap-1.5 truncate">
              <Shield className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-400 shrink-0" />
              <span className="truncate">Operator: <strong>{profile?.name || 'Citizen'}</strong> ({role || 'Viewer'})</span>
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleClear}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition-colors"
            title="Reset conversation"
          >
            <Trash2 className="w-3.5 h-3.5" /> 
            <span className="hidden sm:inline">Clear Chat</span>
          </button>
        </div>
      </div>

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-5 space-y-4 bg-slate-50/75 min-w-0">
        {messages.map(msg => (
          <div 
            key={msg.id} 
            className={`flex gap-2.5 sm:gap-3.5 max-w-[92%] sm:max-w-[85%] min-w-0 ${
              msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''
            }`}
          >
            <div className={`w-7 h-7 sm:w-8 sm:h-8 shrink-0 rounded-xl flex items-center justify-center shadow-xs ${
              msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-blue-600'
            }`}>
              {msg.role === 'user' ? <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
            </div>
            <div className={`p-3 sm:p-4 rounded-2xl text-xs sm:text-sm min-w-0 break-words overflow-hidden ${
              msg.role === 'user' 
                ? 'bg-blue-600 text-white rounded-tr-xs shadow-sm font-medium' 
                : 'bg-white border border-slate-200/80 text-slate-800 rounded-tl-xs shadow-xs'
            }`}>
              <FormattedContent content={msg.content} isUser={msg.role === 'user'} />
              {msg.isMock && (
                <div className="mt-2.5 pt-2 border-t border-slate-100 text-[10px] text-slate-400 flex items-center gap-1.5">
                  <Shield className="w-3 h-3 text-blue-500 shrink-0" /> 
                  <span className="truncate">Grounded via Live Firestore Database (Local Intelligence Mode)</span>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-2.5 sm:gap-3.5 max-w-[85%] min-w-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 shrink-0 rounded-xl bg-white border border-slate-200 text-blue-600 flex items-center justify-center shadow-xs">
              <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <div className="p-3 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-xs rounded-tl-xs min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">Analyzing records & access control...</span>
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area & Dynamic Suggestions */}
      <div className="p-2.5 sm:p-4 bg-white border-t border-slate-200 flex-shrink-0 min-w-0">
        <div className="mb-2 sm:mb-3 min-w-0">
          <p className="text-[10px] sm:text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            Suggested Queries for {role || 'Viewer'}:
          </p>
          <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1 scrollbar-hide min-w-0">
            {suggestions.map(q => (
              <button 
                key={q}
                onClick={() => handleSend(q)}
                className="px-2.5 py-1 whitespace-nowrap bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 rounded-lg text-xs font-medium transition-colors border border-slate-200/60 flex items-center gap-1 shrink-0"
              >
                <span>{q}</span>
                <ArrowRight className="w-3 h-3 opacity-50 shrink-0" />
              </button>
            ))}
          </div>
        </div>
        
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
          className="flex gap-1.5 sm:gap-2"
        >
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Ask about your ${role || 'assigned'} tasks, assets, projects...`}
            className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-xs sm:text-sm text-slate-900 transition-all font-medium min-w-0"
          />
          <button 
            type="submit"
            disabled={!input.trim() || loading}
            className="px-3.5 sm:px-5 py-2 sm:py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-xs sm:text-sm transition-colors shadow-xs flex items-center gap-1.5 shrink-0"
          >
            <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>
      </div>
    </div>
  );
};
