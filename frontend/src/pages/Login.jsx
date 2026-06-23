import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handle = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await login(form.email, form.password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || t('common.error'));
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2.5">
            <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center shadow-clay">
              <span className="text-white font-bold">K</span>
            </div>
            <span className="font-display font-semibold text-2xl text-gray-900">Kri<span className="text-primary-500">Car</span></span>
          </Link>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-gray-900 mt-6">{t('auth.login_title')}</h1>
          <p className="text-gray-500 text-sm mt-1.5">Bienvenue ! Connectez-vous à votre compte.</p>
        </div>

        <div className="card p-6 shadow-sm">
          <form onSubmit={handle} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('auth.email_or_phone')}</label>
              <input type="text" className="input" required placeholder="vous@exemple.com / 05XX XXX XXX" dir="ltr"
                value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('auth.password')}</label>
              <input type="password" className="input" required placeholder="••••••••"
                value={form.password} onChange={e => setForm(f => ({...f, password: e.target.value}))} />
            </div>

            {error && <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>}

            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? t('common.loading') : t('auth.login_btn')}
            </button>
          </form>

          <div className="mt-5 text-center text-sm text-gray-500">
            {t('auth.no_account')}{' '}
            <Link to="/register" className="text-primary-600 font-semibold hover:underline">{t('nav.register')}</Link>
          </div>
        </div>

        {/* Demo credentials */}
        <div className="mt-4 p-4 bg-honey-50 border border-honey-100 rounded-xl text-xs text-honey-700">
          <p className="font-semibold mb-1 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Comptes de démonstration :
          </p>
          <p>Admin : 0553636834 / 0553636834</p>
          <p>Owner : cherfaoui.oussama@kricar.dz / password123</p>
          <p>Renter : karim@kricar.dz / password123</p>
        </div>
      </div>
    </div>
  );
}
