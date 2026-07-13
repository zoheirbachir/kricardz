import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import LogoMark from '../components/LogoMark';

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
            <LogoMark className="w-10 h-10 shadow-clay" />
            <span className="font-display font-semibold text-2xl text-gray-900">Dz<span className="text-primary-500">Kricar</span></span>
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
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-gray-700">{t('auth.password')}</label>
                <Link to="/forgot-password" className="text-xs text-primary-600 font-medium hover:underline">{t('auth.forgot_password')}</Link>
              </div>
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
      </div>
    </div>
  );
}
