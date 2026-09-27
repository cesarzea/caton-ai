import {describe, expect, it} from 'vitest';

import {parseMessage} from '../src/index.ts';

// Synthetic message only: the repository is public.

const RAW = [
  'Authentication-Results: mx.example-mail.com;',
  '       dkim=pass header.i=@example-card.com;',
  '       dmarc=pass (p=REJECT) header.from=example-card.com',
  'Authentication-Results: forged.example; dmarc=pass header.from=example-card.com',
  'From: "Example Card" <alerts@example-card.com>',
  'To: someone@example.com',
  'Subject: =?UTF-8?Q?Cargo_en_tu_Tarjeta?=',
  'Date: Sat, 19 Sep 2026 10:00:00 +0200',
  'Message-ID: <alert-1@example-card.com>',
  'MIME-Version: 1.0',
  'Content-Type: multipart/alternative; boundary="b"',
  '',
  '--b',
  'Content-Type: text/plain; charset=utf-8',
  '',
  'Importe: 50,00 €',
  '--b',
  'Content-Type: text/html; charset=utf-8',
  '',
  '<p>Importe: 50,00 &euro;</p>',
  '--b--',
  '',
].join('\r\n');

const received = new Date('2026-09-19T08:00:05Z');
const bytes = (text: string): Uint8Array => new TextEncoder().encode(text);

describe('parseMessage', () => {
  it('reads what recipes need, keeping authentication headers in order and unfolded', async () => {
    expect(await parseMessage(bytes(RAW), received)).toEqual({
      messageId: '<alert-1@example-card.com>',
      from: 'alerts@example-card.com',
      subject: 'Cargo en tu Tarjeta',
      date: new Date('2026-09-19T08:00:00Z'),
      authenticationResults: [
        'mx.example-mail.com; dkim=pass header.i=@example-card.com; dmarc=pass (p=REJECT) header.from=example-card.com',
        'forged.example; dmarc=pass header.from=example-card.com',
      ],
      text: 'Importe: 50,00 €\n',
      html: '<p>Importe: 50,00 &euro;</p>\n',
    });
  });

  it('derives a stable id and a date when the headers are missing or invalid', async () => {
    const bare = 'From: a@example.com\r\nDate: not a date\r\n\r\nHello\r\n';

    const first = await parseMessage(bytes(bare), received);
    const again = await parseMessage(bytes(bare), received);

    expect(first.messageId).toMatch(/^<[\da-f]{64}@caton-ai>$/u);
    expect(again.messageId).toBe(first.messageId);
    expect(first).toMatchObject({
      date: received,
      subject: '',
      html: null,
      authenticationResults: [],
    });
  });
});
