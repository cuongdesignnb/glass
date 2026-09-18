import { Node, mergeAttributes } from '@tiptap/core';
import type { Editor } from '@tiptap/core';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { ReactNodeViewRenderer } from '@tiptap/react';
import RichImageNodeView from './RichImageNodeView';

export type RichImageAlign = 'left' | 'center' | 'right';

export interface RichImageAttributes {
  src: string;
  alt: string;
  caption: string;
  align: RichImageAlign;
}

export interface RichImageReplaceContext {
  editor: Editor;
  getPos: () => number;
  node: ProseMirrorNode;
}

export interface RichImageOptions {
  onReplace?: (context: RichImageReplaceContext) => void;
}

const ALIGNMENTS: RichImageAlign[] = ['left', 'center', 'right'];

export function normalizeRichImageAlign(value: unknown): RichImageAlign {
  return ALIGNMENTS.includes(value as RichImageAlign) ? value as RichImageAlign : 'center';
}

function readRichImageAttrs(element: HTMLElement): RichImageAttributes | false {
  const image = element.tagName.toLowerCase() === 'img'
    ? element as HTMLImageElement
    : element.querySelector('img');

  if (!image) return false;

  const src = image.getAttribute('src') || '';
  if (!src) return false;

  const figureCaption = element.querySelector('figcaption')?.textContent?.trim() || '';
  const legacyCaption = image.getAttribute('title')?.trim() || '';
  const dataAlign = element.getAttribute('data-align');
  const classAlign = Array.from(element.classList)
    .find(className => className.startsWith('article-image--'))
    ?.replace('article-image--', '');

  return {
    src,
    alt: image.getAttribute('alt') || '',
    caption: figureCaption || legacyCaption,
    align: normalizeRichImageAlign(dataAlign || classAlign),
  };
}

const RichImage = Node.create<RichImageOptions>({
  name: 'richImage',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,

  addOptions() {
    return {
      onReplace: undefined,
    };
  },

  addAttributes() {
    return {
      src: { default: '' },
      alt: { default: '' },
      caption: { default: '' },
      align: {
        default: 'center',
        parseHTML: (element: HTMLElement) => normalizeRichImageAlign(element.getAttribute('data-align')),
      },
    };
  },

  parseHTML() {
    return [
      // New semantic image blocks are parsed before the nested <img> rule.
      { tag: 'figure[data-type="rich-image"]', getAttrs: element => readRichImageAttrs(element as HTMLElement) },
      { tag: 'figure.article-image', getAttrs: element => readRichImageAttrs(element as HTMLElement) },
      // Legacy content used title as the caption. Keep it when the article is opened and saved.
      { tag: 'img', getAttrs: element => readRichImageAttrs(element as HTMLElement) },
    ];
  },

  renderHTML({ node }) {
    const align = normalizeRichImageAlign(node.attrs.align);
    const caption = String(node.attrs.caption || '').trim();
    const figureAttrs = mergeAttributes({
      class: `article-image article-image--${align}`,
      'data-type': 'rich-image',
      'data-align': align,
    });

    const children: any[] = [[
      'img',
      {
        src: node.attrs.src || '',
        alt: node.attrs.alt || '',
      },
    ]];

    if (caption) {
      children.push(['figcaption', {}, caption]);
    }

    return ['figure', figureAttrs, ...children];
  },

  addNodeView() {
    return ReactNodeViewRenderer(RichImageNodeView, {
      as: 'div',
      className: 'rich-image-node-view',
    });
  },
});

export default RichImage;
