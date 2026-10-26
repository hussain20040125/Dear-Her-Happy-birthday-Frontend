import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { user, login, register } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [mode, setMode] = useState('login');
  const [f, setF] = useState({ name: '', email: '', password: '' });
  const [err, setErr] = useState({});
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={loc.state?.from || '/'} replace />;

  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setErr({}); };

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === 'login') await login(f.email, f.password);
      else await register(f.name, f.email, f.password);
      nav(loc.state?.from || '/', { replace: true });
    } catch (e2) {
      setErr({ [e2.field || 'form']: e2.message });
    } finally { setBusy(false); }
  }

  const isNew = mode === 'register';
  return (
    <main className="auth-wrap">
      <form className="auth-card" onSubmit={submit} noValidate>
        <p className="brand">Dear Her</p>
        <h1>{isNew ? 'Create your account' : 'Welcome back'}</h1>
        <p className="auth-sub">{isNew ? 'Make her a birthday surprise she’ll remember.' : 'Log in to keep working on your surprise.'}</p>
        {isNew && (
          <div className={`field ${err.name ? 'invalid' : ''}`}>
            <label htmlFor="aName">Your name</label>
            <input className="input" id="aName" autoComplete="name" value={f.name} onChange={set('name')} />
            <span className="err">{err.name}</span>
          </div>
        )}
        <div className={`field ${err.email ? 'invalid' : ''}`}>
          <label htmlFor="aEmail">Email</label>
          <input className="input" id="aEmail" type="email" autoComplete="email" value={f.email} onChange={set('email')} />
          <span className="err">{err.email}</span>
        </div>
        <div className={`field ${err.password ? 'invalid' : ''}`}>
          <label htmlFor="aPass">Password</label>
          <input className="input" id="aPass" type="password" autoComplete={isNew ? 'new-password' : 'current-password'} value={f.password} onChange={set('password')} />
          {isNew && !err.password && <small>At least 8 characters.</small>}
          <span className="err">{err.password}</span>
        </div>
        {err.form && <p className="form-err" role="alert">{err.form}</p>}
        <button className="btn primary wide" type="submit" disabled={busy}>
          {busy ? 'One moment…' : isNew ? 'Create account' : 'Log in'}
        </button>
        <p className="auth-switch">
          {isNew ? 'Already have an account?' : 'New here?'}{' '}
          <button type="button" onClick={() => { setMode(isNew ? 'login' : 'register'); setErr({}); }}>
            {isNew ? 'Log in' : 'Create an account'}
          </button>
        </p>
      </form>
    </main>
  );
}
