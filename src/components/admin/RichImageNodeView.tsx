'use client';

import { useEffect, useState } from 'react';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { FiAlignCenter, FiAlignLeft, FiAlignRight, FiEdit2, FiRefreshCw, FiTrash2 } from 'react-icons/fi';
import type { RichImageAlign } from './RichImageExtension';

const ALIGNMENT_BUTTONS: Array<{ value: RichImageAlign; label: string; icon: React.ReactNode }> = [
  { value: 'left', label: 'Căn trái', icon: <FiAlignLeft /> },
  { value: 'center', label: 'Căn giữa', icon: <FiAlignCenter /> },
  { value: 'right', label: 'Căn phải', icon: <FiAlignRight /> },
];

function stopToolbarMouseDown(event: React.MouseEvent) {
  event.preventDefault();
  event.stopPropagation();
}

function stopPanelMouseDown(event: React.MouseEvent) {
  // Let inputs receive their native focus/cursor behavior. The panel is
  // already outside the editable document selection, so only propagation
  // needs to be stopped here.
  event.stopPropagation();
}

export default function RichImageNodeView({ node, editor, selected, getPos, extension }: NodeViewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [alt, setAlt] = useState(String(node.attrs.alt || ''));
  const [caption, setCaption] = useState(String(node.attrs.caption || ''));
  const [error, setError] = useState('');
  const align = (node.attrs.align || 'center') as RichImageAlign;

  useEffect(() => {
    setAlt(String(node.attrs.alt || ''));
    setCaption(String(node.attrs.caption || ''));
  }, [node.attrs.src, node.attrs.alt, node.attrs.caption]);

  const updateAlignment = (nextAlign: RichImageAlign) => {
    editor.chain().focus().updateAttributes('richImage', { align: nextAlign }).run();
  };

  const saveDetails = () => {
    const nextAlt = alt.trim();
    if (!nextAlt) {
      setError('Vui lòng nhập Alt ảnh.');
      return;
    }

    editor.chain().focus().updateAttributes('richImage', {
      alt: nextAlt,
      caption: caption.trim(),
    }).run();
    setError('');
    setIsEditing(false);
  };

  const replaceImage = () => {
    if (typeof getPos !== 'function') return;
    extension.options.onReplace?.({ editor, getPos, node });
  };

  const deleteImage = () => {
    editor.chain().focus().deleteNode('richImage').run();
  };

  const openEditPanel = () => {
    setAlt(String(node.attrs.alt || ''));
    setCaption(String(node.attrs.caption || ''));
    setError('');
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setAlt(String(node.attrs.alt || ''));
    setCaption(String(node.attrs.caption || ''));
    setError('');
    setIsEditing(false);
  };

  return (
    <NodeViewWrapper
      className={`rich-image-node-view${selected ? ' is-selected' : ''}`}
      data-rich-image-node="true"
      data-align={align}
      contentEditable={false}
    >
      <figure
        className={`article-image article-image--${align}`}
        data-type="rich-image"
        data-align={align}
      >
        <img
          src={node.attrs.src}
          alt={node.attrs.alt || ''}
          draggable={false}
          contentEditable={false}
        />
        {String(node.attrs.caption || '').trim() && (
          <figcaption>{String(node.attrs.caption).trim()}</figcaption>
        )}
      </figure>

      {selected && (
        <div
          className="rich-image-context-toolbar"
          role="toolbar"
          aria-label="Tùy chỉnh ảnh"
          onMouseDown={stopToolbarMouseDown}
          contentEditable={false}
        >
          {ALIGNMENT_BUTTONS.map(button => (
            <button
              key={button.value}
              type="button"
              className={align === button.value ? 'is-active' : ''}
              onClick={() => updateAlignment(button.value)}
              title={button.label}
              aria-label={button.label}
            >
              {button.icon}
            </button>
          ))}
          <span className="rich-image-context-toolbar__separator" aria-hidden="true" />
          <button type="button" onClick={openEditPanel} title="Sửa ảnh" aria-label="Sửa ảnh">
            <FiEdit2 /> <span>Sửa ảnh</span>
          </button>
          <button type="button" onClick={replaceImage} title="Thay ảnh" aria-label="Thay ảnh">
            <FiRefreshCw /> <span>Thay ảnh</span>
          </button>
          <button type="button" onClick={deleteImage} title="Xóa ảnh" aria-label="Xóa ảnh">
            <FiTrash2 /> <span>Xóa ảnh</span>
          </button>
        </div>
      )}

      {selected && isEditing && (
        <div className="rich-image-edit-panel" role="dialog" aria-label="Thông tin ảnh" onMouseDown={stopPanelMouseDown} contentEditable={false}>
          <div className="rich-image-edit-panel__title">Thông tin ảnh</div>
          <label>
            ALT ảnh *
            <input
              value={alt}
              onChange={event => { setAlt(event.target.value); setError(''); }}
              aria-label="ALT ảnh"
              autoFocus
            />
          </label>
          <label>
            Chú thích ảnh
            <input
              value={caption}
              onChange={event => setCaption(event.target.value)}
              aria-label="Chú thích ảnh"
            />
          </label>
          {error && <div className="rich-image-edit-panel__error" role="alert">{error}</div>}
          <div className="rich-image-edit-panel__actions">
            <button type="button" onClick={cancelEdit}>Hủy</button>
            <button type="button" className="is-primary" onClick={saveDetails}>Lưu thay đổi</button>
          </div>
        </div>
      )}
    </NodeViewWrapper>
  );
}
