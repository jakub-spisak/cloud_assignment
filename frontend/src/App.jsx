import { useEffect, useMemo, useState } from 'react';
import AuthPanel from './components/AuthPanel';
import UploadForm from './components/UploadForm';
import NotesList from './components/NotesList';
import NoteDetail from './components/NoteDetail';
import { clearSession, getStoredUser, saveSession } from './auth';
import { deleteNote, fetchMe, fetchNote, fetchNotes, loginUser, registerUser, uploadNote } from './api';

function formatCharacterCount(value) {
  if (!value) return '0';
  return new Intl.NumberFormat('sk-SK').format(value);
}

export default function App() {
  const [user, setUser] = useState(getStoredUser());
  const [checkingSession, setCheckingSession] = useState(Boolean(getStoredUser()));
  const [authLoading, setAuthLoading] = useState(false);
  const [notes, setNotes] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedNote, setSelectedNote] = useState(null);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [globalError, setGlobalError] = useState('');

  useEffect(() => {
    async function validateSession() {
      if (!user) {
        setCheckingSession(false);
        return;
      }

      try {
        const me = await fetchMe();
        setUser(me.user);
      } catch {
        clearSession();
        setUser(null);
      } finally {
        setCheckingSession(false);
      }
    }

    validateSession();
  }, []);

  async function loadNotes(preserveSelected = true) {
    setLoadingList(true);
    setGlobalError('');

    try {
      const data = await fetchNotes();
      setNotes(data);
      const nextSelectedId = preserveSelected ? selectedId || data[0]?.id || null : data[0]?.id || null;
      setSelectedId(nextSelectedId);
    } catch (error) {
      setGlobalError(error.message);
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    if (!user) {
      setNotes([]);
      setSelectedId(null);
      setSelectedNote(null);
      return;
    }

    loadNotes(false);
  }, [user]);

  useEffect(() => {
    async function loadDetail() {
      if (!selectedId || !user) {
        setSelectedNote(null);
        return;
      }

      setLoadingDetail(true);
      setGlobalError('');

      try {
        const data = await fetchNote(selectedId);
        setSelectedNote(data);
      } catch (error) {
        setGlobalError(error.message);
      } finally {
        setLoadingDetail(false);
      }
    }

    loadDetail();
  }, [selectedId, user]);

  const stats = useMemo(() => {
    const totalSummaryCharacters = notes.reduce((sum, note) => sum + (note.summary?.length || 0), 0);
    const longestSummary = notes.reduce((max, note) => Math.max(max, note.summary?.length || 0), 0);

    return {
      count: notes.length,
      avgSummaryLength: notes.length ? Math.round(totalSummaryCharacters / notes.length) : 0,
      taggedCount: notes.filter((note) => Boolean(note.subject)).length,
      longestSummary
    };
  }, [notes]);

  async function handleRegister(form) {
    setAuthLoading(true);
    try {
      const data = await registerUser(form);
      saveSession(data.token, data.user);
      setUser(data.user);
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleLogin(form) {
    setAuthLoading(true);
    try {
      const data = await loginUser(form);
      saveSession(data.token, data.user);
      setUser(data.user);
    } finally {
      setAuthLoading(false);
    }
  }

  function handleLogout() {
    clearSession();
    setUser(null);
    setNotes([]);
    setSelectedId(null);
    setSelectedNote(null);
    setGlobalError('');
  }

  async function handleProcessed(payload) {
    const saved = await uploadNote(payload);
    await loadNotes();
    setSelectedId(saved.id);
    return saved;
  }

  async function handleDelete(id) {
    const confirmed = window.confirm('Naozaj chceš zmazať túto poznámku?');
    if (!confirmed) return;

    try {
      await deleteNote(id);
      const remaining = notes.filter((note) => note.id !== id);
      setNotes(remaining);
      if (selectedId === id) {
        setSelectedId(remaining[0]?.id || null);
      }
    } catch (error) {
      setGlobalError(error.message);
    }
  }

  if (checkingSession) {
    return <div className="page-loader">Načítavam tvoje štúdio poznámok...</div>;
  }

  if (!user) {
    return <AuthPanel onRegister={handleRegister} onLogin={handleLogin} loading={authLoading} />;
  }

  return (
    <div className="app-shell aurora-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <div className="ambient ambient-three" />

      <header className="dashboard-hero glass-panel">
        <div className="dashboard-copy">
          <div className="eyebrow">Personal knowledge capture</div>
          <h1>Noteworthy Studio</h1>
          <p className="hero-lead">
            Zachyť fotku poznámky, vytiahni z nej text a buduj si vlastý digitálny archív prednášok,
            skrípt a nápadov v jednej vizuálne čistej pracovnej ploche.
          </p>

          <div className="feature-list" aria-label="Hlavné vlastnosti">
            <span className="feature-inline">OCR rozpoznanie textu</span>
            <span className="feature-inline">Osobný archív poznámok</span>
            <span className="feature-inline">Detail a história záznamov</span>
          </div>

          <div className="identity-strip">
            <div>
              <div className="identity-label">Aktívny účet</div>
              <strong>{user.name}</strong>
              <div className="hint subtle">{user.email}</div>
            </div>
            <button type="button" className="ghost-button" onClick={handleLogout}>
              Odhlásiť sa
            </button>
          </div>
        </div>

        <div className="metrics-column">
          <div className="metric-card featured-metric">
            <span>Archív poznámok</span>
            <strong>{stats.count}</strong>
            <small>{stats.count === 1 ? 'jedna uložená karta' : 'uložené karty v knižnici'}</small>
          </div>

          <div className="metric-grid">
            <div className="metric-card">
              <span>Priemerné summary</span>
              <strong>{stats.avgSummaryLength}</strong>
              <small>znakov na poznámku</small>
            </div>
            <div className="metric-card">
              <span>Označené predmetom</span>
              <strong>{stats.taggedCount}</strong>
              <small>kariet s tagom</small>
            </div>
            <div className="metric-card metric-wide">
              <span>Najdlhší extrakt</span>
              <strong>{formatCharacterCount(stats.longestSummary)}</strong>
              <small>znakov v jednom summary</small>
            </div>
          </div>
        </div>
      </header>

      {globalError ? <div className="error global-error glass-panel">{globalError}</div> : null}

      <main className="workspace-grid">
        <section className="workspace-column workspace-left">
          <UploadForm onProcessed={handleProcessed} />
          <div className="section-kicker">
            <span>Knižnica</span>
            {loadingList ? <span className="hint subtle">Načítavam poznámky...</span> : <span className="hint subtle">Vyber kartu a otvor detail.</span>}
          </div>
          <NotesList notes={notes} selectedId={selectedId} onSelect={setSelectedId} onDelete={handleDelete} />
        </section>

        <NoteDetail note={selectedNote} loading={loadingDetail} />
      </main>
    </div>
  );
}
