import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import api from '../api';
import { useToast } from '../context/ToastContext';
import { StaggerGroup, fadeUp } from '../lib/motion';

const TABS = [
  { key: 'pending', label: 'En attente' },
  { key: 'approved', label: 'Approuvés' },
  { key: 'rejected', label: 'Rejetés' },
  { key: 'all', label: 'Tous' },
];

const STATUS = {
  pending: { label: 'En attente', cls: 'badge-honey' },
  approved: { label: 'Approuvé', cls: 'badge-pine' },
  rejected: { label: 'Rejeté', cls: 'badge bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300' },
  none: { label: 'Aucun', cls: 'badge bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' },
};

/* Document fields in display order */
const DOC_ORDER = [
  ['driving_license_front', 'Permis de conduire — recto'],
  ['driving_license_back', 'Permis de conduire — verso'],
  ['front_image', "Pièce d'identité — recto"],
  ['back_image', "Pièce d'identité — verso"],
  ['secondary_front_image', 'Pièce complémentaire — recto'],
  ['secondary_back_image', 'Pièce complémentaire — verso'],
  ['agency_commercial_register', 'Registre de commerce'],
  ['selfie_image', 'Selfie'],
];

const fmtDate = (d) => d ? new Date(d.includes('T') ? d : d.replace(' ', 'T') + 'Z').toLocaleString('fr-DZ', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

function StatusBadge({ status }) {
  const s = STATUS[status] || STATUS.none;
  return <span className={s.cls}>{s.label}</span>;
}

export default function AdminKyc() {
  const toast = useToast();
  const [tab, setTab] = useState('pending');
  const [list, setList] = useState([]);
  const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [listLoading, setListLoading] = useState(true);

  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [acting, setActing] = useState(false);

  const loadList = useCallback((status) => {
    setListLoading(true);
    api.get(`/admin/kyc?status=${status}`)
      .then(r => { setList(r.data.submissions); setCounts(r.data.counts); })
      .catch(() => toast({ type: 'error', message: 'Échec du chargement des demandes.' }))
      .finally(() => setListLoading(false));
  }, [toast]);

  useEffect(() => { loadList(tab); }, [tab, loadList]);

  const openDetail = (id) => {
    setSelectedId(id);
    setRejecting(false);
    setReason('');
    setDetailLoading(true);
    api.get(`/admin/kyc/${id}`)
      .then(r => setDetail(r.data))
      .catch(() => toast({ type: 'error', message: 'Échec du chargement du dossier.' }))
      .finally(() => setDetailLoading(false));
  };

  const act = async (kind) => {
    if (!detail) return;
    if (kind === 'reject' && !reason.trim()) {
      toast({ type: 'error', message: 'Veuillez indiquer un motif de refus.' });
      return;
    }
    setActing(true);
    try {
      await api.post(`/admin/kyc/${detail.id}/${kind}`, kind === 'reject' ? { reason } : {});
      toast({ type: 'success', message: kind === 'approve' ? 'Dossier approuvé.' : 'Dossier refusé.' });
      setRejecting(false);
      setReason('');
      // refresh detail + list
      const r = await api.get(`/admin/kyc/${detail.id}`);
      setDetail(r.data);
      loadList(tab);
    } catch {
      toast({ type: 'error', message: "Échec de l'opération." });
    } finally {
      setActing(false);
    }
  };

  const docs = detail?.kyc_docs || {};
  const presentDocs = DOC_ORDER.filter(([k]) => docs[k]);

  const infoRows = detail ? [
    ['Téléphone', detail.phone],
    ['Rôle', detail.role === 'owner' ? 'Propriétaire' : 'Locataire'],
    ['Type de propriétaire', detail.lessor_type === 'agency' ? 'Agence' : detail.lessor_type === 'individual' ? 'Particulier' : null],
    ['Type de document', detail.document_type],
    ['N° de document', detail.document_number],
    ['Permis délivré le', detail.driving_license_issued_date],
    ["Permis valable jusqu'au", detail.driving_license_expiry_date],
    ["Raison sociale (agence)", detail.agency_legal_name],
    ['N° registre de commerce', detail.agency_commercial_reg_number],
    ['Inscrit le', fmtDate(detail.created_at)],
    ['Examiné le', detail.kyc_reviewed_at ? fmtDate(detail.kyc_reviewed_at) : null],
  ].filter(([, v]) => v) : [];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">Vérification d'identité</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Examinez et validez les pièces justificatives soumises par les utilisateurs.</p>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {TABS.map(t => {
          const n = t.key === 'all' ? (counts.pending + counts.approved + counts.rejected) : counts[t.key];
          const active = tab === t.key;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`text-sm font-medium px-3.5 py-2 rounded-xl border transition-all ${active
                ? 'bg-primary-500 text-white border-primary-500 shadow-clay'
                : 'bg-[var(--surface)] text-gray-600 dark:text-gray-300 border-[var(--border-strong)] hover:border-primary-400'}`}>
              {t.label}
              <span className={`ml-1.5 text-xs ${active ? 'text-white/80' : 'text-gray-400'}`}>{n}</span>
            </button>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-[340px_1fr] gap-6 items-start">
        {/* List */}
        <div className="space-y-2">
          {listLoading ? (
            [...Array(4)].map((_, i) => <div key={i} className="card h-20 skeleton" />)
          ) : list.length === 0 ? (
            <div className="card p-6 text-center text-sm text-gray-500 dark:text-gray-400">Aucune demande dans cette catégorie.</div>
          ) : (
            <StaggerGroup className="space-y-2">
              {list.map(s => (
                <motion.button key={s.id} variants={fadeUp} onClick={() => openDetail(s.id)}
                  className={`w-full text-left card p-3.5 flex items-center gap-3 transition-all ${selectedId === s.id ? 'ring-2 ring-primary-400 border-primary-300' : 'hover:border-primary-200'}`}>
                  <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-500/15 flex items-center justify-center text-primary-600 dark:text-primary-300 font-semibold shrink-0">
                    {s.name?.[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{s.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{s.email}</p>
                  </div>
                  <StatusBadge status={s.kyc_status} />
                </motion.button>
              ))}
            </StaggerGroup>
          )}
        </div>

        {/* Detail */}
        <div className="card p-5 min-h-[300px]">
          {!selectedId ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-16 text-gray-400 dark:text-gray-500">
              <svg className="w-12 h-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.4}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              <p className="text-sm">Sélectionnez une demande pour l'examiner.</p>
            </div>
          ) : detailLoading || !detail ? (
            <div className="space-y-4">
              <div className="h-6 w-1/3 skeleton" />
              <div className="h-24 skeleton" />
              <div className="grid grid-cols-2 gap-3">{[...Array(4)].map((_, i) => <div key={i} className="h-28 skeleton" />)}</div>
            </div>
          ) : (
            <div>
              {/* Header */}
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h2 className="font-display text-xl font-semibold text-gray-900 dark:text-white">{detail.name}</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{detail.email}</p>
                </div>
                <StatusBadge status={detail.kyc_status} />
              </div>

              {detail.kyc_status === 'rejected' && detail.kyc_rejection_reason && (
                <div className="mt-3 text-sm rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-300 px-3 py-2">
                  <span className="font-semibold">Motif du refus :</span> {detail.kyc_rejection_reason}
                </div>
              )}

              {/* Info grid */}
              <dl className="mt-4 grid sm:grid-cols-2 gap-x-6 gap-y-2.5">
                {infoRows.map(([k, v]) => (
                  <div key={k} className="flex justify-between sm:block gap-2 text-sm">
                    <dt className="text-gray-400 dark:text-gray-500 sm:text-xs sm:uppercase sm:tracking-wide">{k}</dt>
                    <dd className="font-medium text-gray-900 dark:text-gray-100 text-right sm:text-left break-words">{v}</dd>
                  </div>
                ))}
              </dl>

              {/* Documents */}
              <h3 className="mt-6 mb-3 font-semibold text-gray-900 dark:text-white text-sm">Pièces justificatives <span className="text-gray-400 font-normal">({presentDocs.length})</span></h3>
              {presentDocs.length === 0 ? (
                <p className="text-sm text-gray-400">Aucun document fourni.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {presentDocs.map(([k, label]) => (
                    <a key={k} href={docs[k]} target="_blank" rel="noreferrer"
                      className="group block rounded-xl overflow-hidden border border-[var(--border)] hover:border-primary-300 transition-colors">
                      <div className="aspect-[4/3] bg-gray-100 dark:bg-gray-800 overflow-hidden">
                        <img src={docs[k]} alt={label} loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      </div>
                      <p className="text-[11px] font-medium text-gray-600 dark:text-gray-300 px-2 py-1.5 truncate">{label}</p>
                    </a>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="mt-6 pt-5 border-t border-[var(--border)]">
                {rejecting ? (
                  <div className="space-y-3">
                    <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2}
                      placeholder="Motif du refus (communiqué à l'utilisateur)…" className="input resize-none" autoFocus />
                    <div className="flex gap-2">
                      <button disabled={acting} onClick={() => act('reject')}
                        className="inline-flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white font-semibold py-2.5 px-5 rounded-xl transition-all active:scale-95 disabled:opacity-50">
                        Confirmer le refus
                      </button>
                      <button disabled={acting} onClick={() => { setRejecting(false); setReason(''); }} className="btn-secondary">Annuler</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <button disabled={acting || detail.kyc_status === 'approved'} onClick={() => act('approve')} className="btn-pine disabled:opacity-50 disabled:cursor-not-allowed">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      {detail.kyc_status === 'approved' ? 'Déjà approuvé' : 'Approuver'}
                    </button>
                    <button disabled={acting} onClick={() => setRejecting(true)}
                      className="inline-flex items-center gap-2 font-semibold py-2.5 px-5 rounded-xl border border-red-200 dark:border-red-500/40 text-red-600 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all active:scale-95 disabled:opacity-50">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      {detail.kyc_status === 'rejected' ? 'Mettre à jour le refus' : 'Refuser'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
