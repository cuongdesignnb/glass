'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { useEffect } from 'react';
import { FiBold, FiItalic, FiUnderline, FiList, FiAlignLeft, FiAlignCenter, FiAlignRight, FiLink, FiImage, FiMinus, FiCode } from 'react-icons/fi';

interface RichEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  onMediaPick?: (insertImage: (url: string) => void) => void;
}

export default function RichEditor({ content, onChange, placeholder = 'Viết nội dung tại đây...', onMediaPick }: RichEditorProps) {
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
      Image,
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
    const url = prompt('Nhập URL:');
    if (url) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }
  };

  const addImage = () => {
    if (onMediaPick) {
      onMediaPick((url: string) => {
        if (url) {
          editor.chain().focus().setImage({ src: url }).run();
        }
      });
    } else {
      const url = prompt('Nhập URL ảnh:');
      if (url) {
        editor.chain().focus().setImage({ src: url }).run();
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

        <button type="button" onClick={addLink} title="Thêm link"><FiLink /></button>
        <button type="button" onClick={addImage} title="Thêm ảnh"><FiImage /></button>
        <button type="button" onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Đường kẻ"><FiMinus /></button>
      </div>

      <EditorContent editor={editor} />
    </div>
  );
}
