import { useState, useEffect } from 'react';
import { chatApi, uuid } from '../api/client';
import { useAuth } from '../context/AuthContext';

const dependenciesMap = {
  gemini: 'Gemini (IA)',
  auth_service: 'Autenticación (G2)',
  catalog_service: 'Catálogo (G3)',
  order_service: 'Pedidos (G5)',
  payment_service: 'Pagos (G6)',
  inventory_service: 'Inventario (G7)',
  shipment_service: 'Envíos (G8)',
  notification_service: 'Notificaciones (G9)',
  reporting_service: 'Supervisor (G10)'
};

const faqCategoryNames = {
  faq_cuenta: 'Cuenta',
  faq_envios: 'Envíos',
  faq_pagos: 'Pagos',
  faq_productos: 'Productos'
};

function formatMarkdown(text) {
  const raw = String(text ?? '');
  if (!raw) return '';
  let html = raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  const lines = html.split('\n');
  let inList = false;
  const processed = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
      if (!inList) {
        inList = true;
        processed.push('<ul>');
      }
      processed.push(`<li>${trimmed.substring(2)}</li>`);
    } else {
      if (inList) {
        inList = false;
        processed.push('</ul>');
      }
      processed.push(line);
    }
  }
  if (inList) processed.push('</ul>');
  return processed.join('\n');
}

export default function ChatWidget() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState('chat'); // 'chat' | 'settings'
  const [sessionId] = useState(() => uuid());
  const [messages, setMessages] = useState([
    {
      from: 'bot',
      text: '¡Hola! Soy el asistente de FishMarket Cloud. Pregúntame por envíos, pagos o tu pedido.',
      isWelcome: true
    }
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  // Estados para FAQ
  const [selectedFaqCategory, setSelectedFaqCategory] = useState(null);
  const [faqQuestions, setFaqQuestions] = useState([]);

  // Estados para Health/Conexiones
  const [health, setHealth] = useState(null);
  const [loadingHealth, setLoadingHealth] = useState(false);

  // Actualización dinámica del mensaje de bienvenida si cambia la sesión
  useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 1 && prev[0].isWelcome) {
        return [{
          from: 'bot',
          text: user
            ? `¡Hola, **${user.fullName || user.full_name || 'usuario'}**! 👋 Soy el asistente de FishMarket Cloud. ¿En qué puedo ayudarte hoy con tus pedidos o productos?`
            : '¡Hola! Soy el asistente de FishMarket Cloud. Pregúntame por envíos, pagos o tu pedido.',
          isWelcome: true
        }];
      }
      return prev;
    });
  }, [user]);

  const fetchHealth = async () => {
    setLoadingHealth(true);
    try {
      const res = await chatApi.health();
      setHealth(res.data);
    } catch {
      setHealth({ status: 'error', dependencies: {} });
    } finally {
      setLoadingHealth(false);
    }
  };

  const handleToggleSettings = () => {
    if (view === 'chat') {
      setView('settings');
      fetchHealth();
    } else {
      setView('chat');
    }
  };

  const handleCategoryClick = async (category) => {
    setSelectedFaqCategory(category);
    setSending(true);
    try {
      const res = await chatApi.faq(category);
      setFaqQuestions(res.data.items || []);
    } catch {
      // Si falla, no mostramos preguntas falsas (JSON fake) y avisamos que aún no está conectado al backend
      setMessages((m) => [
        ...m,
        { from: 'bot', text: 'El servicio de preguntas frecuentes no está disponible en este momento porque el chatbot aún no se conecta al backend.' }
      ]);
      setFaqQuestions([]);
      setSelectedFaqCategory(null);
    } finally {
      setSending(false);
    }
  };

  const handleFaqQuestionClick = (question, answer) => {
    setMessages((m) => [
      ...m,
      { from: 'user', text: question },
      { from: 'bot', text: answer }
    ]);
    setFaqQuestions([]);
    setSelectedFaqCategory(null);
  };

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    setMessages((m) => [...m, { from: 'user', text }]);
    setInput('');
    setSending(true);

    try {
      const { data } = await chatApi.send(sessionId, text, user?.business_user_id);
      const metaText = `Intent: ${data.intent_detected || 'lógica interna'} · Fuentes: ${(data.sources_consulted || []).join(', ') || 'lógica interna'}`;
      setMessages((m) => [...m, { from: 'bot', text: data.response, meta: metaText }]);
    } catch (err) {
      if (err.status === 401 || err.code === 'UNAUTHORIZED') {
        setMessages((m) => [
          ...m,
          { 
            from: 'bot', 
            text: '🔒 **Acceso Protegido**: Hola, eres un usuario invitado. Para poder ayudarte con información personal (como tus pedidos o notificaciones), por favor inicia sesión en la barra superior.'
          }
        ]);
      } else {
        setMessages((m) => [
          ...m,
          { from: 'bot', text: 'No pude conectarme con el asistente en este momento. Intenta de nuevo en un momento.' }
        ]);
      }
    } finally {
      setSending(false);
    }
  };

  const toggleOpen = () => {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (nextOpen) {
      setView('chat');
      setFaqQuestions([]);
      setSelectedFaqCategory(null);
    }
  };

  return (
    <div className="chat-widget">
      {open && (
        <div className="chat-widget__panel">
          <div className="chat-widget__header">
            <span>Asistente FishMarket</span>
            <div className="chat-widget__header-actions">
              <button 
                type="button" 
                className="chat-widget__header-btn" 
                onClick={handleToggleSettings}
                title={view === 'chat' ? 'Ver conexiones' : 'Volver al chat'}
                aria-label="Ajustes de conexión"
              >
                {view === 'chat' ? '⚙️' : '💬'}
              </button>
              <button 
                type="button" 
                className="chat-widget__header-btn" 
                onClick={toggleOpen}
                aria-label="Cerrar chat"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="chat-widget__body">
            {view === 'chat' ? (
              <>
                <div className="chat-widget__messages">
                  {messages.map((m, idx) => (
                    <div 
                      key={idx} 
                      className={`chat-widget__msg-row chat-widget__msg-row--${m.from}`}
                    >
                      <div className="chat-widget__avatar">
                        {m.from === 'bot' ? '◆' : 'U'}
                      </div>
                      <div className="chat-widget__bubble-wrap">
                        <div 
                          className="chat-widget__bubble"
                          dangerouslySetInnerHTML={{ __html: formatMarkdown(m.text) }}
                        />
                        {m.meta && (
                          <div className="chat-widget__msg-meta">
                            {m.meta}
                          </div>
                        )}
                        {idx === 0 && !selectedFaqCategory && (
                          <div className="chat-widget__faq-section">
                            <div className="chat-widget__faq-title">Preguntas Frecuentes:</div>
                            <div className="chat-widget__faq-grid">
                              <button type="button" className="chat-widget__faq-btn" onClick={() => handleCategoryClick('faq_cuenta')}>👤 Cuenta</button>
                              <button type="button" className="chat-widget__faq-btn" onClick={() => handleCategoryClick('faq_envios')}>🚚 Envíos</button>
                              <button type="button" className="chat-widget__faq-btn" onClick={() => handleCategoryClick('faq_pagos')}>💳 Pagos</button>
                              <button type="button" className="chat-widget__faq-btn" onClick={() => handleCategoryClick('faq_productos')}>📦 Productos</button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {sending && (
                    <div className="chat-widget__msg-row chat-widget__msg-row--bot">
                      <div className="chat-widget__avatar">◆</div>
                      <div className="chat-widget__bubble">
                        <div className="typing-loader">
                          <span></span>
                          <span></span>
                          <span></span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {faqQuestions.length > 0 && (
                  <div style={{ padding: '0 16px' }}>
                    <div className="chat-widget__faq-section">
                      <div className="chat-widget__faq-title">FAQ ({faqCategoryNames[selectedFaqCategory]}):</div>
                      <div className="chat-widget__faq-grid">
                        {faqQuestions.map((item, idx) => (
                          <button
                            key={idx}
                            type="button"
                            className="chat-widget__faq-btn"
                            onClick={() => handleFaqQuestionClick(item.question, item.answer)}
                          >
                            {item.question}
                          </button>
                        ))}
                        <button
                          type="button"
                          className="chat-widget__faq-btn"
                          style={{ gridColumn: 'span 2', justifyContent: 'center', background: 'var(--color-bg)' }}
                          onClick={() => {
                            setFaqQuestions([]);
                            setSelectedFaqCategory(null);
                          }}
                        >
                          ✕ Ocultar preguntas
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <form className="chat-widget__input-form" onSubmit={handleSend}>
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Escribe tu pregunta o duda..."
                    aria-label="Mensaje para el asistente"
                    disabled={sending}
                  />
                  <button 
                    type="submit" 
                    className="btn btn-primary btn-sm" 
                    disabled={sending || !input.trim()}
                  >
                    Enviar
                  </button>
                </form>
              </>
            ) : (
              <div className="chat-widget__settings">
                <div className="chat-widget__settings-title">Auditoría de Conexiones</div>
                <div className="chat-widget__settings-subtitle">
                  Estado de la comunicación en tiempo real con los microservicios del ecosistema.
                </div>

                {loadingHealth ? (
                  <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--color-text-muted)', fontSize: '13px' }}>
                    Verificando microservicios…
                  </div>
                ) : (
                  <ul className="chat-widget__conn-list">
                    {Object.entries(dependenciesMap).map(([key, label]) => {
                      const status = health?.dependencies?.[key] || 'error';
                      let badgeClass = 'error';
                      let badgeText = 'desconectado';
                      
                      if (status === 'ok') {
                        badgeClass = 'ok';
                        badgeText = 'activo';
                      } else if (status === 'ok (mock)' || status === 'mocked' || status === 'not_configured') {
                        badgeClass = 'inactive';
                        badgeText = 'inactivo';
                      }

                      return (
                        <li className="chat-widget__conn-item" key={key}>
                          <span className="chat-widget__conn-name">{label}</span>
                          <span className={`chat-widget__conn-badge chat-widget__conn-badge--${badgeClass}`}>
                            {badgeText}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}

                <div className="chat-widget__settings-footer">
                  <div className="chat-widget__status-footer-row">
                    <span className={`chat-widget__status-dot chat-widget__status-dot--${health?.status === 'ok' ? 'ok' : 'error'}`} />
                    <span>
                      {health?.status === 'ok' 
                        ? `Conectado al Servidor (v${health?.version || '1.1'})` 
                        : 'Sin comunicación con el backend'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      <button 
        type="button"
        className="chat-widget__toggle" 
        onClick={toggleOpen} 
        aria-label="Abrir chat de ayuda"
      >
        {open ? '✕' : '💬'}
      </button>
    </div>
  );
}

