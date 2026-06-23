import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { useToast } from '../context/ToastContext';

const TABS = [
  { key: 'overview', label: "Vue d'ensemble" },
  { key: 'agencies', label: 'Agences' },
  { key: 'cars', label: 'Véhicules' },
  { key: 'users', label: 'Utilisateurs' },
  { key: 'bookings', label: 'Réservations' },
];

const fmtDate = (d) => d ? new Date(d.includes('T') ? d : d.replace(' ', 'T') + 'Z').toLocaleDateString('fr-DZ', { dateStyle: 'medium' }) : '—';
const KYC = {
  pending: 'badge-honey', approved: 'badge-pine',
  rejected: 'badge bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300',
  none: 'badge bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
};

function Stat({ label, value, tint }) {
  return (
    <div className="card p-5">
      <div className={`text-3xl font-display font-semibold ${tint || 'text-gray-900 dark:text-white'}`}>{value ?? '—'}</div>
      <div className="text-sm text-gray-500 mt-1">{label}</div>
    </div>
  );
}

export default function Admin() {
  const toast = useToast();
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [agencies, setAgencies] = useState([]);
  const [cars, setCars] = useState([]);
  const [users, setUsers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');

  const loadStats = useCallback(() => api.get('/admin/stats').then(r => setStats(r.data)).catch(() => {}), []);

  const load = useCallback((which) => {
    if (which === 'overview') { setLoading(true); loadStats().finally(() => setLoading(false)); return; }
    const map = { agencies: setAgencies, cars: setCars, users: setUsers, bookings: setBookings };
    setLoading(true);
    api.get(`/admin/${which}`).then(r => map[which](r.data))
      .catch(() => toast({ type: 'error', message: 'Échec du chargement.' }))
      .finally(() => setLoading(false));
  }, [loadStats, toast]);

  useEffect(() => { setQ(''); load(tab); }, [tab, load]);
  useEffect(() => { loadStats(); }, [loadStats]);

  const run = async (msg, fn, okMsg) => {
    if (!window.confirm(msg)) return;
    try { await fn(); toast({ type: 'success', message: okMsg }); load(tab); loadStats(); }
    catch (e) { toast({ type: 'error', message: e.response?.data?.error || "Échec de l'opération." }); }
  };

  const filt = (rows, fields) => {
    if (!q.trim()) return rows;
    const s = q.toLowerCase();
    return rows.filter(r => fields.some(f => String(r[f] ?? '').toLowerCase().includes(s)));
  };
  const fAgencies = useMemo(() => filt(agencies, ['name', 'owner_name', 'wilaya', 'owner_email']), [agencies, q]);
  const fCars = useMemo(() => filt(cars, ['title', 'brand', 'owner_name', 'wilaya']), [cars, q]);
  const fUsers = useMemo(() => filt(users, ['name', 'email', 'phone']), [users, q]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <p className="eyebrow mb-1.5">Administration</p>
          <h1 className="section-title">Panneau d'administration</h1>
        </div>
        <Link to="/admin/kyc" className="btn-secondary text-sm">Vérification des documents (KYC)</Link>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl mb-6 w-fit">
        {TABS.map(tb => (
          <button key={tb.key} onClick={() => setTab(tb.key)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === tb.key ? 'bg-white dark:bg-gray-700 shadow text-primary-600 dark:text-primary-300' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-200'}`}>
            {tb.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <Stat label="Utilisateurs" value={stats?.users} />
          <Stat label="Propriétaires" value={stats?.owners} tint="text-primary-600 dark:text-primary-300" />
          <Stat label="Locataires" value={stats?.renters} />
          <Stat label="Agences" value={stats?.agencies} tint="text-honey-600 dark:text-honey-400" />
          <Stat label="Véhicules" value={stats?.cars} />
          <Stat label="Véhicules disponibles" value={stats?.available_cars} tint="text-pine-600 dark:text-pine-300" />
          <Stat label="Réservations" value={stats?.bookings} />
          <Stat label="Avis" value={stats?.reviews} />
          <Stat label="KYC en attente" value={stats?.kyc?.pending} tint="text-honey-600 dark:text-honey-400" />
          <Stat label="KYC approuvés" value={stats?.kyc?.approved} tint="text-pine-600 dark:text-pine-300" />
          <Stat label="KYC rejetés" value={stats?.kyc?.rejected} tint="text-red-600" />
          <Stat label="Comptes bloqués" value={stats?.banned} tint="text-red-600" />
        </div>
      )}

      {/* Search bar for list tabs */}
      {tab !== 'overview' && tab !== 'bookings' && (
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher…"
          className="input max-w-sm mb-4 text-sm" />
      )}

      {loading && <p className="text-sm text-gray-500">Chargement…</p>}

      {/* Agencies */}
      {tab === 'agencies' && !loading && (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-gray-500 border-b border-gray-100 dark:border-gray-800">
              <tr>{['Agence', 'Propriétaire', 'Wilaya', 'Véhicules', 'Statut', 'Actions'].map(h => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {fAgencies.map(a => (
                <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{a.name}</td>
                  <td className="px-4 py-3 text-gray-500">{a.owner_name}<div className="text-xs text-gray-400">{a.owner_email}</div></td>
                  <td className="px-4 py-3 text-gray-500">{a.wilaya}</td>
                  <td className="px-4 py-3">{a.vehicle_count}</td>
                  <td className="px-4 py-3">{a.verified ? <span className="badge-pine">Acceptée</span> : <span className="badge-honey">En attente</span>}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => run(a.verified ? `Retirer la validation de « ${a.name} » ?` : `Accepter l'agence « ${a.name} » ?`, () => api.post(`/admin/agencies/${a.id}/verify`), a.verified ? 'Validation retirée.' : 'Agence acceptée.')}
                        className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${a.verified ? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' : 'bg-pine-500 text-white hover:bg-pine-600'}`}>
                        {a.verified ? 'Retirer' : 'Accepter'}
                      </button>
                      <button onClick={() => run(`Supprimer l'agence « ${a.name} » ? Action irréversible.`, () => api.delete(`/admin/agencies/${a.id}`), 'Agence supprimée.')}
                        className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-500/15 dark:text-red-300">Supprimer</button>
                    </div>
                  </td>
                </tr>
              ))}
              {fAgencies.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Aucune agence.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Cars */}
      {tab === 'cars' && !loading && (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-gray-500 border-b border-gray-100 dark:border-gray-800">
              <tr>{['Véhicule', 'Propriétaire', 'Wilaya', 'Prix/j', 'Statut', 'Actions'].map(h => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {fCars.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{c.title} <span className="text-xs text-gray-400">({c.year})</span></td>
                  <td className="px-4 py-3 text-gray-500">{c.owner_name}</td>
                  <td className="px-4 py-3 text-gray-500">{c.wilaya}</td>
                  <td className="px-4 py-3">{c.price_per_day?.toLocaleString()} DA</td>
                  <td className="px-4 py-3">{c.available ? <span className="badge-pine">Disponible</span> : <span className="badge bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">Indisponible</span>}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link to={`/cars/${c.id}`} className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">Voir</Link>
                      <button onClick={() => run(`${c.available ? 'Rendre indisponible' : 'Rendre disponible'} « ${c.title} » ?`, () => api.post(`/admin/cars/${c.id}/availability`), 'Mis à jour.')}
                        className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-honey-100 text-honey-700 hover:bg-honey-200 dark:bg-honey-500/15 dark:text-honey-300">
                        {c.available ? 'Masquer' : 'Publier'}
                      </button>
                      <button onClick={() => run(`Supprimer « ${c.title} » ? Action irréversible.`, () => api.delete(`/admin/cars/${c.id}`), 'Véhicule supprimé.')}
                        className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-500/15 dark:text-red-300">Supprimer</button>
                    </div>
                  </td>
                </tr>
              ))}
              {fCars.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Aucun véhicule.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Users */}
      {tab === 'users' && !loading && (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-gray-500 border-b border-gray-100 dark:border-gray-800">
              <tr>{['Nom', 'Rôle', 'Véhicules', 'KYC', 'Statut', 'Actions'].map(h => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {fUsers.map(u => (
                <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900 dark:text-white">{u.name} {u.is_admin && <span className="badge bg-primary-100 text-primary-700 dark:bg-primary-500/15 dark:text-primary-300 ml-1">Admin</span>}</div>
                    <div className="text-xs text-gray-400">{u.email}{u.phone ? ` · ${u.phone}` : ''}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{u.role === 'owner' ? (u.lessor_type === 'agency' ? 'Agence' : 'Propriétaire') : u.role === 'admin' ? 'Admin' : 'Locataire'}</td>
                  <td className="px-4 py-3">{u.car_count}</td>
                  <td className="px-4 py-3"><span className={KYC[u.kyc_status] || KYC.none}>{u.kyc_status || 'aucun'}</span></td>
                  <td className="px-4 py-3">{u.banned ? <span className="badge bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300">Bloqué</span> : <span className="badge-pine">Actif</span>}</td>
                  <td className="px-4 py-3">
                    {u.is_admin ? <span className="text-xs text-gray-400">—</span> : (
                      <div className="flex gap-2">
                        <button onClick={() => run(u.banned ? `Débloquer ${u.name} ?` : `Bloquer ${u.name} ?`, () => api.post(`/admin/users/${u.id}/ban`), 'Mis à jour.')}
                          className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-honey-100 text-honey-700 hover:bg-honey-200 dark:bg-honey-500/15 dark:text-honey-300">
                          {u.banned ? 'Débloquer' : 'Bloquer'}
                        </button>
                        <button onClick={() => run(`Supprimer ${u.name} et toutes ses données (véhicules, réservations) ? Action irréversible.`, () => api.delete(`/admin/users/${u.id}`), 'Utilisateur supprimé.')}
                          className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-500/15 dark:text-red-300">Supprimer</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {fUsers.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Aucun utilisateur.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Bookings */}
      {tab === 'bookings' && !loading && (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-gray-500 border-b border-gray-100 dark:border-gray-800">
              <tr>{['Véhicule', 'Locataire', 'Dates', 'Total', 'Statut'].map(h => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {bookings.map(b => (
                <tr key={b.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{b.car_title}</td>
                  <td className="px-4 py-3 text-gray-500">{b.renter_name}</td>
                  <td className="px-4 py-3 text-gray-500">{fmtDate(b.start_date)} → {fmtDate(b.end_date)}</td>
                  <td className="px-4 py-3">{b.total_price?.toLocaleString()} DA</td>
                  <td className="px-4 py-3"><span className="badge bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">{b.status}</span></td>
                </tr>
              ))}
              {bookings.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Aucune réservation.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
