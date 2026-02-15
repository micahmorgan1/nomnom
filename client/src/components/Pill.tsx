import { useRef, useCallback } from 'react';
import type { ListItemWithDetails } from '@nomnom/shared';
import { hexToRgb, getTextColor } from '@/lib/colorUtils';

export type PillVariant = 'active' | 'inactive';

interface PillProps {
  item: ListItemWithDetails;
  variant?: PillVariant;
  onCheck: () => void;
  onRemove: () => void;
  onEdit?: () => void;
}

const LONG_PRESS_MS = 500;

export default function Pill({ item, variant = 'active', onCheck, onRemove, onEdit }: PillProps) {
  const color = item.category.color;
  const rgb = hexToRgb(color);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);

  const startPress = useCallback(() => {
    didLongPress.current = false;
    if (variant === 'active' && onEdit) {
      pressTimer.current = setTimeout(() => {
        didLongPress.current = true;
        onEdit();
      }, LONG_PRESS_MS);
    }
  }, [variant, onEdit]);

  const endPress = useCallback(() => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  }, []);

  const handleClick = useCallback(() => {
    if (didLongPress.current) return;
    onCheck();
  }, [onCheck]);

  const textColor = getTextColor(color);

  if (variant === 'inactive') {
    return (
      <div className="group relative inline-flex">
        <button
          onClick={onCheck}
          className="pill"
          style={{
            backgroundColor: 'transparent',
            border: `2px solid ${color}`,
            color: textColor,
            opacity: 0.6,
          }}
        >
          <span>{item.item.name}</span>
          {item.quantity && item.quantity !== '1' && (
            <span className="ml-1 text-xs opacity-70">&times;{item.quantity}</span>
          )}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-xs leading-none flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        >
          &times;
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleClick}
      onMouseDown={startPress}
      onMouseUp={endPress}
      onMouseLeave={endPress}
      onTouchStart={startPress}
      onTouchEnd={endPress}
      onTouchCancel={endPress}
      onContextMenu={(e) => e.preventDefault()}
      className="pill"
      style={{
        backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)`,
        color: textColor,
      }}
    >
      <span className="font-medium">{item.item.name}</span>
      {item.quantity && item.quantity !== '1' && (
        <span className="ml-1.5 text-xs opacity-70 font-normal">&times;{item.quantity}</span>
      )}
      {item.notes && (
        <span className="ml-1.5 text-xs opacity-50 font-normal">({item.notes})</span>
      )}
    </button>
  );
}
