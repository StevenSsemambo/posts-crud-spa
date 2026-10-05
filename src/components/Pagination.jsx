// Builds a compact page list like: 1 … 4 5 [6] 7 8 … 20
function pageList(current, total) {
  const pages = new Set([1, total, current - 1, current, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push("gap" + p);
    out.push(p);
  });
  return out;
}

export default function Pagination({ page, pages, onChange }) {
  if (pages <= 1) return null;
  return (
    <nav className="pagination" aria-label="Pagination">
      <button className="btn" onClick={() => onChange(page - 1)} disabled={page === 1}>← Prev</button>
      {pageList(page, pages).map((p) =>
        typeof p === "string" ? (
          <span key={p} className="gap">…</span>
        ) : (
          <button
            key={p}
            className={`btn page-btn ${p === page ? "active" : ""}`}
            onClick={() => onChange(p)}
            aria-current={p === page ? "page" : undefined}
          >
            {p}
          </button>
        )
      )}
      <button className="btn" onClick={() => onChange(page + 1)} disabled={page === pages}>Next →</button>
    </nav>
  );
}
