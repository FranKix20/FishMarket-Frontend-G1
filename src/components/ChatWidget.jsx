import { useState } from 'react';
import { chatApi, uuid } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function ChatWidget() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [sessionId] = useState(() => uuid());
  const [messages, setMessages] = useState([
    { from: 'bot', text: '¡Hola! Soy el asistente de FishMarket Cloud. Pregúntame por envíos, pagos o tu pedido.' }
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    setMessages((m) => [...m, { from: 'user', text }]);
    setInput('');
    setSending(true);

    try {
      const { data } = await chatApi.send(sessionId, text, user?.business_user_id);
      setMessages((m) => [...m, { from: 'bot', text: data.response }]);
    } catch {
      setMessages((m) => [
        ...m,
        { from: 'bot', text: 'No pude conectarme con el asistente en este momento. Intenta de nuevo en un momento.' }
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="chat-widget">
      {open && (
        <div className="chat-widget__panel card">
          <div className="chat-widget__header">
            <span>Asistente FishMarket</span>
            <button aria-label="Cerrar chat" onClick={() => setOpen(false)}>
              ✕
            </button>
          </div>
          <div className="chat-widget__messages">
            {messages.map((m, idx) => (
              <div key={idx} className={`chat-bubble chat-bubble--${m.from}`}>
                {m.text}
              </div>
            ))}
            {sending && <div className="chat-bubble chat-bubble--bot">Escribiendo…</div>}
          </div>
          <form className="chat-widget__input" onSubmit={handleSend}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe tu pregunta…"
              aria-label="Mensaje para el asistente"
            />
            <button type="submit" className="btn btn-primary btn-sm" disabled={sending}>
              Enviar
            </button>
          </form>
        </div>
      )}
      <button className="chat-widget__toggle" onClick={() => setOpen((o) => !o)} aria-label="Abrir chat de ayuda">
        {open ? '✕' : '💬'}
      </button>
    </div>
  );
}
