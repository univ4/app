"use client";

import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { Check, Link2 } from "lucide-react";
import Link from "next/link";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

type MarkdownRendererProps = {
  content: string;
  sectionId: string;
  copiedId: string | null;
  onCopyLink: (id: string) => void;
};

function AnchorRenderer(props: ComponentPropsWithoutRef<"a">) {
  const href = props.href ?? "";
  const className = "font-medium text-primary underline-offset-4 hover:underline";

  if (href.startsWith("/dashboard/")) {
    return (
      <Link href={href} className={className}>
        {props.children}
      </Link>
    );
  }

  return (
    <a
      {...props}
      className={className}
      target={href.startsWith("http") ? "_blank" : undefined}
      rel={href.startsWith("http") ? "noreferrer noopener" : undefined}
    />
  );
}

function extractText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (node && typeof node === "object" && "props" in node) {
    return extractText((node as { props?: { children?: ReactNode } }).props?.children ?? "");
  }
  return "";
}

function toSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
}

export function MarkdownRenderer({ content, sectionId, copiedId, onCopyLink }: MarkdownRendererProps) {
  const markdownComponents: Components = {
    a: AnchorRenderer,
    h1: ({ children, ...props }) => (
      <h1
        {...props}
        className="mt-8 mb-4 border-b border-border pb-2 text-2xl font-bold text-foreground"
      >
        {children}
      </h1>
    ),
    h2: ({ children, ...props }) => {
      const label = extractText(children);
      const headingId = `${sectionId}-${toSlug(label)}`;
      const isCopied = copiedId === headingId;
      return (
        <h2
          {...props}
          id={headingId}
          className="group mt-6 mb-3 flex scroll-mt-24 items-center gap-2 text-xl font-semibold text-foreground"
        >
          <span>{children}</span>
          <button
            type="button"
            aria-label="링크 복사"
            className="opacity-0 transition-opacity group-hover:opacity-100"
            onClick={() => onCopyLink(headingId)}
          >
            {isCopied ? <Check className="size-4 text-green-600" /> : <Link2 className="size-4 text-muted-foreground" />}
          </button>
        </h2>
      );
    },
    h3: ({ children, ...props }) => {
      const label = extractText(children);
      const headingId = `${sectionId}-${toSlug(label)}`;
      const isCopied = copiedId === headingId;
      return (
        <h3
          {...props}
          id={headingId}
          className="group mt-4 mb-2 flex scroll-mt-24 items-center gap-2 text-base font-semibold text-foreground"
        >
          <span>{children}</span>
          <button
            type="button"
            aria-label="링크 복사"
            className="opacity-0 transition-opacity group-hover:opacity-100"
            onClick={() => onCopyLink(headingId)}
          >
            {isCopied ? <Check className="size-4 text-green-600" /> : <Link2 className="size-4 text-muted-foreground" />}
          </button>
        </h3>
      );
    },
    p: ({ children }) => <p className="mb-3 text-sm leading-relaxed text-foreground">{children}</p>,
    ul: ({ children }) => (
      <ul className="mb-3 list-inside list-disc space-y-1 pl-4 text-sm">{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className="mb-3 list-inside list-decimal space-y-1 pl-4 text-sm">{children}</ol>
    ),
    li: ({ children }) => <li className="text-sm text-foreground">{children}</li>,
    pre: ({ children }) => (
      <pre className="mb-4 overflow-x-auto rounded-md bg-muted p-4 text-xs">{children}</pre>
    ),
    blockquote: ({ children }) => (
      <blockquote className="mb-3 border-l-4 border-primary pl-4 italic text-muted-foreground">
        {children}
      </blockquote>
    ),
    table: (props) => (
      <div className="mb-4 overflow-x-auto">
        <table {...props} className="w-full border-collapse border border-border text-sm" />
      </div>
    ),
    thead: (props) => <thead {...props} className="bg-muted" />,
    th: (props) => (
      <th
        {...props}
        className="border border-border px-3 py-2 text-left text-xs font-semibold text-foreground"
      />
    ),
    td: (props) => (
      <td {...props} className="border border-border px-3 py-2 text-xs align-top text-foreground" />
    ),
    hr: () => <hr className="my-6 border-border" />,
    code: ({ className, children, ...props }) => {
      const isBlock = className?.includes("language-");
      if (isBlock) {
        return (
          <code {...props} className="block overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs">
            {children}
          </code>
        );
      }
      return (
        <code
          {...props}
          className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-primary"
        >
          {children}
        </code>
      );
    },
  };

  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
      {content}
    </ReactMarkdown>
  );
}
