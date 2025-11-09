import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cycleSortOrder } from '../utils/sorting.js';

const tableTheme = {
  headerBg: 'bg-role-recorder/60 text-brand-blue',
  border: 'border-brand-blue/30',
  hover: 'hover:bg-role-recorder/40',
  label: 'text-brand-blue',
  icon: 'text-brand-blue/80',
  hoverAccent: 'hover:text-brand-blue',
  activeSort: 'text-brand-blue',
  activeFilter: 'text-brand-blue'
};

export default function DataTable({
  columns,
  data,
  sortState,
  onSortChange,
  filters = {},
  onFilterChange,
  onRowClick,
  getRowClassName,
  emptyMessage = 'No records found.'
}) {
  const [openFilter, setOpenFilter] = useState(null);
  const activeFilterColumn = useMemo(
    () => (openFilter ? columns.find((column) => column.key === openFilter.key) : null),
    [openFilter, columns]
  );
  const theme = tableTheme;

  const headers = useMemo(
    () =>
      columns.map((col) => {
        const sort = sortState?.key === col.key ? sortState?.direction : 'none';
        const hasFilter = Array.isArray(col.filterOptions);
        const filterValue = filters?.[col.key];
        return { ...col, sort, hasFilter, filterValue };
      }),
    [columns, sortState, filters]
  );

  const handleSort = (column) => {
    if (!column.sortable) return;
    const next = cycleSortOrder(sortState, column.key);
    onSortChange?.(next);
  };

  const handleFilterSelect = (columnKey, value) => {
    onFilterChange?.({ ...filters, [columnKey]: value });
    setOpenFilter(null);
  };

  return (
    <div className={`border rounded-lg shadow-sm bg-white/95 relative ${theme.border}`}>
      <div className="overflow-x-auto overflow-y-visible">
        <table className="min-w-[640px] w-full divide-y divide-slate-200">
        <thead className={`${theme.headerBg}`}>
          <tr>
            {headers.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={`px-4 py-3 text-xs uppercase tracking-wide ${alignmentClass(column.align)}`}
              >
                <div className={`flex items-center gap-2 relative ${justifyClass(column.align)}`}>
                  <span className={`font-semibold ${theme.label}`}>{column.label}</span>
                  {column.sortable && (
                    <button
                      type="button"
                      onClick={() => handleSort(column)}
                      className={`${theme.icon} ${theme.hoverAccent}`}
                    >
                      <div className="flex flex-col leading-none">
                        <ChevronUp
                          className={`w-3 h-3 ${column.sort === 'asc' ? theme.activeSort : ''}`}
                          strokeWidth={2.4}
                        />
                        <ChevronDown
                          className={`w-3 h-3 -mt-1 ${column.sort === 'desc' ? theme.activeSort : ''}`}
                          strokeWidth={2.4}
                        />
                      </div>
                    </button>
                  )}
                  {column.hasFilter && (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={(event) => {
                          const rect = event.currentTarget.getBoundingClientRect();
                          setOpenFilter((prev) =>
                            prev?.key === column.key
                              ? null
                              : { key: column.key, rect, anchor: event.currentTarget }
                          );
                        }}
                        className={`flex items-center gap-1 ${theme.icon} ${theme.hoverAccent} text-xs ${
                          column.filterValue ? theme.activeFilter : ''
                        }`}
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-slate-100">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-6 text-center text-sm text-slate-500">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row) => {
              const rowClass = getRowClassName?.(row);
              return (
                <tr
                  key={row.id || row.key || JSON.stringify(row)}
                  className={`${theme.hover} transition text-sm ${
                    onRowClick ? 'cursor-pointer' : ''
                  } ${rowClass || ''}`}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={`px-4 py-3 whitespace-nowrap ${alignmentClass(column.align)}`}
                    >
                      {column.render ? column.render(row[column.key], row) : row[column.key]}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
        </table>
      </div>
      {openFilter && activeFilterColumn?.filterOptions && (
        <FilterPopover
          columnKey={activeFilterColumn.key}
          options={activeFilterColumn.filterOptions}
          selected={filters?.[activeFilterColumn.key]}
          onSelect={handleFilterSelect}
          onClose={() => setOpenFilter(null)}
          anchorRect={openFilter.rect}
          anchorEl={openFilter.anchor}
        />
      )}
    </div>
  );
}

function FilterPopover({ columnKey, options, selected, onSelect, onClose, anchorRect, anchorEl }) {
  const popoverRef = useRef(null);

  useEffect(() => {
    function handleClick(event) {
      if (popoverRef.current?.contains(event.target)) return;
      if (anchorEl?.contains(event.target)) return;
      onClose();
    }
    function handleScroll() {
      onClose();
    }
    document.addEventListener('mousedown', handleClick);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, [onClose, anchorEl]);

  if (!anchorRect) return null;

  const maxLeft = window.innerWidth - 180;
  const left = Math.min(anchorRect.left, maxLeft);
  const top = anchorRect.bottom + 8;

  return createPortal(
    <div
      ref={popoverRef}
      className="fixed bg-white border border-slate-200 rounded-md shadow-lg z-[2000] w-44"
      style={{ top, left }}
    >
      <button
        type="button"
        onClick={() => onSelect(columnKey, undefined)}
        className="block w-full text-left px-4 py-2 text-sm hover:bg-slate-100"
      >
        Clear filter
      </button>
      <div className="border-t border-slate-100" />
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onSelect(columnKey, option)}
          className={`block w-full text-left px-4 py-2 text-sm hover:bg-slate-100 ${
            selected === option ? 'bg-slate-100 font-semibold' : ''
          }`}
        >
          {option}
        </button>
      ))}
    </div>,
    document.body
  );
}

function alignmentClass(align) {
  if (align === 'left') return 'text-left';
  if (align === 'center') return 'text-center';
  return 'text-right';
}

function justifyClass(align) {
  if (align === 'left') return 'justify-start';
  if (align === 'center') return 'justify-center';
  return 'justify-end';
}
