import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { CategoryOption } from '../../utils/categoryTree';
import styles from './searchableTreeSelect.module.scss';

type SearchableTreeSelectProps = {
  id: string;
  label?: string;
  value: number | '';
  options: CategoryOption[];
  onChange: (value: number | '') => void;
  placeholder?: string;
  emptyText?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  required?: boolean;
  leafOnly?: boolean;
  error?: string;
};

const SearchableTreeSelect: React.FC<SearchableTreeSelectProps> = ({
  id,
  label,
  value,
  options,
  onChange,
  placeholder = 'Select category',
  emptyText = 'No categories found',
  searchPlaceholder = 'Search categories...',
  disabled = false,
  required = false,
  error,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selectedOption = useMemo(() => options.find((option) => option.id === value), [options, value]);

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return options.filter((option) => {
      if (!normalizedQuery) return true;

      return (
        option.name.toLowerCase().includes(normalizedQuery) ||
        option.label.toLowerCase().includes(normalizedQuery) ||
        option.searchText.includes(normalizedQuery) ||
        (option.path ?? '').toLowerCase().includes(normalizedQuery)
      );
    });
  }, [options, query]);

  useEffect(() => {
    if (!open) return;

    const timeoutId = window.setTimeout(() => {
      searchInputRef.current?.focus();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [open]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const handleSelect = (optionId: number) => {
    onChange(optionId);
    setOpen(false);
    setQuery('');
  };

  const toggleOpen = () => {
    if (disabled) return;
    setOpen((prev) => !prev);
  };

  return (
    <div className={styles.field} ref={containerRef}>
      {label ? (
        <label htmlFor={id} className={styles.label}>
          {label}
        </label>
      ) : null}

      <button
        id={id}
        type="button"
        className={`${styles.trigger} ${error ? styles.triggerError : ''}`}
        onClick={toggleOpen}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-required={required}
      >
        <span className={selectedOption ? styles.value : styles.placeholder}>
          {selectedOption ? selectedOption.breadcrumb : placeholder}
        </span>
        <span className={styles.chevron}>▾</span>
      </button>

      {open ? (
        <div className={styles.dropdown}>
          <div className={styles.searchWrap}>
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className={styles.searchInput}
            />
          </div>

          <div className={styles.options} role="listbox" aria-labelledby={id}>
            {filteredOptions.length === 0 ? (
              <div className={styles.empty}>{emptyText}</div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = option.id === value;

                return (
                  <button
                    key={option.id}
                    type="button"
                    className={`${styles.option} ${isSelected ? styles.optionSelected : ''}`}
                    onClick={() => handleSelect(option.id)}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <span
                      className={`${styles.optionLabel} ${!option.isLeaf ? styles.optionLabelParent : ''}`}
                      style={{ paddingLeft: `${option.level * 14}px` }}
                    >
                      {option.label}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}

      {error ? <p className={styles.error}>{error}</p> : null}
    </div>
  );
};

export default SearchableTreeSelect;
