// PostgreSQL splitter: semicolons inside strings, comments and dollar-quoted
// PL/pgSQL bodies do not terminate a statement. No user input reaches this.
export function splitSql(sql: string): string[] {
  const out: string[] = [];
  let start = 0, quote = '', dollar = '', line = false, block = 0;
  for (let i=0;i<sql.length;i++) {
    const c=sql[i], n=sql[i+1];
    if (line) { if(c==='\n') line=false; continue; }
    if (block) { if(c==='/' && n==='*'){block++;i++;} else if(c==='*' && n==='/'){block--;i++;} continue; }
    if (dollar) { if(sql.startsWith(dollar,i)){i+=dollar.length-1;dollar='';} continue; }
    if (quote) { if(c===quote){if(n===quote)i++;else quote='';} continue; }
    if(c==='-' && n==='-'){line=true;i++;continue;}
    if(c==='/' && n==='*'){block=1;i++;continue;}
    if(c==='\'' || c==='"'){quote=c;continue;}
    if(c==='$'){const m=sql.slice(i).match(/^\$(?:[A-Za-z_][A-Za-z_0-9]*)?\$/);if(m){dollar=m[0];i+=dollar.length-1;continue;}}
    if(c===';'){const s=sql.slice(start,i).trim();if(s)out.push(s);start=i+1;}
  }
  const rest=sql.slice(start).trim();if(rest)out.push(rest);
  return out;
}
