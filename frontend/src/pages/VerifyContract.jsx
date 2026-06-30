import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';

export default function VerifyContract() {
  const { token } = useParams();
  const [state, setState] = useState({ loading: true });

  useEffect(() => {
    api.get(`/contracts/verify/${token}`)
      .then(r => setState({ loading: false, data: r.data }))
      .catch(() => setState({ loading: false, data: { valid: false } }));
  }, [token]);

  const { loading, data } = state;
  const valid = data?.valid;

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md text-center">
        {loading ? (
          <p className="text-gray-400">Vérification en cours…</p>
        ) : valid ? (
          <div className="card p-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-pine-50 text-pine-600 flex items-center justify-center">
              <svg className="w-9 h-9" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <h1 className="font-display text-2xl font-semibold text-gray-900">Contrat authentique</h1>
            <p className="text-gray-500 text-sm mt-1">Ce contrat a bien été émis par KriCar.</p>
            <div className="mt-6 text-left space-y-2 bg-gray-50 rounded-xl p-4 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">N° de contrat</span><span className="font-mono font-semibold">{data.contract_number}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Type</span><span className="font-medium">{data.type === 'rental' ? 'Location' : 'Partenariat'}</span></div>
              {data.agency_name && <div className="flex justify-between"><span className="text-gray-500">Agence</span><span className="font-medium">{data.agency_name}</span></div>}
              {data.client_name && <div className="flex justify-between"><span className="text-gray-500">Client</span><span className="font-medium">{data.client_name}</span></div>}
              {data.vehicle && <div className="flex justify-between"><span className="text-gray-500">Véhicule</span><span className="font-medium">{data.vehicle}</span></div>}
              {data.issued_at && <div className="flex justify-between"><span className="text-gray-500">Émis le</span><span className="font-medium">{new Date(data.issued_at).toLocaleDateString('fr-FR')}</span></div>}
            </div>
          </div>
        ) : (
          <div className="card p-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center">
              <svg className="w-9 h-9" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </div>
            <h1 className="font-display text-2xl font-semibold text-gray-900">Contrat non valide</h1>
            <p className="text-gray-500 text-sm mt-1">Aucun contrat authentique ne correspond à ce code. Méfiez-vous des documents falsifiés.</p>
          </div>
        )}
        <Link to="/" className="inline-block mt-6 text-primary-600 text-sm font-medium hover:underline">Retour à l'accueil</Link>
      </div>
    </div>
  );
}
