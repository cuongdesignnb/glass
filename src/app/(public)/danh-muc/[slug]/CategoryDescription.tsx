'use client';

import { useState } from 'react';

type CategoryDescriptionProps = {
  content: string;
  isHtml: boolean;
};

export default function CategoryDescription({ content, isHtml }: CategoryDescriptionProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`category-description category-description--${expanded ? 'expanded' : 'collapsed'}`}>
      <div className="category-description__content">
        {isHtml ? <div dangerouslySetInnerHTML={{ __html: content }} /> : <p>{content}</p>}
      </div>
      <button
        type="button"
        className="category-description__toggle"
        onClick={() => setExpanded(value => !value)}
        aria-expanded={expanded}
      >
        {expanded ? 'Thu gọn' : 'Xem thêm'}
      </button>
    </div>
  );
}
