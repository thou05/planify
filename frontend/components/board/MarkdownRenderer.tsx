'use client';

import React from 'react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  onOpenCard?: (cardId: string) => void;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  className = '',
  onOpenCard,
}) => {
  if (!content) return null;

  // Split lines
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];

  let currentListItems: React.ReactNode[] = [];
  let isNumberedList = false;

  const flushList = () => {
    if (currentListItems.length > 0) {
      if (isNumberedList) {
        elements.push(
          <ol key={`list-${elements.length}`} className="my-2 space-y-1.5 pl-1 list-none">
            {currentListItems}
          </ol>
        );
      } else {
        elements.push(
          <ul key={`list-${elements.length}`} className="my-2 space-y-1.5 pl-1 list-none">
            {currentListItems}
          </ul>
        );
      }
      currentListItems = [];
      isNumberedList = false;
    }
  };

  // Helper to parse inline **bold**, *italic*, `code`, and [Card](card:id)
  const renderInline = (text: string): React.ReactNode => {
    // Regex splits tokens while keeping delimiters
    const parts = text.split(/(\[[^\]]+\]\(card:[^)]+\)|\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);

    return parts.map((part, index) => {
      // Check for card link: [Title](card:id)
      const cardMatch = part.match(/^\[([^\]]+)\]\(card:([a-zA-Z0-9_-]+)\)$/);
      if (cardMatch) {
        const title = cardMatch[1];
        const cardId = cardMatch[2];
        return (
          <button
            key={`card-${cardId}-${index}`}
            type="button"
            onClick={() => onOpenCard?.(cardId)}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 my-0.5 mx-0.5 rounded-xs bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-semibold transition-colors cursor-pointer group"
            title="Mở chi tiết thẻ này"
          >
            <span>🏷️ {title}</span>
          </button>
        );
      }

      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={index} className="font-bold text-slate-900">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return (
          <em key={index} className="italic text-slate-600">
            {part.slice(1, -1)}
          </em>
        );
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code
            key={index}
            className="px-1.5 py-0.5 mx-0.5 rounded-xs bg-slate-100 text-slate-800 font-mono text-[11px] border border-slate-200"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  lines.forEach((rawLine, idx) => {
    const line = rawLine.trim();

    // Empty line
    if (!line) {
      flushList();
      return;
    }

    // Horizontal Rule
    if (line === '---' || line === '***' || line === '___') {
      flushList();
      elements.push(
        <div key={`hr-${idx}`} className="my-3 border-t border-slate-200/80" />
      );
      return;
    }

    // H1
    if (line.startsWith('# ')) {
      flushList();
      elements.push(
        <h1
          key={`h1-${idx}`}
          className="text-base sm:text-lg font-bold text-slate-900 mt-4 mb-2 pb-1 border-b border-slate-200 flex items-center gap-2"
        >
          {renderInline(line.replace('# ', ''))}
        </h1>
      );
      return;
    }

    // H2
    if (line.startsWith('## ')) {
      flushList();
      elements.push(
        <h2
          key={`h2-${idx}`}
          className="text-sm sm:text-base font-bold text-slate-900 mt-3.5 mb-1.5 flex items-center gap-1.5"
        >
          {renderInline(line.replace('## ', ''))}
        </h2>
      );
      return;
    }

    // H3
    if (line.startsWith('### ')) {
      flushList();
      elements.push(
        <div
          key={`h3-${idx}`}
          className="mt-3.5 mb-2 px-2.5 py-1 rounded-sm bg-slate-100 border border-slate-200 text-xs sm:text-[13px] font-bold text-slate-900 flex items-center gap-2"
        >
          {renderInline(line.replace('### ', ''))}
        </div>
      );
      return;
    }

    // Bullet List (* or -)
    if (line.startsWith('* ') || line.startsWith('- ')) {
      if (isNumberedList) flushList();
      isNumberedList = false;
      const text = line.substring(2);
      currentListItems.push(
        <li key={`li-${idx}`} className="flex items-start gap-2 text-xs sm:text-[13px] text-slate-700 leading-relaxed">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0 mt-2" />
          <span className="flex-1">{renderInline(text)}</span>
        </li>
      );
      return;
    }

    // Numbered list (1. , 2. )
    const numberedMatch = line.match(/^(\d+)\.\s+(.*)$/);
    if (numberedMatch) {
      if (!isNumberedList) flushList();
      isNumberedList = true;
      const num = numberedMatch[1];
      const text = numberedMatch[2];
      currentListItems.push(
        <li key={`nli-${idx}`} className="flex items-start gap-2 text-xs sm:text-[13px] text-slate-700 leading-relaxed">
          <span className="w-4 h-4 rounded-xs bg-slate-100 text-slate-700 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5 border border-slate-200">
            {num}
          </span>
          <span className="flex-1">{renderInline(text)}</span>
        </li>
      );
      return;
    }

    // Regular Paragraph
    flushList();
    elements.push(
      <p key={`p-${idx}`} className="text-xs sm:text-[13px] text-slate-700 leading-relaxed my-1">
        {renderInline(line)}
      </p>
    );
  });

  flushList();

  return <div className={`space-y-1 ${className}`}>{elements}</div>;
};

/**
 * Chuyển đổi Markdown thành định dạng Text đẹp mắt, tự nhiên để dán vào Zalo, SMS, Messenger
 * (Loại bỏ các ký tự kỹ thuật ##, ###, *, giữ lại emoji và căn lề chuyên nghiệp)
 */
export function formatReportForZalo(markdown: string): string {
  if (!markdown) return '';

  return markdown
    .split('\n')
    .map((rawLine) => {
      let line = rawLine.trim();

      // Heading 1 & 2
      if (line.startsWith('# ') || line.startsWith('## ')) {
        const title = line.replace(/^#+\s*/, '').replace(/\*\*/g, '').toUpperCase();
        return `\n━━━━━━━━━━━━━━━━━━━━\n${title}\n━━━━━━━━━━━━━━━━━━━━`;
      }

      // Heading 3 (Sections)
      if (line.startsWith('### ')) {
        const title = line.replace(/^###\s*/, '').replace(/\*\*/g, '');
        return `\n📌 ${title}`;
      }

      // Divider
      if (line === '---' || line === '***' || line === '___') {
        return '────────────────────';
      }

      // Bullets
      if (line.startsWith('* ') || line.startsWith('- ')) {
        const item = line.substring(2).replace(/\*\*/g, '');
        return `  • ${item}`;
      }

      // Numbered items: 1. Item
      const numMatch = line.match(/^(\d+)\.\s+(.*)$/);
      if (numMatch) {
        const num = numMatch[1];
        const item = numMatch[2].replace(/\*\*/g, '');
        return `  ${num}. ${item}`;
      }

      // Normal lines: strip bold asterisks but keep text
      return line.replace(/\*\*/g, '');
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
