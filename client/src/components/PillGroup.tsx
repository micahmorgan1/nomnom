import type { ListItemWithDetails } from '@nomnom/shared';
import Pill from './Pill';

interface PillGroupProps {
  categoryName: string;
  categoryColor: string;
  items: ListItemWithDetails[];
  onCheckItem: (id: number, checked: boolean) => void;
  onRemoveItem: (id: number) => void;
}

export default function PillGroup({ categoryName, categoryColor, items, onCheckItem, onRemoveItem }: PillGroupProps) {
  if (items.length === 0) return null;

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: categoryColor }}
        />
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          {categoryName}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <Pill
            key={item.id}
            item={item}
            onCheck={() => onCheckItem(item.id, !item.is_checked)}
            onRemove={() => onRemoveItem(item.id)}
          />
        ))}
      </div>
    </div>
  );
}
