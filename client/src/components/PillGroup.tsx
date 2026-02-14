import type { ListItemWithDetails } from '@nomnom/shared';
import Pill, { type PillVariant } from './Pill';

interface PillGroupProps {
  categoryName: string;
  categoryColor: string;
  items: ListItemWithDetails[];
  variant?: PillVariant;
  onCheckItem: (id: number, checked: boolean) => void;
  onRemoveItem: (id: number) => void;
  onEditItem?: (item: ListItemWithDetails) => void;
}

export default function PillGroup({ categoryName, categoryColor, items, variant = 'active', onCheckItem, onRemoveItem, onEditItem }: PillGroupProps) {
  if (items.length === 0) return null;

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: categoryColor, opacity: variant === 'inactive' ? 0.5 : 1 }}
        />
        <span
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: variant === 'inactive' ? '#9ca3af' : '#6b7280' }}
        >
          {categoryName}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <Pill
            key={item.id}
            item={item}
            variant={variant}
            onCheck={() => onCheckItem(item.id, !item.is_checked)}
            onRemove={() => onRemoveItem(item.id)}
            onEdit={onEditItem ? () => onEditItem(item) : undefined}
          />
        ))}
      </div>
    </div>
  );
}
