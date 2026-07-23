import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../api';
import ServiceTypePicker from './ServiceTypePicker';

/* Lets an agency/owner edit the activities they offer, from the dashboard.
   The list drives the badges on their public profile and the activity filter. */
export default function ServiceTypesCard() {
  const { t } = useTranslation();
  const { user, refreshUser } = useAuth();
  const toast = useToast();
  const [value, setValue] = useState(user?.service_types || []);
  const [busy, setBusy] = useState(false);

  useEffect(() => { setValue(user?.service_types || []); }, [user?.service_types]);

  const dirty = JSON.stringify([...value].sort()) !== JSON.stringify([...(user?.service_types || [])].sort());

  const save = async () => {
    setBusy(true);
    try {
      await api.put('/auth/me', { service_types: value });
      await refreshUser();
      toast({ type: 'success', message: 'Activités mises à jour.' });
    } catch {
      toast({ type: 'error', message: "Échec de l'enregistrement." });
    } finally { setBusy(false); }
  };

  return (
    <div className="card p-5 mb-8">
      <h2 className="font-semibold text-gray-900 dark:text-white">{t('services.label')}</h2>
      <p className="text-sm text-gray-500 mt-0.5 mb-3">{t('services.hint')}</p>
      <ServiceTypePicker value={value} onChange={setValue} />
      {dirty && (
        <div className="mt-4">
          <button onClick={save} disabled={busy} className="btn-primary text-sm">
            {busy ? 'Enregistrement…' : 'Enregistrer les activités'}
          </button>
        </div>
      )}
    </div>
  );
}
