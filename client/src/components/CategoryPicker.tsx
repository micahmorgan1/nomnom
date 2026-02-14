import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { Category } from '@nomnom/shared';

interface CategoryPickerProps {
  selected: number | null;
  onSelect: (id: number) => void;
}

export default function CategoryPicker({ selected, onSelect }: CategoryPickerProps) {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    api.get<Category[]>('/categories').then(setCategories).catch(() => {});
  }, []);

  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onSelect(cat.id)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
            selected === cat.id
              ? 'border-gray-800 ring-1 ring-gray-800'
              : 'border-gray-200 hover:border-gray-300'
          }`}
          style={{
            backgroundColor: selected === cat.id ? cat.color + '25' : undefined,
            color: selected === cat.id ? cat.color : '#6b7280',
          }}
        >
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: cat.color }}
          />
          {cat.name}
        </button>
      ))}
    </div>
  );
}
