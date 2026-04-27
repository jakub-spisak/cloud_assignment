import { useMemo, useState } from 'react';

const initialRegister = { name: '', email: '', password: '' };
const initialLogin = { email: '', password: '' };

export default function AuthPanel({ onRegister, onLogin, loading }) {
  const [mode, setMode] = useState('login');
  const [loginForm, setLoginForm] = useState(initialLogin);
  const [registerForm, setRegisterForm] = useState(initialRegister);
  const [error, setError] = useState('');

  const isRegister = mode === 'register';
  const title = useMemo(
    () => (isRegister ? 'Vytvor si tvorivé štúdio' : 'Vráť sa do svojho archívu'),
    [isRegister]
  );

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    try {
      if (isRegister) {
        await onRegister(registerForm);
        setRegisterForm(initialRegister);
      } else {
        await onLogin(loginForm);
        setLoginForm(initialLogin);
      }
    } catch (submissionError) {
      setError(submissionError.message);
    }
  }

  return (
    <div className="auth-shell aurora-shell auth-page">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <div className="ambient ambient-three" />

      <section className="auth-layout">
        <div className="auth-story glass-panel">
          <div className="eyebrow">Visual note intelligence</div>
          <h1>Noteworthy Studio</h1>
          <p className="hero-lead">
            Prémiovo pôsobiaci priestor pre študentské poznámky, prednášky a nápady. Nahraj fotku,
            nechaj appku vytiahnuť text a z chaosu si sprav čistý digitálny vault.
          </p>

          <div className="story-grid">
            <article className="story-card">
              <span>01</span>
              <h3>Capture</h3>
              <p>Odfoť tabuľu, skriptá alebo rukou písanú poznámku a pošli ju do OCR workflow.</p>
            </article>
            <article className="story-card">
              <span>02</span>
              <h3>Refine</h3>
              <p>Backend vytiahne text, vytvorí summary a uloží výsledok do tvojho súkromného priestoru.</p>
            </article>
            <article className="story-card">
              <span>03</span>
              <h3>Recall</h3>
              <p>Vrátíš sa k starším poznámkam, otvoríš detail a rýchlo nájdeš, čo si potreboval.</p>
            </article>
          </div>

          <div className="feature-list compact-features" aria-label="Scenáre použitia">
            <span className="feature-inline">Fotky tabule a skrípt</span>
            <span className="feature-inline">Vlastná knižnica poznámok</span>
            <span className="feature-inline">Jednoduché študijné spracovanie</span>
          </div>
        </div>

        <form className="auth-form glass-panel" onSubmit={handleSubmit}>
          <div className="auth-form-top">
            <div>
              <div className="eyebrow">Secure entry</div>
              <h2>{title}</h2>
              <p className="hint">
                {isRegister
                  ? 'Účet sa vytvorí okamžite a hneď sa dostaneš do aplikácie.'
                  : 'Po prihlásení uvidíš len svoje vlastné poznámky a spracované výstupy.'}
              </p>
            </div>

            <div className="auth-switcher neon-switcher">
              <button type="button" className={mode === 'login' ? 'tab active' : 'tab'} onClick={() => setMode('login')}>
                Prihlásenie
              </button>
              <button type="button" className={mode === 'register' ? 'tab active' : 'tab'} onClick={() => setMode('register')}>
                Registrácia
              </button>
            </div>
          </div>

          {isRegister ? (
            <>
              <label className="field">
                <span>Meno</span>
                <input
                  value={registerForm.name}
                  onChange={(event) =>
                    setRegisterForm((current) => ({ ...current, name: event.target.value }))
                  }
                  placeholder="Napr. Daniel"
                />
              </label>
              <label className="field">
                <span>E-mail</span>
                <input
                  type="email"
                  value={registerForm.email}
                  onChange={(event) =>
                    setRegisterForm((current) => ({ ...current, email: event.target.value }))
                  }
                  placeholder="napr. daniel@student.sk"
                />
              </label>
              <label className="field">
                <span>Heslo</span>
                <input
                  type="password"
                  value={registerForm.password}
                  onChange={(event) =>
                    setRegisterForm((current) => ({ ...current, password: event.target.value }))
                  }
                  placeholder="Aspoň 8 znakov"
                />
              </label>
            </>
          ) : (
            <>
              <label className="field">
                <span>E-mail</span>
                <input
                  type="email"
                  value={loginForm.email}
                  onChange={(event) =>
                    setLoginForm((current) => ({ ...current, email: event.target.value }))
                  }
                  placeholder="napr. daniel@student.sk"
                />
              </label>
              <label className="field">
                <span>Heslo</span>
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(event) =>
                    setLoginForm((current) => ({ ...current, password: event.target.value }))
                  }
                  placeholder="Tvoje heslo"
                />
              </label>
            </>
          )}

          {error ? <div className="error">{error}</div> : null}

          <button type="submit" className="primary-cta" disabled={loading}>
            {loading ? 'Spracúvam...' : isRegister ? 'Vytvoriť účet' : 'Vstúpiť do štúdia'}
          </button>
        </form>
      </section>
    </div>
  );
}
