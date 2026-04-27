export default function NotesList({ notes, selectedId, onSelect, onDelete }) {
  return (
    <div className="glass-panel notes-panel">
      <div className="section-header">
        <div>
          <div className="eyebrow">Saved cards</div>
          <h2>Moje poznámky</h2>
        </div>
        <div className="section-meta plain-meta">{
          notes.length} {notes.length === 1 ? 'uložená poznámka' : 'uložené poznámky'}
        </div>
      </div>

      {notes.length === 0 ? (
        <p className="empty">Zatiaľ tu nič nie je. Nahraj prvú poznámku a vytvor si vlastnú knižnicu.</p>
      ) : (
        <div className="notes-list redesigned-list">
          {notes.map((note) => (
            <article key={note.id} className={`note-item ${selectedId === note.id ? 'selected' : ''}`}>
              <button type="button" className="note-select" onClick={() => onSelect(note.id)}>
                <div className="note-topline">
                  <div className="note-title">{note.title}</div>
                  <span className="note-tagline plain-meta">{note.subject || 'Bez tagu'}</span>
                </div>
                <div className="note-meta-row">
                  <span className="note-meta">{new Date(note.createdAt).toLocaleString('sk-SK')}</span>
                  <span className="note-meta ellipsis-text">{note.sourceFileName}</span>
                </div>
                <div className="note-summary">{note.summary}</div>
              </button>
              <button type="button" className="danger-button" onClick={() => onDelete(note.id)}>
                Odstrániť
              </button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
