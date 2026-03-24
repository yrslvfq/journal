"use client";

import Link from "next/link";

type Props = {
  text: string;
  className?: string;
};

export function TradeNotesWiki({ text, className = "" }: Props) {
  const parts: React.ReactNode[] = [];
  const re = /\[\[([^\]]+?)\]\]/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      parts.push(
        <span key={`t-${key++}`} className="whitespace-pre-wrap">
          {text.slice(last, m.index)}
        </span>
      );
    }
    const id = m[1].trim();
    parts.push(
      <Link
        key={`l-${key++}`}
        href={`/dashboard/trades/${id}`}
        className="text-blue-400 hover:text-blue-300 underline underline-offset-2 font-medium"
      >
        [[{id}]]
      </Link>
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) {
    parts.push(
      <span key={`t-${key++}`} className="whitespace-pre-wrap">
        {text.slice(last)}
      </span>
    );
  }

  return (
    <div className={className}>
      <div className="text-slate-300 whitespace-pre-wrap break-words">{parts}</div>
    </div>
  );
}
