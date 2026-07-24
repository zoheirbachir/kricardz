import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api, { API_ORIGIN } from '../api';
import EStamp from '../components/EStamp';
import LogoMark from '../components/LogoMark';
import SignaturePad from '../components/SignaturePad';
import AuthDoc from '../components/AuthDoc';
import QRCode from '../components/QRCode';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const fmtSignedAt = (iso) => iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

/* Client documents embedded in the rental contract. */
const CLIENT_DOC_LABELS = {
  front_image: 'Pièce d\'identité (recto)',
  back_image: 'Pièce d\'identité (verso)',
  driving_license_front: 'Permis (recto)',
  driving_license_back: 'Permis (verso)',
  secondary_front_image: 'Document 2 (recto)',
  secondary_back_image: 'Document 2 (verso)',
};

/* On the web API_ORIGIN is empty → use the current site. On mobile (Capacitor) it's
   the hosted backend URL, so QR codes point at the real site, not capacitor://. */
const VERIFY_BASE = API_ORIGIN || (typeof window !== 'undefined' ? window.location.origin : '');

const Row = ({ label, value }) => (
  <div className="flex justify-between gap-3 py-1 border-b border-dashed border-gray-200 text-sm">
    <span className="text-gray-500">{label}</span>
    <span className="font-medium text-gray-900 text-right">{value || '—'}</span>
  </div>
);

/* A handover video reference. The link is screen-only, but the QR code prints —
   so a paper contract still leads to the footage (insurer, expert, court). */
const HandoverVideo = ({ path, label }) => {
  if (!path) return null;
  const url = `${VERIFY_BASE}${path}`;
  return (
    <div className="flex items-center gap-2.5 mt-2">
      <QRCode value={url} size={56} className="shrink-0 border border-gray-200 rounded" />
      <div className="min-w-0">
        <a href={url} target="_blank" rel="noopener noreferrer"
          className="text-primary-600 text-xs font-medium print:hidden">🎬 {label}</a>
        <p className="hidden print:block text-[10px] font-medium text-gray-700">{label}</p>
        <p className="text-[9px] text-gray-500 leading-tight mt-0.5">Scannez pour visionner la vidéo</p>
      </div>
    </div>
  );
};

const Section = ({ title, children }) => (
  <div className="mb-5">
    <h3 className="font-semibold text-gray-800 text-sm uppercase tracking-wide mb-2 border-l-4 border-primary-500 pl-2">{title}</h3>
    <div className="space-y-0.5">{children}</div>
  </div>
);

export default function ContractView() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const [c, setC] = useState(null);
  const [error, setError] = useState('');
  const [padOpen, setPadOpen] = useState(false);
  const [signing, setSigning] = useState(false);

  useEffect(() => {
    api.get(`/contracts/${id}`)
      .then(r => setC(r.data))
      .catch(e => setError(e.response?.data?.error || 'Contrat introuvable'));
  }, [id]);

  /* Which signature slot (if any) the logged-in user may fill on this contract. */
  const mySlot = (() => {
    if (!c || !user) return null;
    if (c.type === 'partnership') {
      if (c.agency_owner_id === user.id) return 'agency';
      if (user.is_admin) return 'kricar';
    } else if (c.type === 'rental') {
      if (c.agency_owner_id === user.id) return 'agency';
      if (c.renter_id === user.id) return 'client';
    }
    return null;
  })();

  const submitSignature = async (dataUrl) => {
    setSigning(true);
    try {
      const r = await api.post(`/contracts/${id}/sign`, { signature: dataUrl });
      setC(r.data);
      setPadOpen(false);
      toast({ type: 'success', message: 'Signature enregistrée.' });
    } catch (e) {
      toast({ type: 'error', message: e.response?.data?.error || 'Échec de la signature.' });
    } finally { setSigning(false); }
  };

  if (error) return (
    <div className="max-w-3xl mx-auto px-4 py-20 text-center">
      <p className="text-gray-500">{error}</p>
      <Link to="/dashboard" className="btn-primary mt-4 inline-flex">Retour</Link>
    </div>
  );
  if (!c) return <div className="max-w-3xl mx-auto px-4 py-20 text-center text-gray-400">Chargement…</div>;

  const d = c.data;
  const isRental = c.type === 'rental';
  const verifyUrl = `${VERIFY_BASE}/verify/${c.qr_token}`;
  const issued = new Date(d.issued_at).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Toolbar — hidden when printing */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <Link to="/dashboard" className="btn-ghost text-sm">← Retour</Link>
        <button onClick={() => window.print()} className="btn-primary text-sm">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
          Imprimer / PDF
        </button>
      </div>

      {/* Document */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 print:shadow-none print:border-0">
        {/* Header */}
        <div className="flex items-start justify-between border-b-2 border-gray-900 pb-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <LogoMark className="w-9 h-9" rounded="rounded-lg" />
              <span className="font-display font-semibold text-xl">Dz<span className="text-primary-500">Kricar</span></span>
            </div>
            <p className="text-xs text-gray-500 mt-1">{isRental ? 'Contrat de location de véhicule' : 'Contrat de partenariat'}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">N° de contrat</p>
            <p className="font-mono font-semibold text-gray-900">{c.contract_number}</p>
            <p className="text-xs text-gray-500 mt-1">{issued}</p>
          </div>
        </div>

        {/* Parties */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-2">
          <Section title="Plateforme">
            <Row label="Nom" value={d.kricar?.name} />
            <Row label="Téléphone" value={d.kricar?.phone} />
            <Row label="Email" value={d.kricar?.email} />
          </Section>
          <Section title={isRental ? "Agence / Loueur" : "Agence partenaire"}>
            <Row label="Nom" value={d.agency?.name} />
            <Row label="Gérant" value={d.agency?.manager_name} />
            <Row label="Registre" value={d.agency?.commercial_reg_number} />
            <Row label="Adresse" value={d.agency?.address} />
            <Row label="Téléphone" value={d.agency?.phone} />
          </Section>
        </div>

        {isRental ? (
          <>
            <Section title="Client / Locataire">
              <Row label="Nom complet" value={d.client?.name} />
              <Row label="Téléphone" value={d.client?.phone} />
              <Row label="N° d'identité" value={d.client?.id_number} />
              <Row label="N° permis de conduire" value={d.client?.driving_license_number} />
              <Row label="Permis délivré le" value={d.client?.driving_license_issued_date} />
              <Row label="Permis expire le" value={d.client?.driving_license_expiry_date} />
            </Section>

            {/* Client identity documents embedded in the contract */}
            {c.client_docs && Object.keys(CLIENT_DOC_LABELS).some(k => c.client_docs[k]) && (
              <div className="mb-5">
                <h3 className="font-semibold text-gray-800 text-sm uppercase tracking-wide mb-2 border-l-4 border-primary-500 pl-2">Documents du client</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {Object.entries(CLIENT_DOC_LABELS)
                    .filter(([k]) => c.client_docs[k])
                    .map(([k, label]) => <AuthDoc key={k} path={c.client_docs[k]} label={label} />)}
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Section title="Véhicule">
                <Row label="Marque / Modèle" value={`${d.vehicle?.brand} ${d.vehicle?.model}`} />
                <Row label="Année" value={d.vehicle?.year} />
                <Row label="Immatriculation" value={d.vehicle?.registration_number} />
                <Row label="Wilaya" value={d.vehicle?.wilaya} />
              </Section>
              <Section title="Location">
                <Row label="Du" value={d.rental?.start_date} />
                <Row label="Au" value={d.rental?.end_date} />
                <Row label="Durée" value={`${d.rental?.days} jour(s)`} />
                <Row label="Montant total" value={`${d.rental?.total_price?.toLocaleString()} ${d.rental?.currency}`} />
                {d.rental?.caution > 0 && (
                  <Row label="Caution" value={`${d.rental.caution.toLocaleString()} ${d.rental?.currency}`} />
                )}
              </Section>
            </div>

            {/* Mileage allowance + what an overrun costs */}
            {d.mileage && (
              <div className="mt-5">
                <Section title="Kilométrage et frais de dépassement">
                  <Row label="Inclus par jour" value={`${d.mileage.included_per_day.toLocaleString()} km`} />
                  <Row label={`Inclus pour ${d.rental?.days} jour(s)`} value={`${d.mileage.included_total.toLocaleString()} km`} />
                  <Row label="Prix du km supplémentaire"
                    value={d.mileage.extra_km_price > 0
                      ? `${d.mileage.extra_km_price.toLocaleString()} ${d.mileage.currency} / km`
                      : 'Aucun frais'} />
                  {d.mileage.extra_km_price > 0 && (
                    <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                      Montant dû = (kilométrage de retour − kilométrage de livraison − {d.mileage.included_total.toLocaleString()} km)
                      × {d.mileage.extra_km_price.toLocaleString()} {d.mileage.currency}. Réglé par le locataire au loueur à la restitution du véhicule.
                    </p>
                  )}
                </Section>
              </div>
            )}

            {/* The settled amount, once both odometer readings are recorded */}
            {c.mileage_settlement && (
              <div className={`mt-4 rounded-xl border p-4 ${c.mileage_settlement.extra_km > 0
                ? 'border-amber-300 bg-amber-50' : 'border-pine-200 bg-pine-50'}`}>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-2">
                  Décompte kilométrique au retour
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <div><div className="text-gray-500 text-xs">Parcouru</div><div className="font-semibold text-gray-900">{c.mileage_settlement.distance_km.toLocaleString()} km</div></div>
                  <div><div className="text-gray-500 text-xs">Inclus</div><div className="font-semibold text-gray-900">{c.mileage_settlement.included_total.toLocaleString()} km</div></div>
                  <div><div className="text-gray-500 text-xs">Dépassement</div><div className="font-semibold text-gray-900">{c.mileage_settlement.extra_km.toLocaleString()} km</div></div>
                  <div>
                    <div className="text-gray-500 text-xs">Montant dû par le locataire</div>
                    <div className="font-display font-semibold text-lg text-gray-900">
                      {c.mileage_settlement.amount_due.toLocaleString()} {c.mileage_settlement.currency}
                    </div>
                  </div>
                </div>
                {c.mileage_settlement.extra_km > 0 ? (
                  <p className="text-xs text-gray-600 mt-2">
                    {c.mileage_settlement.extra_km.toLocaleString()} km × {c.mileage_settlement.extra_km_price.toLocaleString()} {c.mileage_settlement.currency}
                    {' '}= {c.mileage_settlement.amount_due.toLocaleString()} {c.mileage_settlement.currency} à régler au loueur.
                  </p>
                ) : (
                  <p className="text-xs text-gray-600 mt-2">Kilométrage inclus respecté — aucun frais de dépassement.</p>
                )}
              </div>
            )}

            {/* Clauses agreed between the two parties */}
            {d.conditions?.length > 0 && (
              <div className="mt-5">
                <Section title="Conditions convenues entre le loueur et le locataire">
                  <ol className="space-y-2 mt-1">
                    {d.conditions.map((cond, i) => (
                      <li key={i} className="flex gap-2.5 text-sm text-gray-700 leading-relaxed">
                        <span className="text-gray-400 font-medium shrink-0">{i + 1}.</span>
                        <span>{cond}</span>
                      </li>
                    ))}
                  </ol>
                </Section>
              </div>
            )}
          </>
        ) : (
          <Section title="Conditions du partenariat">
            <Row label="Période gratuite" value={`${d.terms?.free_period_months} mois`} />
            <Row label="Du" value={d.terms?.free_start} />
            <Row label="Au" value={d.terms?.free_end} />
            <Row label="Avantage fondateur" value={`Réduction permanente de ${d.terms?.early_partner_discount}%`} />
            <ul className="mt-3 space-y-1.5">
              {d.terms?.benefits?.map((b, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <svg className="w-4 h-4 text-pine-600 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" /></svg>
                  {b}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* Signatures (griffes) — signed online (finger/mouse) by each party */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
          {(isRental
            ? [{ slot: 'agency', label: "Le loueur / L'agence", name: d.agency?.name }, { slot: 'client', label: 'Le client', name: d.client?.name }]
            : [{ slot: 'kricar', label: 'Pour DzKricar', name: d.kricar?.name }, { slot: 'agency', label: "Pour l'agence", name: d.agency?.name }]
          ).map(({ slot, label, name }) => {
            const sig = c.signatures?.[slot];
            return (
              <div key={slot}>
                <p className="text-xs font-semibold text-gray-700 mb-1">{label}</p>
                <p className="text-[11px] text-gray-500 mb-2">{name || ''}</p>
                {sig ? (
                  <div>
                    <img src={sig.image} alt="signature" className="h-16 object-contain" />
                    <div className="border-t border-gray-400 mt-1" />
                    <p className="text-[10px] text-pine-600 mt-1">✓ Signé le {fmtSignedAt(sig.signed_at)}{sig.name ? ` · ${sig.name}` : ''}</p>
                  </div>
                ) : mySlot === slot ? (
                  <div>
                    <div className="h-16 flex items-end">
                      <button type="button" onClick={() => setPadOpen(true)}
                        className="btn-primary text-xs py-1.5 px-3 print:hidden">✍️ Signer en ligne</button>
                    </div>
                    <div className="border-t border-gray-400 mt-1" />
                    <p className="text-[10px] text-gray-400 mt-1">Griffe et signature</p>
                  </div>
                ) : (
                  <div>
                    <div className="h-16" />
                    <div className="border-t border-gray-400" />
                    <p className="text-[10px] text-gray-400 mt-1">Griffe et signature</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Vehicle handover (check-in / check-out) — rental contracts */}
        {isRental && c.handover && (
          <div className="mt-6 border border-gray-200 rounded-xl p-4">
            <p className="text-[10px] uppercase tracking-wider text-primary-600 font-bold mb-3">Documentation de la remise du véhicule</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-semibold text-gray-700 mb-1">À la livraison</p>
                <Row label="Kilométrage" value={c.handover.checkin_km != null ? `${c.handover.checkin_km} km` : '—'} />
                <Row label="Date" value={c.handover.checkin_at ? new Date(c.handover.checkin_at).toLocaleString('fr-FR') : '—'} />
                {c.handover.checkin_gps && (
                  <Row label="Position GPS" value={
                    <a href={`https://maps.google.com/?q=${c.handover.checkin_gps}`} target="_blank" rel="noopener noreferrer" className="text-primary-600 underline">{c.handover.checkin_gps}</a>
                  } />
                )}
                <HandoverVideo path={c.handover.checkin_video} label="Vidéo de livraison" />
              </div>
              <div>
                <p className="font-semibold text-gray-700 mb-1">Au retour</p>
                <Row label="Kilométrage" value={c.handover.checkout_km != null ? `${c.handover.checkout_km} km` : '—'} />
                <Row label="Date" value={c.handover.checkout_at ? new Date(c.handover.checkout_at).toLocaleString('fr-FR') : '—'} />
                {c.handover.checkout_gps && (
                  <Row label="Position GPS" value={
                    <a href={`https://maps.google.com/?q=${c.handover.checkout_gps}`} target="_blank" rel="noopener noreferrer" className="text-primary-600 underline">{c.handover.checkout_gps}</a>
                  } />
                )}
                <HandoverVideo path={c.handover.checkout_video} label="Vidéo de retour" />
              </div>
            </div>
            {c.handover.distance_km != null && (
              <p className="text-sm mt-3 pt-3 border-t border-gray-100">Distance parcourue : <span className="font-semibold text-gray-900">{c.handover.distance_km} km</span></p>
            )}
          </div>
        )}

        {/* Terms acceptance — proves both parties read and accepted the T&C */}
        {c.terms_acceptance?.version && (
          <div className="mt-6 border border-gray-200 rounded-xl p-4">
            <p className="text-[10px] uppercase tracking-wider text-primary-600 font-bold mb-2">Acceptation des conditions générales</p>
            <p className="text-[11px] text-gray-600 leading-relaxed">
              Les parties reconnaissent avoir lu et accepté les conditions générales de DzKricar,
              <span className="font-semibold text-gray-900"> version {c.terms_acceptance.version}</span>, annexées au présent contrat.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2.5 text-[11px]">
              <Row label="Accepté par le loueur le"
                value={c.terms_acceptance.agency ? new Date(c.terms_acceptance.agency.created_at.replace(' ', 'T') + 'Z').toLocaleString('fr-FR') : '—'} />
              <Row label="Accepté par le client le"
                value={c.terms_acceptance.client ? new Date(c.terms_acceptance.client.created_at.replace(' ', 'T') + 'Z').toLocaleString('fr-FR') : '—'} />
            </div>
          </div>
        )}

        {/* Platform liability disclaimer */}
        {d.disclaimer && (
          <p className="text-[11px] text-gray-500 leading-relaxed mt-6 bg-gray-50 border border-gray-100 rounded-xl p-3">
            <span className="font-semibold text-gray-700">Clause de responsabilité — </span>{d.disclaimer}
          </p>
        )}

        {/* Legal note */}
        <p className="text-[11px] text-gray-400 leading-relaxed mt-4 mb-6 border-t border-gray-100 pt-3">
          Ce contrat électronique est généré automatiquement par la plateforme DzKricar et scellé par les cachets
          électroniques ci-dessous. Chaque cachet contient un code QR permettant de vérifier l'authenticité du
          contrat. Tout document ne portant pas ces cachets est considéré comme non valide.
        </p>

        {/* E-stamps */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <EStamp
            variant="kricar"
            title="Cachet DzKricar"
            qrValue={verifyUrl}
            lines={[
              { label: 'Société', value: d.kricar?.name },
              { label: 'Contrat', value: c.contract_number },
              { label: 'Tél', value: d.kricar?.phone },
            ]}
          />
          <EStamp
            variant="agency"
            title="Cachet Agence"
            qrValue={verifyUrl}
            lines={[
              { label: 'Agence', value: d.agency?.name },
              { label: 'Registre', value: d.agency?.commercial_reg_number },
              { label: 'Gérant', value: d.agency?.manager_name },
            ]}
          />
        </div>
      </div>

      {padOpen && (
        <SignaturePad onSave={submitSignature} onCancel={() => setPadOpen(false)} saving={signing} />
      )}
    </div>
  );
}
