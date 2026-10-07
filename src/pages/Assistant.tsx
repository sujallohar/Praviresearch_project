import React, { useState, useEffect } from 'react';
import { askAssistant } from '../lib/gemini';
import { Sparkles, Send, User, Bot, Shield, Trash2, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isMock?: boolean;
}

export const Assistant: React.FC = () => {
  const { profile, role, currentUser } = useAuth();

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
        "What are my viewer access permissions?"
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

  const chatStorageKey = `govasset_chat_history_${currentUser?.uid || 'guest'}_${role || 'Viewer'}`;

  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem(chatStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse saved chat history:', e);
    }
    return [{
      id: '1',
      role: 'assistant',
      content: `Hello **${profile?.name || 'Officer'}**! I am your GovAsset Intelligence Assistant. I am grounded directly in your live Firestore database and synchronized with your **${role || 'Government Officer'}** security credentials.\n\nHow can I assist your operations today?`
    }];
  });

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  // Persist messages across page switches, app minimizations (e.g. WhatsApp), and reloads
  useEffect(() => {
    try {
      localStorage.setItem(chatStorageKey, JSON.stringify(messages));
    } catch (e) {
      console.warn('Failed to save chat history to localStorage:', e);
    }
  }, [messages, chatStorageKey]);

  const handleSend = async (question: string) => {
    if (!question.trim()) return;
    
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: question };
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
      content: `Conversation refreshed. Ready to assist you, **${profile?.name || 'User'}** (${role || 'Government Officer'}).`
    };
    setMessages([refreshed]);
    try {
      localStorage.setItem(chatStorageKey, JSON.stringify([refreshed]));
    } catch {
      // Ignore
    }
  };

  const suggestions = getSuggestedQuestions();

  return (
    <div className="flex flex-col h-[calc(100vh-7.5rem)] max-h-[820px] bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="bg-slate-900 text-white p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-600 rounded-xl shadow-inner">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-base tracking-tight">Institutional Intelligence Engine</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                Live Data Grounded
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>Operator: <strong>{profile?.name || 'Officer'}</strong> ({role || 'Government Officer'})</span>
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleClear}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition-colors"
            title="Reset conversation"
          >
            <Trash2 className="w-3.5 h-3.5" /> Clear Chat
          </button>
        </div>
      </div>

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/75">
        {messages.map(msg => (
          <div key={msg.id} className={`flex gap-3.5 max-w-[88%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 shrink-0 rounded-xl flex items-center justify-center shadow-sm ${
              msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-blue-600'
            }`}>
              {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>
            <div className={`p-4 rounded-2xl text-sm ${
              msg.role === 'user' 
                ? 'bg-blue-600 text-white rounded-tr-sm shadow-md' 
                : 'bg-white border border-slate-200/80 text-slate-800 rounded-tl-sm shadow-sm'
            }`}>
              <div className="whitespace-pre-wrap leading-relaxed space-y-2">
                {msg.content}
              </div>
              {msg.isMock && (
                <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-slate-400 flex items-center gap-1.5">
                  <Shield className="w-3 h-3 text-blue-500" /> Grounded via Live Firestore Database (Local Intelligence Mode)
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3.5 max-w-[85%]">
            <div className="w-8 h-8 shrink-0 rounded-xl bg-white border border-slate-200 text-blue-600 flex items-center justify-center shadow-sm">
              <Bot className="w-4 h-4" />
            </div>
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm rounded-tl-sm">
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
      </div>

      {/* Input Area & Dynamic Suggestions */}
      <div className="p-4 bg-white border-t border-slate-200">
        <div className="mb-3">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Suggested Queries for {role || 'Government Officer'}:
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {suggestions.map(q => (
              <button 
                key={q}
                onClick={() => handleSend(q)}
                className="px-3 py-1.5 whitespace-nowrap bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 rounded-lg text-xs font-medium transition-colors border border-slate-200/60 flex items-center gap-1"
              >
                <span>{q}</span>
                <ArrowRight className="w-3 h-3 opacity-50" />
              </button>
            ))}
          </div>
        </div>
        
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
          className="flex gap-2"
        >
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Ask about your ${role || 'assigned'} tasks, assets requiring attention, projects...`}
            className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm text-slate-900 transition-all font-medium"
          />
          <button 
            type="submit"
            disabled={!input.trim() || loading}
            className="px-5 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-sm transition-colors shadow-sm flex items-center gap-1.5"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>
      </div>
    </div>
  );
};
