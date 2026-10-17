import { useRef } from 'react';

// React text nodes keep highlighting safe: query text is never injected as HTML.
function highlight(sql: string) {
  const tokens = sql.split(/(--[^\n]*|\/\*[\s\S]*?\*\/|'(?:''|[^'])*'|"(?:""|[^"])*"|\b\d+(?:\.\d+)?\b|\b(?:SELECT|FROM|WHERE|JOIN|LEFT|RIGHT|INNER|ON|AS|GROUP|BY|HAVING|ORDER|DESC|ASC|LIMIT|INSERT|INTO|VALUES|RETURNING|UPDATE|SET|DELETE|CREATE|TABLE|DROP|IF|EXISTS|NOT|NULL|AND|OR|WITH|RECURSIVE|UNION|ALL|BEGIN|COMMIT|ROLLBACK|FUNCTION|RETURNS|TRIGGER|BEFORE|AFTER|FOR|EACH|ROW|EXECUTE|LANGUAGE|REPLACE|PRIMARY|KEY|DEFAULT|END|CASE|WHEN|THEN|ELSE|FILTER|TRUE|FALSE)\b)/gi);
  return tokens.map((token, i) => <span key={i} className={/^--|^\/\*/.test(token) ? 'text-slate-500' : /^'/.test(token) ? 'text-emerald-300' : /^"/.test(token) ? 'text-sky-200' : /^\d/.test(token) ? 'text-amber-200' : i % 2 ? 'text-violet-300' : undefined}>{token}</span>);
}

export default function SqlEditor({ value, onChange, onRun, disabled }: {
  value: string; onChange: (sql: string) => void; onRun: (selection?: string) => void; disabled: boolean;
}) {
  const paint = useRef<HTMLPreElement>(null);
  const gutter = useRef<HTMLDivElement>(null);
  return <div className="sql-editor relative h-[350px] bg-[#101e2c] text-[13px] leading-6 text-slate-200 sm:h-[390px]">
    <div ref={gutter} aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-12 overflow-hidden border-r border-white/5 py-5 text-right font-mono text-slate-600">
      {value.split('\n').map((_, i) => <div key={i} className="pr-3">{i + 1}</div>)}
    </div>
    <pre ref={paint} aria-hidden="true" className="pointer-events-none absolute inset-0 ml-12 overflow-hidden whitespace-pre p-5 font-mono" style={{ tabSize: 2 }}>{highlight(value)}{'\n'}</pre>
    <textarea aria-label="SQL query" spellCheck={false} autoCapitalize="off" autoCorrect="off" value={value}
      onChange={event => onChange(event.target.value)}
      onScroll={event => {
        if (paint.current) { paint.current.scrollTop = event.currentTarget.scrollTop; paint.current.scrollLeft = event.currentTarget.scrollLeft; }
        if (gutter.current) gutter.current.scrollTop = event.currentTarget.scrollTop;
      }}
      onKeyDown={event => {
        const element = event.currentTarget;
        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
          event.preventDefault(); if (!disabled) onRun(element.value.slice(element.selectionStart, element.selectionEnd) || undefined);
        }
        if (event.key === 'Tab') {
          event.preventDefault(); const start = element.selectionStart, end = element.selectionEnd;
          onChange(value.slice(0, start) + '  ' + value.slice(end));
          requestAnimationFrame(() => element.setSelectionRange(start + 2, start + 2));
        }
        if (event.key === 'Escape') element.blur();
      }}
      className="absolute inset-y-0 left-12 w-[calc(100%-3rem)] resize-none overflow-auto whitespace-pre border-0 bg-transparent p-5 font-mono text-transparent caret-emerald-300 outline-none selection:bg-sky-400/20 focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-emerald-400"
      style={{ tabSize: 2, WebkitTextFillColor: 'transparent' }}
      aria-describedby="sql-shortcuts" />
  </div>;
}
