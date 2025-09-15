import React, { useState } from 'react';
import { useDiscoveryStore } from '../../../stores/discoveryStore';
import { ServerCategory } from '@/shared/types/mcp-discovery';

export const SearchAndFilter: React.FC = () => {
  const { filter, setFilter, catalog } = useDiscoveryStore();
  const [showFilters, setShowFilters] = useState(false);

  const categories: ServerCategory[] = [
    'AI & Language Models',
    'Development Tools',
    'Data & Analytics',
    'Productivity',
    'File Management',
    'APIs & Integration',
    'Security',
    'Communication',
    'Custom',
    'Other'
  ];

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilter({ searchText: e.target.value });
  };

  const handleCategoryToggle = (category: string) => {
    const currentCategories = filter.categories || [];
    const newCategories = currentCategories.includes(category)
      ? currentCategories.filter(c => c !== category)
      : [...currentCategories, category];

    setFilter({ categories: newCategories });
  };

  const handleSortChange = (sortBy: string) => {
    setFilter({ sortBy: sortBy as any });
  };

  const handleToggleInstalled = () => {
    setFilter({ showInstalled: !filter.showInstalled });
  };

  const clearFilters = () => {
    setFilter({
      searchText: '',
      categories: [],
      tags: [],
      showInstalled: false,
      sortBy: 'downloads',
      sortOrder: 'desc'
    });
  };

  const activeFilterCount =
    (filter.categories?.length || 0) +
    (filter.tags?.length || 0) +
    (filter.showInstalled ? 1 : 0);

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <input
            type="text"
            className="input input-bordered w-full pl-10"
            placeholder="Search servers by name, description, or tags..."
            value={filter.searchText || ''}
            onChange={handleSearchChange}
          />
          <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`btn ${showFilters ? 'btn-primary' : 'btn-ghost'}`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
          Filters
          {activeFilterCount > 0 && (
            <span className="badge badge-sm badge-primary ml-1">{activeFilterCount}</span>
          )}
        </button>
      </div>

      {/* Expanded Filters */}
      {showFilters && (
        <div className="bg-base-200 rounded-lg p-4 space-y-4">
          {/* Categories */}
          <div>
            <h4 className="font-semibold mb-2 text-sm">Categories</h4>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => handleCategoryToggle(category)}
                  className={`btn btn-sm ${
                    filter.categories?.includes(category) ? 'btn-primary' : 'btn-ghost'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Sort Options */}
          <div className="flex items-center gap-4">
            <div>
              <label className="label">
                <span className="label-text text-sm">Sort by</span>
              </label>
              <select
                className="select select-sm select-bordered"
                value={filter.sortBy || 'downloads'}
                onChange={(e) => handleSortChange(e.target.value)}
              >
                <option value="downloads">Downloads</option>
                <option value="stars">Stars</option>
                <option value="name">Name</option>
                <option value="date">Last Updated</option>
              </select>
            </div>

            <div>
              <label className="label">
                <span className="label-text text-sm">Order</span>
              </label>
              <select
                className="select select-sm select-bordered"
                value={filter.sortOrder || 'desc'}
                onChange={(e) => setFilter({ sortOrder: e.target.value as 'asc' | 'desc' })}
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>

            <div className="flex-1"></div>

            {/* Show Installed Toggle */}
            <div className="form-control">
              <label className="label cursor-pointer">
                <span className="label-text mr-2">Show installed only</span>
                <input
                  type="checkbox"
                  className="toggle toggle-primary toggle-sm"
                  checked={filter.showInstalled || false}
                  onChange={handleToggleInstalled}
                />
              </label>
            </div>

            {/* Clear Filters */}
            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="btn btn-ghost btn-sm"
              >
                Clear all
              </button>
            )}
          </div>
        </div>
      )}

      {/* Active Filter Summary */}
      {!showFilters && activeFilterCount > 0 && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-base-content/60">Active filters:</span>
          {filter.categories && filter.categories.length > 0 && (
            <span className="badge badge-sm">
              {filter.categories.length} {filter.categories.length === 1 ? 'category' : 'categories'}
            </span>
          )}
          {filter.showInstalled && (
            <span className="badge badge-sm">Installed only</span>
          )}
          <button
            onClick={clearFilters}
            className="link link-primary text-sm"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
};