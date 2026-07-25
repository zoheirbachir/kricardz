import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import api, { API_ORIGIN } from '../api';
import { useAuth } from '../context/AuthContext';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || API_ORIGIN || window.location.origin;

const timeAgo = (iso) => {
  const s = Math.max(0, (Date.now() - new Date(iso.replace(' ', 'T') + 'Z').getTime()) / 1000);
  if (s < 60) return "à l'instant";
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
  return `il y a ${Math.floor(s / 86400)} j`;
};

/* Bell with unread count. Loads history over REST and receives new items live on
   the user's Socket.io room (the server joins user:<id> from the auth token). */
export default function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    api.get('/notifications')
      .then(r => { setItems(r.data.items || []); setUnread(r.data.unread || 0); })
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      auth: { token: localStorage.getItem('token') },
    });
    socket.on('notification', (n) => {
      setItems(prev => [{ ...n, read: false }, ...prev].slice(0, 50));
      setUnread(u => u + 1);
    });
    return () => socket.disconnect();
  }, [user]);

  /* Close on outside click */
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  if (!user) return null;

  const markAll = async () => {
    setItems(prev => prev.map(n => ({ ...n, read: true })));
    setUnread(0);
    try { await api.post('/notifications/read-all'); } catch { /* non-critical */ }
  };

  const openItem = async (n) => {
    setOpen(false);
    if (!n.read) {
      setItems(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
      setUnread(u => Math.max(0, u - 1));
      try { await api.post(`/notifications/${n.id}/read`); } catch { /* non-critical */ }
    }
    if (n.link) navigate(n.link);
  };

  return (
    <div className="relative" ref={boxRef}>
      <button type="button" onClick={() => setOpen(o => !o)} aria-label="Notifications"
        className="relative w-9 h-9 rounded-lg flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        /* On phones the bell sits mid-row, so anchoring the panel to its right edge
           pushed it off-screen. Pin it to the viewport below the navbar on mobile,
           and anchor to the bell only from sm up where there's room. */
        <div className="fixed left-2 right-2 top-[4.25rem] w-auto sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-80 card p-0 overflow-hidden shadow-lg z-50">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)]">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">Notifications</span>
            {unread > 0 && (
              <button onClick={markAll} className="text-xs text-primary-600 hover:underline">Tout marquer comme lu</button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-[var(--border)]">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-gray-400">Aucune notification.</p>
            ) : items.map(n => (
              <button key={n.id} onClick={() => openItem(n)}
                className={`w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${n.read ? '' : 'bg-primary-50/50 dark:bg-primary-500/10'}`}>
                <div className="flex items-start gap-2">
                  {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-1.5 shrink-0" />}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{n.title}</p>
                    {n.body && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>}
                    <p className="text-[11px] text-gray-400 mt-0.5">{timeAgo(n.created_at)}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
