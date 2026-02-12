'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { PaletteItem } from './palette-item';
import type { UIKitComponentType } from '@/lib/drawing/ui-kit-components';

/**
 * Component categories for organization
 */
const CATEGORIES = {
  inputs: {
    name: 'Inputs',
    components: ['button', 'input', 'dropdown'] as UIKitComponentType[],
  },
  layout: {
    name: 'Layout',
    components: ['card', 'navbar', 'modal', 'tab'] as UIKitComponentType[],
  },
  content: {
    name: 'Content',
    components: ['iconPlaceholder', 'imagePlaceholder', 'listItem'] as UIKitComponentType[],
  },
} as const;

type CategoryKey = keyof typeof CATEGORIES;

/**
 * Categorized palette sidebar with search and draggable UI kit components
 */
export function UIKitPalette() {
  const [activeCategory, setActiveCategory] = useState<CategoryKey>('inputs');
  const [searchQuery, setSearchQuery] = useState('');

  // Get filtered components based on search
  const getFilteredComponents = (): UIKitComponentType[] => {
    const categoryComponents = CATEGORIES[activeCategory].components;

    if (!searchQuery.trim()) {
      return categoryComponents;
    }

    // Search across all categories if query exists
    const allComponents = Object.values(CATEGORIES).flatMap((cat) => cat.components);
    const query = searchQuery.toLowerCase();

    return allComponents.filter((comp) => comp.toLowerCase().includes(query));
  };

  const filteredComponents = getFilteredComponents();

  return (
    <div className="w-56 h-full bg-gray-50 border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">UI Kit</h3>

        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search components..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-md
                     bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex border-b border-gray-200">
        {(Object.keys(CATEGORIES) as CategoryKey[]).map((key) => {
          const category = CATEGORIES[key];
          const isActive = activeCategory === key;

          return (
            <button
              key={key}
              onClick={() => setActiveCategory(key)}
              className={`
                flex-1 px-2 py-2 text-xs font-medium transition-colors
                ${
                  isActive
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900 border-b-2 border-transparent'
                }
              `}
            >
              {category.name}
            </button>
          );
        })}
      </div>

      {/* Scrollable components list */}
      <div className="flex-1 overflow-y-auto p-3">
        {filteredComponents.length > 0 ? (
          <div className="grid grid-cols-1 gap-3">
            {filteredComponents.map((componentType) => (
              <PaletteItem key={componentType} componentType={componentType} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-xs text-gray-400">No components found</p>
          </div>
        )}
      </div>
    </div>
  );
}
