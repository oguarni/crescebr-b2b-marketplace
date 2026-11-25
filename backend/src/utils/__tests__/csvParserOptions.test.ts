import { Readable } from 'stream';
import csv from 'csv-parser';
import { CSV_PARSER_OPTIONS } from '../csvImporter';

// The real csv-parser, unlike csvImporter.test.ts, which replaces it with a mock.
const parse = (text: string): Promise<Array<Record<string, string>>> =>
  new Promise((resolve, reject) => {
    const rows: Array<Record<string, string>> = [];
    Readable.from([text])
      .pipe(csv(CSV_PARSER_OPTIONS))
      .on('data', row => rows.push(row))
      .on('end', () => resolve(rows))
      .on('error', reject);
  });

describe('CSV_PARSER_OPTIONS', () => {
  it('reads a file that starts with a UTF-8 byte-order mark, as the export writes it', async () => {
    const rows = await parse('﻿name,description,price\n"Parafuso M8","Aço, inox","2.5"\n');
    expect(rows).toEqual([{ name: 'Parafuso M8', description: 'Aço, inox', price: '2.5' }]);
  });

  it('trims stray spaces around header names', async () => {
    expect(await parse(' name , price \nBolt,2\n')).toEqual([{ name: 'Bolt', price: '2' }]);
  });
});
