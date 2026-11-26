import type { ReactNode } from "react";

interface MarkdownPreviewProps {
  content: string;
  className?: string;
}

function renderInline(text: string): ReactNode[] {
  const tokens = text.split(/(`[^`]+`|\*\*[^*]+\*\*|_[^_]+_)/g);
  return tokens.map((token, idx) => {
    const tokenKey = `tok-${idx}-${token.length}`;
    if (token.startsWith("`") && token.endsWith("`") && token.length >= 2) {
      return (
        <code
          key={tokenKey}
          className="rounded bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 font-mono text-[0.85em] text-indigo-600 dark:text-indigo-300"
        >
          {token.slice(1, -1)}
        </code>
      );
    }
    if (token.startsWith("**") && token.endsWith("**") && token.length >= 4) {
      return (
        <strong
          key={tokenKey}
          className="font-semibold text-zinc-900 dark:text-zinc-100"
        >
          {token.slice(2, -2)}
        </strong>
      );
    }
    if (token.startsWith("_") && token.endsWith("_") && token.length >= 2) {
      return (
        <em key={tokenKey} className="italic text-zinc-500 dark:text-zinc-400">
          {token.slice(1, -1)}
        </em>
      );
    }
    return token;
  });
}

export function MarkdownPreview({
  content,
  className = "",
}: MarkdownPreviewProps) {
  const trimmed = content.trim();
  if (!trimmed) {
    return (
      <p className="text-sm italic text-zinc-400 dark:text-zinc-500">
        Sin descripción.
      </p>
    );
  }

  const lines = trimmed.split(/\r?\n/);
  const blocks: ReactNode[] = [];
  let listItems: string[] = [];

  function flushList(keyPrefix: number): void {
    if (listItems.length === 0) return;
    blocks.push(
      <ul
        key={`ul-${keyPrefix}`}
        className="list-disc pl-5 space-y-1 text-sm text-zinc-700 dark:text-zinc-300"
      >
        {listItems.map((item, idx) => (
          <li key={`li-${keyPrefix}-${idx}-${item.length}`}>
            {renderInline(item)}
          </li>
        ))}
      </ul>,
    );
    listItems = [];
  }

  lines.forEach((line, index) => {
    const clean = line.trim();
    if (!clean) {
      flushList(index);
      return;
    }
    if (clean.startsWith("- ")) {
      listItems.push(clean.slice(2));
      return;
    }
    flushList(index);

    const lineKey = `line-${index}-${clean.length}`;
    if (clean.startsWith("### ")) {
      blocks.push(
        <h4
          key={lineKey}
          className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 pt-1"
        >
          {renderInline(clean.slice(4))}
        </h4>,
      );
    } else if (clean.startsWith("## ")) {
      blocks.push(
        <h3
          key={lineKey}
          className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 pt-2"
        >
          {renderInline(clean.slice(3))}
        </h3>,
      );
    } else if (clean.startsWith("# ")) {
      blocks.push(
        <h2
          key={lineKey}
          className="text-base font-bold text-zinc-900 dark:text-zinc-100"
        >
          {renderInline(clean.slice(2))}
        </h2>,
      );
    } else if (clean.startsWith("> ")) {
      blocks.push(
        <blockquote
          key={lineKey}
          className="border-l-2 border-indigo-500/60 pl-3 text-xs text-zinc-600 dark:text-zinc-300"
        >
          {renderInline(clean.slice(2))}
        </blockquote>,
      );
    } else {
      blocks.push(
        <p
          key={lineKey}
          className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300"
        >
          {renderInline(clean)}
        </p>,
      );
    }
  });

  flushList(lines.length);

  return <div className={`space-y-2 ${className}`}>{blocks}</div>;
}
