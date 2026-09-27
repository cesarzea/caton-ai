import {Fragment} from 'react';
import type {ReactNode} from 'react';

import {inlineMarkup} from '../help-markup.ts';
import type {Inline} from '../help-markup.ts';

// Help comes from plugins, including marketplace ones: it becomes elements, never HTML.
// Supported: paragraphs, "- " lists, **bold**, `code` and [text](https://…) links.

function Piece({piece}: Readonly<{piece: Inline}>): ReactNode {
  switch (piece.kind) {
    case 'bold':
      return <strong>{piece.text}</strong>;
    case 'code':
      return <code>{piece.text}</code>;
    case 'link':
      return (
        <a href={piece.href} target="_blank" rel="noopener noreferrer">
          {piece.text}
        </a>
      );
    case 'text':
      return <Fragment>{piece.text}</Fragment>;
  }
}

function Line({text}: Readonly<{text: string}>): ReactNode {
  return inlineMarkup(text).map((piece, index) => (
    <Piece key={`${String(index)}-${piece.text}`} piece={piece} />
  ));
}

function Block({text}: Readonly<{text: string}>): ReactNode {
  const lines = text.split('\n');
  if (lines.every(line => line.startsWith('- '))) {
    return (
      <ul>
        {lines.map(line => (
          <li key={line}>
            <Line text={line.slice(2)} />
          </li>
        ))}
      </ul>
    );
  }
  return (
    <p>
      <Line text={lines.join(' ')} />
    </p>
  );
}

export function Help({text, id}: Readonly<{text: string; id?: string}>): ReactNode {
  return (
    <div className="help" id={id}>
      {text.split('\n\n').map(block => (
        <Block key={block} text={block} />
      ))}
    </div>
  );
}
