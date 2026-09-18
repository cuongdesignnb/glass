'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import { useEffect, useRef } from 'react';
import { FiBold, FiItalic, FiUnderline, FiList, FiAlignLeft, FiAlignCenter, FiAlignRight, FiLink, FiImage, FiMinus, FiCode } from 'react-icons/fi';
import RichImage from './RichImageExtension';

interface RichEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  onMediaPick?: (insertImage: (url: string, alt?: string, caption?: string) => void) => void;
}

export default function RichEditor({ content, onChange, placeholder = 'Viết nội dung tại đây...', onMediaPick }: RichEditorProps) {
  const onMediaPickRef = useRef(onMediaPick);

  useEffect(() => {
    onMediaPickRef.current = onMediaPick;
  }, [onMediaPick]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Highlight,
      Placeholder.configure({ placeholder }),
      Link.configure({ openOnClick: false }),
      RichImage.configure({
        onReplace: ({ editor: currentEditor, getPos, node }) => {
          const picker = onMediaPickRef.current;
          if (!picker) return;

          picker((url: string, alt?: string, caption?: string) => {
            const nextAlt = (alt || '').trim();
            if (!url || !nextAlt) {
              if (url && !nextAlt) alert('Vui lòng nhập Alt ảnh.');
              return;
            }

            const position = getPos();
            currentEditor.chain().focus().command(({ tr }) => {
              const currentNode = tr.doc.nodeAt(position);
              if (!currentNode || currentNode.type.name !== 'richImage') return false;
              tr.setNodeMarkup(position, undefined, {
                ...currentNode.attrs,
                src: url,
                alt: nextAlt,
                caption: (caption || '').trim(),
              });
              return true;
            }).run();
          });
        },
      }),
    ],
    content: content || '',
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'tiptap-content',
      },
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content || '');
    }
  }, [content]);

  if (!editor) return <div className="skeleton" style={{ height: '300px', borderRadius: '8px' }} />;

  const addLink = () => {
    const previousUrl = editor.getAttributes('link').href || '';
    const editingExistingLink = editor.isActive('link');
    const url = prompt(editingExistingLink ? 'Sửa URL:' : 'Nhập URL:', previousUrl);

    // Cancel must leave both the selection and the existing mark untouched.
    if (url === null) return;

    const nextUrl = url.trim();
    const chain = editor.chain().focus().extendMarkRange('link');

    // An empty URL means remove the link rather than emitting href="".
    if (!nextUrl) {
      if (editingExistingLink) chain.unsetLink().run();
      return;
    }

    chain.setLink({ href: nextUrl }).run();
  };

  const insertRichImage = (url: string, alt?: string, caption?: string) => {
    const nextAlt = (alt || '').trim();
    if (!url) return;
    if (!nextAlt) {
      alert('Vui lòng nhập Alt ảnh.');
      return;
    }

    editor.chain().focus().insertContent({
      type: 'richImage',
      attrs: {
        src: url,
        alt: nextAlt,
        caption: (caption || '').trim(),
        align: 'center',
      },
    }).run();
  };

  const addImage = () => {
    if (onMediaPick) {
      onMediaPick(insertRichImage);
    } else {
      const url = prompt('Nhập URL ảnh:');
      if (url) {
        const alt = prompt('Nhập mô tả ảnh (alt):');
        if (!alt || !alt.trim()) {
          alert('Vui lòng nhập Alt ảnh.');
          return;
        }
        const caption = prompt('Nhập chú thích ảnh (không bắt buộc):') || '';
        insertRichImage(url, alt, caption);
      }
    }
  };

  return (
    <div className="tiptap-editor">
      <div className="tiptap-toolbar">
        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive('bold') ? 'is-active' : ''} title="Bold"><FiBold /></button>
        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive('italic') ? 'is-active' : ''} title="Italic"><FiItalic /></button>
        <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={editor.isActive('underline') ? 'is-active' : ''} title="Underline"><FiUnderline /></button>
        <button type="button" onClick={() => editor.chain().focus().toggleHighlight().run()}
          className={editor.isActive('highlight') ? 'is-active' : ''} title="Highlight">H</button>
        
        <div className="separator" />

        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={editor.isActive('heading', { level: 2 }) ? 'is-active' : ''} title="Heading 2"
          style={{ fontWeight: 700, fontSize: '0.75rem' }}>H2</button>
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={editor.isActive('heading', { level: 3 }) ? 'is-active' : ''} title="Heading 3"
          style={{ fontWeight: 700, fontSize: '0.75rem' }}>H3</button>

        <div className="separator" />

        <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive('bulletList') ? 'is-active' : ''} title="Bullet List"><FiList /></button>
        <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={editor.isActive('orderedList') ? 'is-active' : ''} title="Numbered List">1.</button>
        <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={editor.isActive('blockquote') ? 'is-active' : ''} title="Quote">"</button>
        <button type="button" onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={editor.isActive('codeBlock') ? 'is-active' : ''} title="Code"><FiCode /></button>

        <div className="separator" />

        <button type="button" onClick={() => editor.chain().focus().setTextAlign('left').run()}
          className={editor.isActive({ textAlign: 'left' }) ? 'is-active' : ''} title="Căn trái"><FiAlignLeft /></button>
        <button type="button" onClick={() => editor.chain().focus().setTextAlign('center').run()}
          className={editor.isActive({ textAlign: 'center' }) ? 'is-active' : ''} title="Căn giữa"><FiAlignCenter /></button>
        <button type="button" onClick={() => editor.chain().focus().setTextAlign('right').run()}
          className={editor.isActive({ textAlign: 'right' }) ? 'is-active' : ''} title="Căn phải"><FiAlignRight /></button>

        <div className="separator" />

        <button
          type="button"
          onClick={addLink}
          className={editor.isActive('link') ? 'is-active' : ''}
          title={editor.isActive('link') ? 'Sửa link' : 'Thêm link'}
          aria-label={editor.isActive('link') ? 'Sửa link' : 'Thêm link'}
        >
          <FiLink />
        </button>
        <button type="button" onClick={addImage} title="Thêm ảnh"><FiImage /></button>
        <button type="button" onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Đường kẻ"><FiMinus /></button>
      </div>

      <EditorContent editor={editor} />
    </div>
  );
}
