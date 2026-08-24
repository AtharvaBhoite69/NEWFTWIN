import React, { useEffect, useState, useRef } from 'react';
import { api } from '../../api/client';
import { formatRelativeTime } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Plus, Send, Search, Trash2, Check, Sparkles, Bot } from 'lucide-react';
import { ChatVisual, ComparisonCard } from './ChatVisuals';

/* ─── typing indicator ─── */
function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: 5, padding: '12px 16px', alignItems: 'center' }}>
      {[0, 1, 2].map(i => (
        <motion.div
          key={i}
          style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)' }}
          animate={{ y: [0, -6, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.18 }}
        />
      ))}
    </div>
  );
}

export default function ChatPage() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConv, setActiveConv] = useState<number | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadConversations = async () => {
    try {
      const res = await api.getConversations();
      if (res.success) setConversations(res.data);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  };

  useEffect(() => { loadConversations(); }, []);

  const loadMessages = async (convId: number) => {
    setActiveConv(convId);
    try {
      const res = await api.getMessages(convId);
      if (res.success) setMessages(res.data);
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const createConversation = async () => {
    try {
      const res = await api.createConversation();
      if (res.success) {
        await loadConversations();
        setActiveConv(res.data.id);
        setMessages([]);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    } catch (err) {
      console.error('Failed to create conversation:', err);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !activeConv || sending) return;
    const content = input.trim();
    setInput('');
    setSending(true);

    // Optimistic user message
    const tempId = Date.now();
    setMessages(prev => [...prev, {
      id: tempId,
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    }]);

    try {
      const res = await api.sendMessage(activeConv, content);
      if (res.success) {
        setMessages(prev => [
          ...prev.slice(0, -1),
          { id: tempId, role: 'user', content, created_at: new Date().toISOString() },
          res.data,
        ]);
        loadConversations();
      }
    } catch (err: any) {
      console.error('Send error:', err);
      // Show error message in chat
      setMessages(prev => [
        ...prev,
        {
          id: Date.now(),
          role: 'assistant',
          content: `Sorry, I encountered an error: ${err.message || 'Please try again.'}`,
          created_at: new Date().toISOString(),
        },
      ]);
    }
    setSending(false);
  };

  const handleConfirmUpdate = async (msg: any) => {
    if (!msg.metadata?.financialData) return;
    try {
      const res = await api.confirmFinancialUpdate(msg.metadata.financialData, msg.id);

      // Mark as confirmed and store the post-update snapshot
      setMessages(prev =>
        prev.map(m =>
          m.id === msg.id
            ? {
                ...m,
                metadata: {
                  ...m.metadata,
                  confirmed: true,
                  postSnapshot: res.data?.postSnapshot || null,
                },
              }
            : m,
        ),
      );

      // Add a success follow-up message with the updated snapshot comparison
      const successMsg = res.data?.message || 'Updated successfully!';
      setMessages(prev => [
        ...prev,
        {
          id: Date.now(),
          role: 'assistant',
          content: `✅ ${successMsg} Your dashboard has been updated. Here's the impact 👇`,
          created_at: new Date().toISOString(),
          metadata: {
            visualData: {
              type: 'snapshot',
              snapshot: res.data?.postSnapshot || {},
              expenseBreakdown: [],
              incomeBreakdown: [],
            },
          },
        },
      ]);
    } catch (err) {
      console.error('Confirm error:', err);
    }
  };

  const deleteConversation = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    await api.deleteConversation(id);
    if (activeConv === id) {
      setActiveConv(null);
      setMessages([]);
    }
    loadConversations();
  };

  const filteredConvs = searchQuery
    ? conversations.filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : conversations;

  const SUGGESTIONS = [
    'My salary is ₹1,20,000 per month',
    'How much can I safely invest?',
    'I want to plan a ₹15 Lakh wedding',
    'What is my financial health score?',
  ];

  return (
    <div style={{
      display: 'flex',
      height: 'calc(100vh - 64px)',
      marginTop: 64,
      borderTop: '1px solid var(--border)',
    }}>

      {/* ── SIDEBAR ── */}
      <div style={{
        width: 280,
        borderRight: '1px solid var(--border)',
        background: 'var(--bg-secondary)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
      }}>
        {/* Sidebar Header */}
        <div style={{
          padding: '16px 18px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: 'var(--accent-subtle)', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Bot size={14} style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1 }}>FTWIN</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>AI ADVISOR</div>
            </div>
          </div>
          <button
            onClick={createConversation}
            title="New chat"
            style={{
              background: 'var(--accent)',
              border: 'none',
              borderRadius: 8,
              width: 30, height: 30,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            <Plus size={15} style={{ color: '#fff' }} />
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              className="input"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ paddingLeft: 30, fontSize: 13, padding: '7px 10px 7px 30px', borderRadius: 8 }}
            />
          </div>
        </div>

        {/* Conversation List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          {filteredConvs.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: '32px 16px' }}>
              <MessageSquare size={24} style={{ opacity: 0.3, marginBottom: 8 }} />
              <p>No conversations yet.<br />Start one above.</p>
            </div>
          )}
          <AnimatePresence>
            {filteredConvs.map(conv => {
              const isActive = activeConv === conv.id;
              return (
                <motion.div
                  key={conv.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  onClick={() => loadMessages(conv.id)}
                  style={{
                    padding: '9px 12px',
                    borderRadius: 10,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    background: isActive ? 'var(--accent-subtle)' : 'transparent',
                    border: isActive ? '1px solid var(--accent)' : '1px solid transparent',
                    marginBottom: 2,
                    transition: 'all 0.15s',
                  }}
                >
                  <MessageSquare size={14} style={{ color: isActive ? 'var(--accent)' : 'var(--text-muted)', flexShrink: 0 }} />
                  <span style={{
                    flex: 1,
                    fontSize: 13,
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {conv.title}
                  </span>
                  <button
                    onClick={e => deleteConversation(conv.id, e)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2, opacity: 0.5, flexShrink: 0 }}
                    title="Delete"
                  >
                    <Trash2 size={12} />
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* ── CHAT AREA ── */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
      }}>

        {/* Background image — always shown, subtle */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'url(/chat-bg.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.12,
          zIndex: 0,
          pointerEvents: 'none',
        }} />
        {/* Overlay so text stays readable */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'var(--bg-primary)',
          opacity: 0.88,
          zIndex: 1,
          pointerEvents: 'none',
        }} />

        {activeConv ? (
          <>
            {/* Chat Header */}
            <div style={{
              position: 'relative', zIndex: 2,
              padding: '12px 24px',
              borderBottom: '1px solid var(--border)',
              background: 'var(--bg-card)',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'var(--accent-subtle)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '1px solid var(--accent)',
              }}>
                <Sparkles size={16} style={{ color: 'var(--accent)' }} />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>FTWIN</div>
                <div style={{ fontSize: 11, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)', display: 'inline-block' }} />
                  Your Personal Financial AI
                </div>
              </div>
            </div>

            {/* Messages */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '24px 32px',
              position: 'relative',
              zIndex: 2,
            }}>
              {messages.length === 0 && (
                <div style={{ textAlign: 'center', paddingTop: 60 }}>
                  <div style={{
                    width: 64, height: 64, borderRadius: 20,
                    background: 'var(--accent-subtle)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 16px',
                    border: '1px solid var(--accent)',
                  }}>
                    <Sparkles size={28} style={{ color: 'var(--accent)' }} />
                  </div>
                  <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>
                    Hi, I'm FTWIN
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', maxWidth: 460, margin: '0 auto 28px', fontSize: 15, lineHeight: 1.6 }}>
                    Your personal financial AI. Ask me anything about your money, goals, or finances.
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', maxWidth: 580, margin: '0 auto' }}>
                    {SUGGESTIONS.map(q => (
                      <button
                        key={q}
                        onClick={() => { setInput(q); inputRef.current?.focus(); }}
                        style={{
                          background: 'var(--bg-card)',
                          border: '1px solid var(--border)',
                          borderRadius: 20,
                          padding: '8px 16px',
                          fontSize: 13,
                          color: 'var(--text-primary)',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => { (e.currentTarget.style.borderColor = 'var(--accent)'); (e.currentTarget.style.background = 'var(--accent-subtle)'); }}
                        onMouseLeave={e => { (e.currentTarget.style.borderColor = 'var(--border)'); (e.currentTarget.style.background = 'var(--bg-card)'); }}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <AnimatePresence initial={false}>
                {messages.map((msg, i) => {
                  const isUser = msg.role === 'user';
                  return (
                    <motion.div
                      key={msg.id || i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      style={{
                        marginBottom: 16,
                        display: 'flex',
                        justifyContent: isUser ? 'flex-end' : 'flex-start',
                        alignItems: 'flex-end',
                        gap: 8,
                      }}
                    >
                      {/* Bot avatar */}
                      {!isUser && (
                        <div style={{
                          width: 28, height: 28, borderRadius: 8,
                          background: 'var(--accent-subtle)',
                          border: '1px solid var(--accent)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0,
                        }}>
                          <Sparkles size={12} style={{ color: 'var(--accent)' }} />
                        </div>
                      )}

                      <div style={{
                        maxWidth: msg.metadata?.visualData ? 720 : 620,
                        padding: '13px 17px',
                        borderRadius: isUser ? '16px 16px 4px 16px' : '4px 16px 16px 16px',
                        background: isUser ? 'var(--text-primary)' : 'var(--bg-card)',
                        color: isUser ? 'var(--bg-primary)' : 'var(--text-primary)',
                        border: isUser ? 'none' : '1px solid var(--border)',
                        boxShadow: 'var(--shadow-md)',
                      }}>
                        <p style={{ fontSize: 14, lineHeight: 1.65, whiteSpace: 'pre-wrap', margin: 0 }}>
                          {msg.content}
                        </p>

                        {/* ── Rich Visual Components ── */}
                        {!isUser && msg.metadata?.visualData && (
                          <ChatVisual visualData={msg.metadata.visualData} />
                        )}

                        {/* ── Before/After comparison for auto-confirmed updates ── */}
                        {!isUser && msg.metadata?.autoConfirmed && msg.metadata?.preChangeSnapshot && msg.metadata?.postSnapshot && (
                          <ComparisonCard before={msg.metadata.preChangeSnapshot} after={msg.metadata.postSnapshot} />
                        )}

                        {/* Confirmation notification */}
                        {msg.metadata?.confirmationRequired && !msg.metadata?.confirmed && (
                          <div style={{
                            marginTop: 12, padding: '14px 16px',
                            borderRadius: 12,
                            background: 'linear-gradient(135deg, rgba(200,169,126,0.08), rgba(200,169,126,0.02))',
                            border: '1px solid var(--accent)',
                            boxShadow: '0 2px 12px rgba(200,169,126,0.1)',
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                              <div style={{
                                width: 28, height: 28, borderRadius: 8,
                                background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}>
                                <span style={{ fontSize: 14 }}>🔔</span>
                              </div>
                              <div>
                                <p style={{ fontSize: 13, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                                  Update Dashboard?
                                </p>
                                <p style={{ fontSize: 12, margin: 0, color: 'var(--text-secondary)' }}>
                                  {msg.metadata.confirmationMessage}
                                </p>
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                              <button
                                onClick={() => handleConfirmUpdate(msg)}
                                className="btn-accent"
                                style={{ padding: '7px 16px', fontSize: 12, borderRadius: 8, fontWeight: 600 }}
                              >
                                <Check size={13} /> Yes, Update Dashboard
                              </button>
                              <button
                                className="btn-secondary"
                                style={{ padding: '7px 14px', fontSize: 12, borderRadius: 8 }}
                                onClick={() => setMessages(prev => prev.map(m =>
                                  m.id === msg.id
                                    ? { ...m, metadata: { ...m.metadata, confirmationRequired: false } }
                                    : m,
                                ))}
                              >
                                Dismiss
                              </button>
                              <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>
                                or type <strong>yes</strong> to confirm
                              </span>
                            </div>
                          </div>
                        )}

                        {msg.metadata?.confirmed && (
                          <div>
                            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--success)', fontWeight: 600 }}>
                              <Check size={12} /> Applied to your Financial Twin & Dashboard
                            </div>
                            {msg.metadata?.preChangeSnapshot && msg.metadata?.postSnapshot && (
                              <ComparisonCard before={msg.metadata.preChangeSnapshot} after={msg.metadata.postSnapshot} />
                            )}
                          </div>
                        )}

                        <p style={{ fontSize: 11, color: isUser ? 'rgba(255,255,255,0.5)' : 'var(--text-muted)', marginTop: 5, textAlign: 'right', margin: '6px 0 0' }}>
                          {formatRelativeTime(msg.created_at)}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {/* Typing indicator */}
              {sending && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}
                >
                  <div style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: 'var(--accent-subtle)',
                    border: '1px solid var(--accent)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Sparkles size={12} style={{ color: 'var(--accent)' }} />
                  </div>
                  <div style={{
                    padding: '4px 4px',
                    borderRadius: '4px 16px 16px 16px',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    boxShadow: 'var(--shadow)',
                  }}>
                    <TypingDots />
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <div style={{
              padding: '14px 24px',
              borderTop: '1px solid var(--border)',
              background: 'var(--bg-card)',
              position: 'relative', zIndex: 2,
            }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                <input
                  ref={inputRef}
                  className="input"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  placeholder="Ask FTWIN about your money..."
                  style={{ flex: 1, borderRadius: 12 }}
                  disabled={sending}
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || sending}
                  className="btn-accent"
                  style={{
                    padding: '12px 18px',
                    borderRadius: 12,
                    opacity: !input.trim() || sending ? 0.5 : 1,
                    transition: 'opacity 0.2s',
                  }}
                >
                  <Send size={16} />
                </button>
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, textAlign: 'center' }}>
                FTWIN AI · Powered by Groq · Press Enter to send
              </p>
            </div>
          </>
        ) : (
          /* No conversation selected */
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            zIndex: 2,
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: 72, height: 72, borderRadius: 22,
                background: 'var(--accent-subtle)',
                border: '1px solid var(--accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px',
              }}>
                <Sparkles size={32} style={{ color: 'var(--accent)' }} />
              </div>
              <h3 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>
                FTWIN AI Advisor
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: 15, marginBottom: 24, maxWidth: 320, lineHeight: 1.6 }}>
                Your personal financial intelligence. Ask anything about your money, goals, or future.
              </p>
              <button onClick={createConversation} className="btn-accent" style={{ padding: '12px 28px', borderRadius: 12 }}>
                <Plus size={16} /> Start a Conversation
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
