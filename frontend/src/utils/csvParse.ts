/**
 * Minimal RFC 4180 reader: comma-separated, optionally double-quoted fields,
 * doubled quotes inside quotes, and line breaks inside quoted fields. A UTF-8
 * byte-order mark is ignored. Returns one record per data row, keyed by the
 * header row; blank lines are skipped.
 *
 * @example parseCsv('name,price\n"Bolt, M8",2')[0].name; // 'Bolt, M8'
 */
export const parseCsv = (text: string): Array<Record<string, string>> => {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  const source = text.replace(/^\uFEFF/, '');

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (quoted) {
      if (char === '"' && source[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && source[index + 1] === '\n') index += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const [header = [], ...data] = rows.filter(cells => cells.some(cell => cell.trim() !== ''));
  const keys = header.map(name => name.trim());
  return data.map(cells => Object.fromEntries(keys.map((key, i) => [key, cells[i] ?? ''])));
};
