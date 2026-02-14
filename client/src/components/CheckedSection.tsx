import { useState } from 'react';
import type { ListItemWithDetails } from '@nomnom/shared';
import Pill from './Pill';

interface CheckedSectionProps {
  items: ListItemWithDetails[];
  onUncheck: (id: number) => void;
  onRemove: (id: number) => void;
  onClearAll: () => void;
}

export default function CheckedSection({ items, onUncheck, onRemove, onClearAll }: CheckedSectionProps) {
  const [expanded, setExpanded] = useState(false);

  if (items.length === 0) return null;

  return (
    <div className="mt-6 border-t border-gray-200 pt-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-sm text-gray-500 w-full"
      >
        <svg
          className={`w-4 h-4 transition-transform ${expanded ? 'rotate-90' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span>{items.length} checked item{items.length !== 1 ? 's' : ''}</span>
      </button>

      {expanded && (
        <div className="mt-3">
          <div className="flex flex-wrap gap-2">
            {items.map((item) => (
              <Pill
                key={item.id}
                item={item}
                onCheck={() => onUncheck(item.id)}
                onRemove={() => onRemove(item.id)}
              />
            ))}
          </div>
          <button
            onClick={onClearAll}
            className="mt-3 text-xs text-red-400 hover:text-red-600 transition-colors"
          >
            Clear all checked
          </button>
        </div>
      )}
    </div>
  );
}
