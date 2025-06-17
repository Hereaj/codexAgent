
import React from 'react';
import './SkeletonLoader.css';

const SkeletonLoader = ({ type = 'card', count = 3 }) => {
  const skeletons = Array.from({ length: count }, (_, i) => i);

  if (type === 'hero') {
    return (
      <div className="skeleton-hero">
        <div className="skeleton-line skeleton-title"></div>
        <div className="skeleton-line skeleton-subtitle"></div>
      </div>
    );
  }

  if (type === 'card') {
    return (
      <div className="skeleton-grid">
        {skeletons.map(i => (
          <div key={i} className="skeleton-card">
            <div className="skeleton-line skeleton-category"></div>
            <div className="skeleton-line skeleton-title"></div>
            <div className="skeleton-line skeleton-text"></div>
            <div className="skeleton-line skeleton-text short"></div>
            <div className="skeleton-tags">
              <div className="skeleton-tag"></div>
              <div className="skeleton-tag"></div>
              <div className="skeleton-tag"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return null;
};

export default SkeletonLoader;
