function countWords(text) {
  return text ? text.trim().split(/\s+/).filter(Boolean).length : 0;
}

export default function NoteDetail({ note, loading }) {
  return (
    <section className="glass-panel detail-card redesigned-detail">
      <div className="section-header">
        <div>
          <div className="eyebrow">Inspector</div>
          <h2>Detail poznámky</h2>
        </div>
        {note ? <div className="section-meta plain-meta">{note.subject || 'Bez predmetu'}</div> : null}
      </div>

      {loading ? <p className="hint">Načítavam detail...</p> : null}

      {!loading && !note ? (
        <div className="empty-state">
          <h3>Žiadna karta nie je otvorená</h3>
          <p className="empty">Vyber poznámku zo zoznamu alebo nahraj novú, aby si videl extrahovaný text a summary.</p>
        </div>
      ) : null}

      {!loading && note ? (
        <>
          <div className="detail-top-grid">
            <div className="summary-box luminous-box">
              <div className="detail-card-header">
                <div>
                  <h3>{note.title}</h3>
                  <p className="hint">Súbor: {note.sourceFileName}</p>
                </div>
                <div className="micro-stats">
                  <span>{countWords(note.summary)} slov v summary</span>
                  <span>{countWords(note.extractedText)} slov v texte</span>
                </div>
              </div>
              <p>{note.summary}</p>
            </div>

            <div className="summary-box side-info-box">
              <h3>Rýchly prehľad</h3>
              <ul className="detail-facts">
                <li><span>Predmet</span><strong>{note.subject || 'Bez predmetu'}</strong></li>
                <li><span>Vytvorené</span><strong>{new Date(note.createdAt).toLocaleString('sk-SK')}</strong></li>
                <li><span>Názov súboru</span><strong>{note.sourceFileName}</strong></li>
              </ul>
            </div>
          </div>

          <div className="text-box terminal-box">
            <div className="section-header compact-header">
              <h3>Extrahovaný text</h3>
              <div className="section-meta plain-meta">OCR text</div>
            </div>
            <pre>{note.extractedText}</pre>
          </div>
        </>
      ) : null}
    </section>
  );
}
