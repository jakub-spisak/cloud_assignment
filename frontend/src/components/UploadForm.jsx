import { useState } from 'react';

export default function UploadForm({ onProcessed }) {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    if (!file) {
      setError('Najprv vyber obrázok.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onProcessed({ file, title, subject });
      setFile(null);
      setTitle('');
      setSubject('');
      event.target.reset();
    } catch (submissionError) {
      setError(submissionError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="glass-panel upload-card redesigned-upload" onSubmit={handleSubmit}>
      <div className="section-header align-start">
        <div>
          <div className="eyebrow">New capture</div>
          <h2>Nahraj novú poznámku</h2>
        </div>
        <div className="section-meta plain-meta">Iba obrázky</div>
      </div>

      <p className="hint upload-lead">
        Najlepšie funguje fotka tabule, skrípt alebo ručne písaných poznámok s čitateľným textom.
        Po odoslaní sa vytvorí OCR výstup aj krátke summary.
      </p>

      <div className="field-grid">
        <label className="field">
          <span>Názov poznámky</span>
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Napr. Prednáška 4 - cloud architektúra" />
        </label>

        <label className="field">
          <span>Predmet alebo tag</span>
          <input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Napr. Cloud computing" />
        </label>
      </div>

      <label className="file-dropzone">
        <input type="file" accept="image/*" onChange={(event) => setFile(event.target.files?.[0] || null)} />
        <div className="dropzone-copy">
          <strong>{file ? file.name : 'Pretiahni alebo vyber obrázok'}</strong>
          <span>{file ? 'Súbor je pripravený na OCR spracovanie.' : 'Podporované sú bežné obrázkové formáty.'}</span>
        </div>
      </label>

      <div className="upload-footer">
        <div className="hint subtle">Tip: kontrastná a rovná fotka spraví lepší OCR výsledok.</div>
        <button type="submit" className="primary-cta" disabled={loading}>
          {loading ? 'Spracovávam OCR...' : 'Spracovať a uložiť'}
        </button>
      </div>

      {error ? <div className="error">{error}</div> : null}
    </form>
  );
}
