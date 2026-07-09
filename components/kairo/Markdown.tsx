"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * A tiny, dependency-free Markdown renderer for AI-written prose (Ask Sola,
 * "Do it for me" drafts, step answers). It parses a safe subset into React
 * nodes — never HTML — so there's no injection surface, and link hrefs are
 * sanitized to http(s)/mailto/relative only. It inherits font-size and colour
 * from its container; it only styles the structural bits (headings, code,
 * lists, links, emphasis).
 */

const SAFE_URL = /^(https?:|mailto:)/i;
function safeHref(url: string): string | null {
  const u = url.trim();
  if (SAFE_URL.test(u)) return u;
  if (u.startsWith("/") || u.startsWith("#")) return u;
  return null;
}

type Pattern = { re: RegExp; make: (m: RegExpExecArray, key: string) => React.ReactNode };

// Inline patterns, tried by earliest match position. Order breaks ties so that
// `**` (bold) is preferred over a single `*` (italic) at the same index.
const INLINE: Pattern[] = [
  { re: /`([^`]+)`/, make: (m, key) => <code key={key} className="rounded bg-white/[0.07] px-1 py-0.5 font-mono text-[0.85em] text-ink">{m[1]}</code> },
  { re: /\*\*([^*]+?)\*\*/, make: (m, key) => <strong key={key} className="font-semibold text-ink">{renderInline(m[1], key)}</strong> },
  { re: /__([^_]+?)__/, make: (m, key) => <strong key={key} className="font-semibold text-ink">{renderInline(m[1], key)}</strong> },
  { re: /~~([^~]+?)~~/, make: (m, key) => <span key={key} className="line-through opacity-70">{renderInline(m[1], key)}</span> },
  { re: /\*([^*\n]+?)\*/, make: (m, key) => <em key={key} className="italic">{renderInline(m[1], key)}</em> },
  { re: /_([^_\n]+?)_/, make: (m, key) => <em key={key} className="italic">{renderInline(m[1], key)}</em> },
  {
    re: /\[([^\]]+)\]\(([^)\s]+)\)/,
    make: (m, key) => {
      const href = safeHref(m[2]);
      return href
        ? <a key={key} href={href} target="_blank" rel="noopener noreferrer" className="text-accent underline decoration-accent/40 underline-offset-2 transition-colors hover:decoration-accent">{renderInline(m[1], key)}</a>
        : <span key={key}>{renderInline(m[1], key)}</span>;
    },
  },
];

function renderInline(text: string, keyBase: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let rest = text;
  let k = 0;
  let guard = 0;
  while (rest && guard++ < 4000) {
    let best: { p: Pattern; m: RegExpExecArray } | null = null;
    for (const p of INLINE) {
      const m = p.re.exec(rest);
      if (m && (best === null || m.index < best.m.index)) best = { p, m };
    }
    if (!best) { out.push(rest); break; }
    if (best.m.index > 0) out.push(rest.slice(0, best.m.index));
    out.push(best.p.make(best.m, `${keyBase}.${k++}`));
    rest = rest.slice(best.m.index + best.m[0].length);
  }
  return out;
}

const LIST_RE = /^(\s*)([-*+]|\d+\.)\s+(.*)$/;

function parseList(lines: string[], start: number, key: number): { node: React.ReactNode; next: number } {
  type Item = { indent: number; ordered: boolean; text: string };
  const items: Item[] = [];
  let i = start;
  while (i < lines.length) {
    const m = LIST_RE.exec(lines[i]);
    if (!m) break;
    items.push({ indent: m[1].replace(/\t/g, "  ").length, ordered: /\d/.test(m[2]), text: m[3] });
    i++;
  }
  let ptr = 0;
  const build = (minIndent: number, depth: number): React.ReactNode => {
    const ordered = items[ptr].ordered;
    const lis: React.ReactNode[] = [];
    let k = 0;
    while (ptr < items.length && items[ptr].indent >= minIndent) {
      const cur = items[ptr];
      const content = renderInline(cur.text, `li-${key}-${depth}-${k}`);
      ptr++;
      let child: React.ReactNode = null;
      if (ptr < items.length && items[ptr].indent > cur.indent) child = build(items[ptr].indent, depth + 1);
      lis.push(<li key={k++} className="pl-0.5">{content}{child}</li>);
    }
    return ordered
      ? <ol className={cn("list-decimal space-y-1 pl-5 marker:text-faint", depth > 0 && "mt-1")}>{lis}</ol>
      : <ul className={cn("list-disc space-y-1 pl-5 marker:text-faint", depth > 0 && "mt-1")}>{lis}</ul>;
  };
  return { node: build(items[0].indent, 0), next: i };
}

const HEADING = ["text-[1.18em]", "text-[1.1em]", "text-[1.02em]", "text-[0.98em]", "text-[0.95em]", "text-[0.92em]"];

function parseBlocks(src: string): React.ReactNode[] {
  const lines = (src ?? "").replace(/\r\n?/g, "\n").split("\n");
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let key = 0;
  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === "") { i++; continue; }

    // fenced code block
    if (/^\s*```/.test(line)) {
      const body: string[] = [];
      i++;
      while (i < lines.length && !/^\s*```/.test(lines[i])) { body.push(lines[i]); i++; }
      i++; // closing fence
      blocks.push(
        <pre key={key++} className="overflow-x-auto rounded-lg border border-line bg-white/[0.04] p-3">
          <code className="whitespace-pre font-mono text-[0.85em] text-ink">{body.join("\n")}</code>
        </pre>
      );
      continue;
    }

    // heading
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) {
      const level = h[1].length;
      blocks.push(
        <p key={key++} className={cn("font-display font-semibold text-ink", HEADING[level - 1], blocks.length > 0 && "mt-1")}>
          {renderInline(h[2].trim(), `h${key}`)}
        </p>
      );
      i++;
      continue;
    }

    // horizontal rule
    if (/^\s*(---|\*\*\*|___)\s*$/.test(line)) { blocks.push(<hr key={key++} className="border-line" />); i++; continue; }

    // blockquote
    if (/^\s*>\s?/.test(line)) {
      const quote: string[] = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) { quote.push(lines[i].replace(/^\s*>\s?/, "")); i++; }
      blocks.push(
        <blockquote key={key++} className="border-l-2 border-line-strong pl-3 italic text-muted">
          {renderInline(quote.join(" "), `bq${key}`)}
        </blockquote>
      );
      continue;
    }

    // list
    if (LIST_RE.test(line)) {
      const { node, next } = parseList(lines, i, key++);
      blocks.push(<React.Fragment key={key++}>{node}</React.Fragment>);
      i = next;
      continue;
    }

    // paragraph: gather until a blank line or a block starter
    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !/^\s*```/.test(lines[i]) &&
      !/^(#{1,6})\s+/.test(lines[i]) &&
      !/^\s*(---|\*\*\*|___)\s*$/.test(lines[i]) &&
      !/^\s*>\s?/.test(lines[i]) &&
      !LIST_RE.test(lines[i])
    ) { para.push(lines[i]); i++; }
    blocks.push(<p key={key++}>{renderInline(para.join(" "), `p${key}`)}</p>);
  }
  return blocks;
}

export function Markdown({ children, className }: { children: string; className?: string }) {
  const blocks = React.useMemo(() => parseBlocks(children), [children]);
  if (!children?.trim()) return null;
  return <div className={cn("space-y-2 [&_a]:break-words", className)}>{blocks}</div>;
}
