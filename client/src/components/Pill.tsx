import type { ListItemWithDetails } from '@nomnom/shared';

interface PillProps {
  item: ListItemWithDetails;
  onCheck: () => void;
  onRemove: () => void;
}

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

export default function Pill({ item, onCheck, onRemove }: PillProps) {
  const color = item.category.color;
  const rgb = hexToRgb(color);

  if (item.is_checked) {
    return (
      <button
        onClick={onCheck}
        className="pill pill-checked"
      >
        <span>{item.item.name}</span>
        {item.quantity && item.quantity !== '1' && (
          <span className="ml-1 text-xs opacity-50">&times;{item.quantity}</span>
        )}
      </button>
    );
  }

  return (
    <div className="group relative inline-flex">
      <button
        onClick={onCheck}
        className="pill"
        style={{
          backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)`,
          color: color,
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
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-gray-400 text-white text-xs leading-none flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
      >
        &times;
      </button>
    </div>
  );
}
