import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import api from '../api';
import MapView from '../components/MapView';

// Use the same origin so the Vite proxy handles WS upgrades in dev,
// and the real server handles it in production.
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin;

export default function TrackCar() {
  const { id } = useParams();
  const [car, setCar] = useState(null);
  const [location, setLocation] = useState(null);
  const [history, setHistory] = useState([]);
  const [live, setLive] = useState(false);
  const [error, setError] = useState('');
  const socketRef = useRef(null);

  /* Load car info */
  useEffect(() => {
    api.get(`/cars/${id}`).then(r => setCar(r.data)).catch(() => setError('Véhicule introuvable'));
  }, [id]);

  /* Load last known location */
  useEffect(() => {
    api.get(`/location/cars/${id}`)
      .then(r => {
        setLocation(r.data);
        setHistory([{ lat: r.data.lat, lng: r.data.lng }]);
      })
      .catch(() => {});
  }, [id]);

  /* Connect to Socket.io for live updates */
  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('track:car', id);
      setLive(true);
    });

    socket.on('disconnect', () => setLive(false));

    socket.on('car:location', (data) => {
      setLocation(data);
      setHistory(h => [...h.slice(-49), { lat: data.lat, lng: data.lng }]);
    });

    return () => {
      socket.emit('untrack:car', id);
      socket.disconnect();
    };
  }, [id]);

  const timeSince = (dateStr) => {
    if (!dateStr) return '';
    const secs = Math.floor((Date.now() - new Date(dateStr)) / 1000);
    if (secs < 60) return `il y a ${secs}s`;
    if (secs < 3600) return `il y a ${Math.floor(secs / 60)}min`;
    return `il y a ${Math.floor(secs / 3600)}h`;
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link to={`/cars/${id}`} className="btn-ghost text-sm rtl:flex-row-reverse">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Retour
        </Link>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-gray-900">Suivi GPS en direct</h1>
        <span className={`badge ml-auto ${live ? 'bg-pine-50 text-pine-700' : 'bg-gray-100 text-gray-500'}`}>
          <span className={`w-2 h-2 rounded-full ${live ? 'bg-pine-500 animate-pulse' : 'bg-gray-400'}`} style={{display:'inline-block'}} />
          {live ? 'Connecté' : 'Hors ligne'}
        </span>
      </div>

      {error && (
        <div className="card p-6 text-center text-gray-500">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
          </div>
          <p>{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map — plain wrapper, NOT .card (overflow:hidden breaks Leaflet tiles) */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm">
            {location ? (
              <MapView
                center={[location.lat, location.lng]}
                zoom={15}
                height="480px"
                followFirst={true}
                markers={[{
                  lat: location.lat,
                  lng: location.lng,
                  live: true,
                  popup: car?.title || 'Véhicule',
                  label: location.speed > 0 ? `${Math.round(location.speed)} km/h` : 'Arrêté',
                }]}
              />
            ) : (
              <div className="h-96 flex flex-col items-center justify-center bg-gray-50">
                <div className="w-16 h-16 mb-4 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center">
                  <svg className="w-8 h-8 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}><path strokeLinecap="round" strokeLinejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" /></svg>
                </div>
                <p className="text-gray-500 font-medium">En attente du signal GPS...</p>
                <p className="text-sm text-gray-400 mt-1">Le véhicule n'a pas encore envoyé sa position</p>
              </div>
            )}
          </div>
        </div>

        {/* Info panel */}
        <div className="space-y-4">
          {/* Car info */}
          {car && (
            <div className="card p-5">
              <h2 className="font-semibold text-gray-900 mb-3">{car.title}</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Marque</span>
                  <span className="font-medium">{car.brand} {car.model}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Propriétaire</span>
                  <span className="font-medium">{car.owner_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Wilaya</span>
                  <span className="font-medium">{car.wilaya}</span>
                </div>
              </div>
            </div>
          )}

          {/* Live stats */}
          <div className="card p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Position actuelle</h2>
            {location ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <div className="font-display text-2xl font-semibold text-primary-600">{Math.round(location.speed || 0)}</div>
                    <div className="text-xs text-gray-500 mt-0.5">km/h</div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <div className="font-display text-2xl font-semibold text-gray-700">{Math.round(location.heading || 0)}°</div>
                    <div className="text-xs text-gray-500 mt-0.5">Cap</div>
                  </div>
                </div>
                <div className="text-xs text-gray-400 space-y-1">
                  <p>Lat: {Number(location.lat).toFixed(6)}</p>
                  <p>Lng: {Number(location.lng).toFixed(6)}</p>
                  <p>Mise à jour : {timeSince(location.updated_at)}</p>
                </div>

                <a
                  href={`https://www.google.com/maps?q=${location.lat},${location.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary w-full text-sm mt-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  Ouvrir dans Google Maps
                </a>
              </div>
            ) : (
              <div className="text-center py-4 text-gray-400 text-sm">
                <svg className="w-7 h-7 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}><path strokeLinecap="round" strokeLinejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" /></svg>
                En attente du signal...
              </div>
            )}
          </div>

          {/* Status */}
          <div className={`card p-4 border-2 ${live ? 'border-pine-200 bg-pine-50 dark:bg-pine-500/10 dark:border-pine-500/30' : 'border-gray-200'}`}>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${live ? 'bg-pine-500 animate-pulse' : 'bg-gray-300'}`} />
              <span className="text-sm font-medium text-gray-700">
                {live ? 'Suivi en temps réel actif' : 'Connexion au serveur...'}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1.5">
              {live
                ? 'La carte se met à jour automatiquement dès que le véhicule bouge.'
                : 'Reconnexion automatique en cours...'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
