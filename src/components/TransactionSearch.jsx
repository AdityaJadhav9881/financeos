import { useState, useCallback } from 'react';
import { premiumInput } from '../utils/styles';

export default function TransactionSearch({ onSearch, onTypeFilter, onCategoryFilter, categories }) {
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const handleSearch = useCallback((value) => {
    setQuery(value);
    onSearch(value);
  }, [onSearch]);

  const handleTypeFilter = useCallback((value) => {
    setTypeFilter(value);
    onTypeFilter(value);
  }, [onTypeFilter]);

  const handleCategoryFilter = useCallback((value) => {
    setCategoryFilter(value);
    onCategoryFilter(value);
  }, [onCategoryFilter]);

  return (
    <div className="flex flex-wrap gap-3">
      <div className="relative min-w-[200px] flex-1">
        <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          className={`${premiumInput} w-full pl-9 pr-4 py-2.5 text-sm placeholder:text-zinc-600`}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search transactions..."
          type="text"
          value={query}
        />
      </div>

      <select
        className={`${premiumInput} px-3 py-2.5 text-sm`}
        onChange={(e) => handleTypeFilter(e.target.value)}
        value={typeFilter}
      >
        <option value="all" className="bg-[#111]">All Types</option>
        <option value="expense" className="bg-[#111]">Expense</option>
        <option value="income" className="bg-[#111]">Income</option>
      </select>

      <select
        className={`${premiumInput} px-3 py-2.5 text-sm`}
        onChange={(e) => handleCategoryFilter(e.target.value)}
        value={categoryFilter}
      >
        <option value="all" className="bg-[#111]">All Categories</option>
        {categories.map((cat) => (
          <option key={cat} value={cat} className="bg-[#111]">{cat}</option>
        ))}
      </select>
    </div>
  );
}
