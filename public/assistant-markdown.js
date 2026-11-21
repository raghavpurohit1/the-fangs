(() => {
  // A deliberately small Markdown renderer. Untrusted text never becomes HTML.
  const safeHref = value => {
    const href = String(value).trim();
    if (!href || /[\u0000-\u0020\u007f\\]/.test(href)) return null;
    if (href.startsWith('#') || (href.startsWith('/') && !href.startsWith('//'))) return href;
    try {
      const url = new URL(href);
      return ['https:', 'http:', 'mailto:'].includes(url.protocol) ? url.href : null;
    } catch { return null; }
  };

  function inline(parent, value, doc, depth = 0) {
    const source = String(value);
    let plain = '';
    const flush = () => { if (plain) parent.append(doc.createTextNode(plain)); plain = ''; };
    for (let i = 0; i < source.length;) {
      if (source[i] === '\\' && /[\\`*_{}\[\]()#+\-.!|>]/.test(source[i + 1] || '')) {
        plain += source[i + 1]; i += 2; continue;
      }
      if (source[i] === '\n') { flush(); parent.append(doc.createElement('br')); i++; continue; }
      if (source[i] === '`') {
        const marker = source.slice(i).match(/^`+/)[0], end = source.indexOf(marker, i + marker.length);
        if (end >= 0) {
          flush(); const code = doc.createElement('code');
          code.textContent = source.slice(i + marker.length, end); parent.append(code);
          i = end + marker.length; continue;
        }
      }
      if (source[i] === '[' && depth < 8) {
        const labelEnd = source.indexOf('](', i + 1);
        if (labelEnd >= 0 && !source.slice(i, labelEnd).includes('\n')) {
          let end = labelEnd + 2, balance = 1;
          for (; end < source.length; end++) {
            if (source[end] === '\\') { end++; continue; }
            if (source[end] === '(') balance++;
            if (source[end] === ')' && --balance === 0) break;
          }
          if (balance === 0) {
            const href = safeHref(source.slice(labelEnd + 2, end));
            if (href) {
              flush(); const link = doc.createElement('a'); link.setAttribute('href', href);
              if (/^https?:/i.test(href)) { link.setAttribute('target', '_blank'); link.setAttribute('rel', 'noopener noreferrer'); }
              inline(link, source.slice(i + 1, labelEnd), doc, depth + 1); parent.append(link);
            } else plain += source.slice(i, end + 1);
            i = end + 1; continue;
          }
        }
      }
      const marker = source.startsWith('**', i) ? '**' : source.startsWith('__', i) ? '__' : source[i] === '*' ? '*' : null;
      if (marker && depth < 8) {
        const end = source.indexOf(marker, i + marker.length);
        if (end > i + marker.length) {
          flush(); const emphasis = doc.createElement(marker.length === 2 ? 'strong' : 'em');
          inline(emphasis, source.slice(i + marker.length, end), doc, depth + 1); parent.append(emphasis);
          i = end + marker.length; continue;
        }
      }
      plain += source[i++];
    }
    flush();
  }

  function tableCells(line) {
    const source = line.trim(), cells = [];
    let cell = '', ticks = 0, delimiters = 0;
    for (let i = 0; i < source.length;) {
      if (source[i] === '\\' && i + 1 < source.length) { cell += source.slice(i, i + 2); i += 2; continue; }
      if (source[i] === '`') {
        const marker = source.slice(i).match(/^`+/)[0];
        if (ticks === marker.length) ticks = 0; else if (!ticks) ticks = marker.length;
        cell += marker; i += marker.length; continue;
      }
      if (source[i] === '|' && !ticks) { cells.push(cell.trim()); cell = ''; delimiters++; i++; continue; }
      cell += source[i++];
    }
    cells.push(cell.trim());
    if (source.startsWith('|')) cells.shift();
    if (source.endsWith('|') && !ticks && cells.at(-1) === '') cells.pop();
    return delimiters ? cells : null;
  }
  function tableAt(lines, index) {
    const headers = tableCells(lines[index] || ''), separators = tableCells(lines[index + 1] || '');
    if (!headers?.length || headers.length !== separators?.length || !separators.every(cell => /^:?-{3,}:?$/.test(cell))) return null;
    return { headers, align: separators.map(cell => cell.startsWith(':') && cell.endsWith(':') ? 'center' : cell.endsWith(':') ? 'right' : 'left') };
  }
  const listMarker = line => /^(\s*)([-+*]|\d+[.)])\s+(.+)$/.exec(line);
  const fenceMarker = line => /^\s{0,3}(`{3,}|~{3,})([^`]*)$/.exec(line);
  const headingMarker = line => /^\s{0,3}(#{1,6})\s+(.+?)\s*$/.exec(line);

  function blocks(parent, lines, doc) {
    let i = 0;
    while (i < lines.length) {
      if (!lines[i].trim()) { i++; continue; }
      const fence = fenceMarker(lines[i]);
      if (fence) {
        const marker = fence[1], content = []; i++;
        while (i < lines.length && !new RegExp(`^\\s{0,3}${marker[0]}{${marker.length},}\\s*$`).test(lines[i])) content.push(lines[i++]);
        if (i < lines.length) i++;
        const pre = doc.createElement('pre'), code = doc.createElement('code');
        code.textContent = content.join('\n'); pre.append(code); parent.append(pre); continue;
      }
      const heading = headingMarker(lines[i]);
      if (heading) {
        const element = doc.createElement(`h${Math.min(heading[1].length + 1, 6)}`);
        inline(element, heading[2].replace(/\s+#+$/, ''), doc); parent.append(element); i++; continue;
      }
      const definition = tableAt(lines, i);
      if (definition) {
        const wrap = doc.createElement('div'), table = doc.createElement('table'), head = doc.createElement('thead'), body = doc.createElement('tbody'), row = doc.createElement('tr');
        wrap.className = 'assistant-table-scroll'; wrap.setAttribute('tabindex', '0'); wrap.setAttribute('role', 'region'); wrap.setAttribute('aria-label', 'Assistant response table');
        definition.headers.forEach((label, column) => {
          const cell = doc.createElement('th'); cell.setAttribute('scope', 'col'); cell.className = `assistant-align-${definition.align[column]}`; inline(cell, label, doc); row.append(cell);
        });
        head.append(row); table.append(head); i += 2;
        while (i < lines.length && lines[i].trim()) {
          const cells = tableCells(lines[i]); if (!cells) break;
          const row = doc.createElement('tr');
          for (let column = 0; column < Math.max(cells.length, definition.headers.length); column++) {
            const cell = doc.createElement('td'); cell.className = `assistant-align-${definition.align[column] || 'left'}`; inline(cell, cells[column] || '', doc); row.append(cell);
          }
          body.append(row); i++;
        }
        table.append(body); wrap.append(table); parent.append(wrap); continue;
      }
      const marker = listMarker(lines[i]);
      if (marker) {
        const indent = marker[1].length, ordered = /^\d/.test(marker[2]), list = doc.createElement(ordered ? 'ol' : 'ul');
        if (ordered && parseInt(marker[2], 10) !== 1) list.setAttribute('start', String(parseInt(marker[2], 10)));
        while (i < lines.length) {
          const current = listMarker(lines[i]);
          if (!current || current[1].length !== indent || /^\d/.test(current[2]) !== ordered) break;
          const item = doc.createElement('li'), itemLines = [current[3]], continuationIndent = current[0].length - current[3].length; i++;
          while (i < lines.length) {
            if (!lines[i].trim()) {
              if ((lines[i + 1]?.match(/^\s*/)[0].length || 0) > indent) { itemLines.push(''); i++; continue; }
              break;
            }
            const next = listMarker(lines[i]), leading = lines[i].match(/^\s*/)[0].length;
            if (leading <= indent || (next && next[1].length === indent)) break;
            itemLines.push(lines[i].slice(Math.min(leading, continuationIndent))); i++;
          }
          blocks(item, itemLines, doc); list.append(item);
          if (!lines[i]?.trim() && listMarker(lines[i + 1] || '')?.[1].length === indent) i++;
        }
        parent.append(list); continue;
      }
      const paragraph = [lines[i++]];
      while (i < lines.length && lines[i].trim() && !fenceMarker(lines[i]) && !headingMarker(lines[i]) && !listMarker(lines[i]) && !tableAt(lines, i)) paragraph.push(lines[i++]);
      const element = doc.createElement('p'); inline(element, paragraph.join('\n'), doc); parent.append(element);
    }
  }
  window.NextStepMarkdown = Object.freeze({
    render(host, value) {
      const doc = host.ownerDocument || document, fragment = doc.createDocumentFragment();
      blocks(fragment, String(value ?? '').replace(/\r\n?/g, '\n').split('\n'), doc);
      host.replaceChildren(fragment); host.classList.add('assistant-markdown');
    }
  });
})();
