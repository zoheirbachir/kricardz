import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api, { API_ORIGIN } from '../api';
import EStamp from '../components/EStamp';

/* On the web API_ORIGIN is empty → use the current site. On mobile (Capacitor) it's
   the hosted backend URL, so QR codes point at the real site, not capacitor://. */
const VERIFY_BASE = API_ORIGIN || (typeof window !== 'undefined' ? window.location.origin : '');

const Row = ({ label, value }) => (
  <div className="flex justify-between gap-3 py-1 border-b border-dashed border-gray-200 text-sm">
    <span className="text-gray-500">{label}</span>
    <span className="font-medium text-gray-900 text-right">{value || '—'}</span>
  </div>
);

const Section = ({ title, children }) => (
  <div className="mb-5">
    <h3 className="font-semibold text-gray-800 text-sm uppercase tracking-wide mb-2 border-l-4 border-primary-500 pl-2">{title}</h3>
    <div className="space-y-0.5">{children}</div>
  </div>
);

export default function ContractView() {
  const { id } = useParams();
  const [c, setC] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/contracts/${id}`)
      .then(r => setC(r.data))
      .catch(e => setError(e.response?.data?.error || 'Contrat introuvable'));
  }, [id]);

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
              <div className="w-9 h-9 bg-primary-500 rounded-lg flex items-center justify-center"><span className="text-white font-bold">K</span></div>
              <span className="font-display font-semibold text-xl">Kri<span className="text-primary-500">Car</span></span>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Section title="Véhicule">
                <Row label="Marque / Modèle" value={`${d.vehicle?.brand} ${d.vehicle?.model}`} />
                <Row label="Année" value={d.vehicle?.year} />
                <Row label="Immatriculation" value={d.vehicle?.registration_number} />
                <Row label="Wilaya" value={d.vehicle?.wilaya} />
              </Section>
              <Section title="Conditions de location">
                <Row label="Du" value={d.rental?.start_date} />
                <Row label="Au" value={d.rental?.end_date} />
                <Row label="Durée" value={`${d.rental?.days} jour(s)`} />
                <Row label="Montant total" value={`${d.rental?.total_price?.toLocaleString()} ${d.rental?.currency}`} />
              </Section>
            </div>
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

        {/* Legal note */}
        <p className="text-[11px] text-gray-400 leading-relaxed mt-4 mb-6 border-t border-gray-100 pt-3">
          Ce contrat électronique est généré automatiquement par la plateforme KriCar et scellé par les cachets
          électroniques ci-dessous. Chaque cachet contient un code QR permettant de vérifier l'authenticité du
          contrat. Tout document ne portant pas ces cachets est considéré comme non valide.
        </p>

        {/* E-stamps */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <EStamp
            variant="kricar"
            title="Cachet KriCar"
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
    </div>
  );
}
