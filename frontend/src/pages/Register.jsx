import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { softSpring } from '../lib/motion';
import FileDrop from '../components/FileDrop';
import SelfieCapture from '../components/SelfieCapture';

/* ── Inline icons ── */
const IcUser  = (p) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
const IcMail  = (p) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>;
const IcLock  = (p) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>;
const IcPhone = (p) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>;
const IcSearch= (p) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>;
const IcCar   = (p) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}><path strokeLinecap="round" strokeLinejoin="round" d="M8 17l-2-2H4a2 2 0 01-2-2V7a2 2 0 012-2h16a2 2 0 012 2v6a2 2 0 01-2 2h-2l-2 2M7.5 9h9" /></svg>;
const IcEye   = (p) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>;
const IcEyeOff= (p) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.477 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59M21 21l-3.59-3.59" /></svg>;
const IcId    = (p) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}><path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3m-3 3h3m-6 4h6a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2v7a2 2 0 002 2h2m1-4a2 2 0 11-4 0 2 2 0 014 0zm-2 2a4 4 0 00-3.464 2" /></svg>;
const IcPassport = (p) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}><path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5z" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 11a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM9 16h6" /></svg>;
const IcBuilding = (p) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m14 0h2M5 21H3m6-14h1m-1 4h1m4-4h1m-1 4h1m-5 6h4" /></svg>;

const STRENGTH = [
  { w: '0%',   color: 'bg-gray-200', label: '' },
  { w: '25%',  color: 'bg-red-500',  label: 'Faible' },
  { w: '50%',  color: 'bg-honey-500', label: 'Moyen' },
  { w: '75%',  color: 'bg-honey-500', label: 'Bon' },
  { w: '100%', color: 'bg-pine-500', label: 'Fort' },
];

function RadioCards({ value, onChange, options, cols = 2 }) {
  return (
    <div className={`grid gap-3 ${cols === 3 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-2'}`}>
      {options.map((o) => {
        const active = value === o.val;
        return (
          <motion.button key={o.val} type="button" whileTap={{ scale: 0.97 }} onClick={() => onChange(o.val)}
            className={`rounded-xl border-2 p-3.5 text-center transition-colors ${active
              ? 'border-primary-500 bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-300'
              : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-primary-300'}`}>
            {o.Icon && <o.Icon className={`w-6 h-6 mx-auto mb-1.5 ${active ? 'text-primary-600 dark:text-primary-300' : 'text-gray-400'}`} />}
            <div className="font-semibold text-sm">{o.label}</div>
          </motion.button>
        );
      })}
    </div>
  );
}

const Field = ({ label, Icon, children }) => (
  <div>
    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{label}</label>
    <div className="relative">
      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"><Icon className="w-5 h-5" /></span>
      {children}
    </div>
  </div>
);

export default function Register() {
  const { t } = useTranslation();
  const { register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultRole = searchParams.get('role') === 'owner' ? 'owner' : 'renter';

  const [form, setForm] = useState({
    email: '', password: '', name: '', phone: '', role: defaultRole,
    document_number: '', driving_license_issued_date: '', driving_license_expiry_date: '',
    agency_legal_name: '', agency_commercial_reg_number: '',
  });
  const [lessorType, setLessorType] = useState('individual');
  const [documentType, setDocumentType] = useState('id_card');
  const [secondaryDocType, setSecondaryDocType] = useState('id_card');
  const [files, setFiles] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isRenter = form.role === 'renter';
  const isAgency = form.role === 'owner' && lessorType === 'agency';

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setFile = (k, file) => setFiles((f) => ({ ...f, [k]: file }));

  const strength = (() => {
    const p = form.password;
    if (!p) return 0;
    let s = 0;
    if (p.length >= 8) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  })();

  const handle = async (e) => {
    e.preventDefault();
    setError('');

    // Renter: driving-license validity period (issue → expiry)
    if (isRenter) {
      const from = form.driving_license_issued_date;
      const to = form.driving_license_expiry_date;
      const todayStr = new Date().toISOString().split('T')[0];
      if (!from || !to) { setError("Veuillez indiquer les dates de début et d'expiration de votre permis de conduire."); return; }
      if (to <= from) { setError("La date d'expiration du permis doit être postérieure à la date d'obtention."); return; }
      if (to < todayStr) { setError('Votre permis de conduire est expiré. Une licence valide est requise.'); return; }
    }

    // Light required-document validation
    const need = isRenter
      ? ['driving_license_front', 'secondary_front_image', 'selfie_image']
      : ['front_image', 'selfie_image'];
    const missing = need.filter((k) => !files[k]);
    if (missing.length) { setError('Veuillez téléverser les documents requis et prendre un selfie.'); return; }

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('name', form.name);
      fd.append('email', form.email);
      fd.append('password', form.password);
      fd.append('phone', form.phone || '');
      fd.append('role', form.role);
      fd.append('document_number', form.document_number || '');

      if (isRenter) {
        fd.append('driving_license_issued_date', form.driving_license_issued_date || '');
        fd.append('driving_license_expiry_date', form.driving_license_expiry_date || '');
        fd.append('secondary_document_type', secondaryDocType);
      } else {
        fd.append('lessor_type', lessorType);
        fd.append('document_type', documentType);
        if (isAgency) {
          fd.append('agency_legal_name', form.agency_legal_name || '');
          fd.append('agency_commercial_reg_number', form.agency_commercial_reg_number || '');
        }
      }
      Object.entries(files).forEach(([k, file]) => { if (file) fd.append(k, file); });

      await register(fd);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || t('common.error'));
    } finally { setLoading(false); }
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <motion.div className="w-full max-w-md" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ ...softSpring }}>
        <div className="card p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex w-16 h-16 rounded-2xl bg-primary-50 dark:bg-primary-500/15 text-primary-600 dark:text-primary-300 items-center justify-center mb-4 shadow-clay">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}><path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
            </div>
            <span className="font-display font-semibold text-xl text-gray-900 dark:text-white block mb-2">Kri<span className="text-primary-500">Car</span></span>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">{t('auth.register_title')}</h1>
            <p className="text-gray-500 text-sm mt-1.5">Rejoignez notre communauté aujourd'hui.</p>
          </div>

          <form onSubmit={handle} className="space-y-5">
            {/* Full name */}
            <Field label={t('auth.name')} Icon={IcUser}>
              <input type="text" required placeholder="Votre nom complet" className="input pl-11"
                value={form.name} onChange={(e) => set('name', e.target.value)} />
            </Field>

            {/* Email */}
            <Field label={t('auth.email')} Icon={IcMail}>
              <input type="email" required placeholder="vous@exemple.com" dir="ltr" className="input pl-11"
                value={form.email} onChange={(e) => set('email', e.target.value)} />
            </Field>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('auth.password')}</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"><IcLock className="w-5 h-5" /></span>
                <input type={showPassword ? 'text' : 'password'} required placeholder="••••••••" minLength={8} dir="ltr" className="input pl-11 pr-11"
                  value={form.password} onChange={(e) => set('password', e.target.value)} />
                <button type="button" onClick={() => setShowPassword((s) => !s)} aria-label={showPassword ? 'Masquer' : 'Afficher'}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary-500 transition-colors">
                  {showPassword ? <IcEyeOff className="w-5 h-5" /> : <IcEye className="w-5 h-5" />}
                </button>
              </div>
              <AnimatePresence>
                {form.password && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-2 overflow-hidden">
                    <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <motion.div className={`h-full rounded-full ${STRENGTH[strength].color}`} animate={{ width: STRENGTH[strength].w }} transition={{ duration: 0.3 }} />
                    </div>
                    {STRENGTH[strength].label && <p className="text-xs text-gray-500 mt-1">Sécurité : <span className="font-medium">{STRENGTH[strength].label}</span></p>}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Account type */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Type de compte</label>
              <RadioCards value={form.role} onChange={(v) => set('role', v)} options={[
                { val: 'renter', label: 'Locataire', Icon: IcSearch },
                { val: 'owner', label: 'Propriétaire', Icon: IcCar },
              ]} />
            </div>

            {/* Lessor type (owner) */}
            <AnimatePresence initial={false}>
              {form.role === 'owner' && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700 space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Type de propriétaire</label>
                      <RadioCards value={lessorType} onChange={setLessorType} options={[
                        { val: 'individual', label: 'Particulier', Icon: IcUser },
                        { val: 'agency', label: 'Agence', Icon: IcBuilding },
                      ]} />
                    </div>
                    {isAgency && (
                      <div className="space-y-3 pt-1">
                        <FileDrop label="Registre de commerce" required accept="image/*,application/pdf" hint="PDF, JPG ou PNG"
                          onFile={(f) => setFile('agency_commercial_register', f)} />
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">N° de registre de commerce</label>
                          <input type="text" className="input" placeholder="Ex: 16/00-1234567 B 23"
                            value={form.agency_commercial_reg_number} onChange={(e) => set('agency_commercial_reg_number', e.target.value)} />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Nom légal de l'agence</label>
                          <input type="text" className="input" placeholder="Raison sociale"
                            value={form.agency_legal_name} onChange={(e) => set('agency_legal_name', e.target.value)} />
                          <p className="text-xs text-gray-500 mt-1">Utilisé dans les contrats électroniques au nom de l'agence.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Driving license validity (renter) — issue date → expiry date */}
            <AnimatePresence initial={false}>
              {isRenter && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Validité du permis de conduire <span className="text-red-500">*</span></label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Date d'obtention</label>
                      <input type="date" max={today} className="input text-sm"
                        value={form.driving_license_issued_date} onChange={(e) => set('driving_license_issued_date', e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Date d'expiration</label>
                      <input type="date" min={form.driving_license_issued_date || today} className="input text-sm"
                        value={form.driving_license_expiry_date} onChange={(e) => set('driving_license_expiry_date', e.target.value)} />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1.5">Indiquez les dates de début et de fin de validité figurant sur votre permis.</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Phone */}
            <Field label={t('auth.phone')} Icon={IcPhone}>
              <input type="tel" placeholder="+213 5XX XXX XXX" dir="ltr" className="input pl-11"
                value={form.phone} onChange={(e) => set('phone', e.target.value)} />
            </Field>

            {/* ── KYC ── */}
            <div className="border-t border-gray-100 dark:border-gray-800 pt-5">
              <h3 className="font-display text-lg font-semibold text-gray-900 dark:text-white mb-1">Vérification d'identité</h3>
              <p className="text-xs text-gray-500 mb-4">Vos documents sont vérifiés par notre équipe sous 24h.</p>

              {isRenter ? (
                <div className="space-y-5">
                  {/* Driving license */}
                  <div className="p-4 rounded-xl border-2 border-primary-200 dark:border-primary-500/30 bg-primary-50/40 dark:bg-primary-500/5 space-y-3">
                    <h4 className="font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2 text-sm"><IcCar className="w-5 h-5 text-primary-500" /> Permis de conduire</h4>
                    <FileDrop label="Photo recto" required onFile={(f) => setFile('driving_license_front', f)} />
                    <FileDrop label="Photo verso" required onFile={(f) => setFile('driving_license_back', f)} />
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">N° d'identité nationale <span className="text-red-500">*</span></label>
                      <input type="text" inputMode="numeric" maxLength={18} pattern="[0-9]{18}" placeholder="18 chiffres" dir="ltr" className="input"
                        value={form.document_number} onChange={(e) => set('document_number', e.target.value.replace(/\D/g, ''))} />
                      <p className="text-xs text-gray-500 mt-1">Doit contenir exactement 18 chiffres.</p>
                    </div>
                  </div>

                  {/* Secondary document */}
                  <div className="p-4 rounded-xl border-2 border-pine-200 dark:border-pine-500/30 bg-pine-50/40 dark:bg-pine-500/5 space-y-3">
                    <h4 className="font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2 text-sm"><IcId className="w-5 h-5 text-pine-600" /> Pièce d'identité complémentaire</h4>
                    <RadioCards value={secondaryDocType} onChange={setSecondaryDocType} options={[
                      { val: 'id_card', label: "Carte d'identité", Icon: IcId },
                      { val: 'passport', label: 'Passeport', Icon: IcPassport },
                    ]} />
                    <FileDrop label={secondaryDocType === 'passport' ? 'Page de données' : 'Photo recto'} required onFile={(f) => setFile('secondary_front_image', f)} />
                    {secondaryDocType === 'id_card' && <FileDrop label="Photo verso" required onFile={(f) => setFile('secondary_back_image', f)} />}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Type de document</label>
                  <RadioCards cols={3} value={documentType} onChange={setDocumentType} options={[
                    { val: 'id_card', label: "Carte d'identité", Icon: IcId },
                    { val: 'driving_license', label: 'Permis', Icon: IcCar },
                    { val: 'passport', label: 'Passeport', Icon: IcPassport },
                  ]} />
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">N° du document <span className="text-red-500">*</span></label>
                    <input type="text" inputMode="numeric" maxLength={18} placeholder="18 chiffres" dir="ltr" className="input"
                      value={form.document_number} onChange={(e) => set('document_number', e.target.value.replace(/\D/g, ''))} />
                  </div>
                  <FileDrop label={documentType === 'passport' ? 'Page de données' : 'Photo recto'} required onFile={(f) => setFile('front_image', f)} />
                  {documentType !== 'passport' && <FileDrop label="Photo verso" required onFile={(f) => setFile('back_image', f)} />}
                </div>
              )}

              {/* Selfie */}
              <div className="mt-5">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Selfie <span className="text-red-500">*</span></label>
                <SelfieCapture onCapture={(f) => setFile('selfie_image', f)} />
              </div>
            </div>

            {error && <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>}

            <button type="submit" disabled={loading} className="btn-primary w-full py-3.5 text-base">
              {loading ? t('common.loading') : t('auth.register_title')}
              {!loading && <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>}
            </button>
          </form>

          <div className="text-center mt-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl text-sm">
            <span className="text-gray-600 dark:text-gray-400">{t('auth.have_account')} </span>
            <Link to="/login" className="text-primary-600 font-semibold hover:underline">{t('nav.login')}</Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
