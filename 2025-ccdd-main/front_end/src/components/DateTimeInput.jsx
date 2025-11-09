import { useEffect, useMemo, useRef, useState } from 'react';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  getHours,
  getMinutes,
  getMonth,
  getYear,
  isSameDay,
  isValid,
  parseISO,
  setHours,
  setMinutes,
  setMonth,
  setYear,
  startOfMonth,
  startOfWeek
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function formatForDisplay(date, type) {
  if (!date || !isValid(date)) return '';
  return format(date, type === 'datetime-local' ? 'dd/MM/yyyy HH:mm' : 'dd/MM/yyyy');
}

function formatForValue(date, type) {
  if (!date || !isValid(date)) return '';
  return format(date, type === 'datetime-local' ? "yyyy-MM-dd'T'HH:mm" : 'yyyy-MM-dd');
}

function coerceDate(value) {
  if (!value) return null;
  try {
    const parsed = parseISO(value);
    return isValid(parsed) ? parsed : null;
  } catch (error) {
    return null;
  }
}

export default function DateTimeInput({
  value,
  onChange,
  type = 'date',
  placeholder,
  className = '',
  inputClassName = '',
  disabled = false,
  name,
  id
}) {
  const selectedDate = useMemo(() => coerceDate(value), [value]);
  const [open, setOpen] = useState(false);
  const [displayMonth, setDisplayMonth] = useState(() =>
    startOfMonth(selectedDate || new Date())
  );
  const [draftDate, setDraftDate] = useState(() => selectedDate || new Date());
  const inputRef = useRef(null);
  const popoverRef = useRef(null);
  const selectIdBase = useMemo(() => id || name || 'date-time', [id, name]);
  const monthSelectId = `${selectIdBase}-month-select`;
  const yearSelectId = `${selectIdBase}-year-select`;

  useEffect(() => {
    if (!open) return;
    const nextBase = selectedDate || new Date();
    setDraftDate(nextBase);
    setDisplayMonth(startOfMonth(nextBase));
  }, [open, selectedDate]);

  useEffect(() => {
    function handleClick(event) {
      if (!open) return;
      if (
        popoverRef.current?.contains(event.target) ||
        inputRef.current?.contains(event.target)
      ) {
        return;
      }
      setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const daysInView = useMemo(() => {
    const start = startOfWeek(displayMonth, { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(displayMonth), { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start, end });
    const weeks = [];
    for (let index = 0; index < days.length; index += 7) {
      weeks.push(days.slice(index, index + 7));
    }
    return weeks;
  }, [displayMonth]);

  const displayValue = formatForDisplay(selectedDate, type);
  const effectivePlaceholder = placeholder || (type === 'datetime-local' ? 'DD/MM/YYYY HH:mm' : 'DD/MM/YYYY');

  const commitDate = (date, shouldClose = false) => {
    if (!isValid(date)) return;
    const formatted = formatForValue(date, type);
    onChange?.(formatted);
    if (shouldClose) {
      setOpen(false);
    }
  };

  const handleDayClick = (day) => {
    if (type === 'datetime-local') {
      const hours = getHours(draftDate);
      const minutes = getMinutes(draftDate);
      const composed = setMinutes(setHours(day, hours), minutes);
      setDraftDate(composed);
      commitDate(composed);
      return;
    }
    setDraftDate(day);
    commitDate(day, true);
  };

  const changeTime = (unit, nextValue) => {
    setDraftDate((prev) => {
      const base = prev ? new Date(prev) : new Date();
      const updated = unit === 'hour' ? setHours(base, nextValue) : setMinutes(base, nextValue);
      commitDate(updated);
      return updated;
    });
  };

  const clearValue = () => {
    onChange?.('');
    setDraftDate(new Date());
  };

  const hours = useMemo(() => Array.from({ length: 24 }, (_, index) => index), []);
  const minutes = useMemo(() => Array.from({ length: 60 }, (_, index) => index), []);
  const months = useMemo(
    () =>
      Array.from({ length: 12 }, (_, index) => ({
        value: index,
        label: format(new Date(2020, index, 1), 'MMMM')
      })),
    []
  );
  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const start = currentYear - 100;
    const end = currentYear + 20;
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }, []);

  return (
    <div className={`relative ${className}`}>
      <input
        ref={inputRef}
        id={id}
        name={name}
        type="text"
        readOnly
        lang="en-AU"
        disabled={disabled}
        onFocus={() => !disabled && setOpen(true)}
        onClick={() => !disabled && setOpen(true)}
        value={displayValue}
        placeholder={effectivePlaceholder}
        className={`input pr-10 ${inputClassName}`}
      />
      {displayValue && !disabled && (
        <button
          type="button"
          onClick={clearValue}
          className="absolute inset-y-0 right-6 flex items-center text-slate-400 hover:text-slate-600"
          aria-label="Clear date"
        >
          ×
        </button>
      )}
      <button
        type="button"
        onClick={() => !disabled && setOpen((prev) => !prev)}
        className="absolute inset-y-0 right-2 flex items-center text-slate-400 hover:text-slate-600"
        aria-label="Toggle picker"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-4 h-4"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
      </button>
      {open && !disabled && (
        <div
          ref={popoverRef}
          className="absolute z-20 mt-2 w-64 rounded-xl border border-slate-200 bg-white shadow-lg p-3"
        >
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={() => setDisplayMonth((prev) => addMonths(prev, -1))}
              className="p-1 rounded hover:bg-slate-100"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold text-slate-700">
              {format(displayMonth, 'MMMM yyyy')}
            </span>
            <button
              type="button"
              onClick={() => setDisplayMonth((prev) => addMonths(prev, 1))}
              className="p-1 rounded hover:bg-slate-100"
              aria-label="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-2 mb-3">
            <label className="sr-only" htmlFor={monthSelectId}>
              Month
            </label>
            <select
              id={monthSelectId}
              className="input h-9 flex-1"
              value={getMonth(displayMonth)}
              onChange={(event) =>
                setDisplayMonth((prev) =>
                  startOfMonth(setMonth(prev, Number(event.target.value)))
                )
              }
            >
              {months.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
            <label className="sr-only" htmlFor={yearSelectId}>
              Year
            </label>
            <select
              id={yearSelectId}
              className="input h-9 flex-1"
              value={getYear(displayMonth)}
              onChange={(event) =>
                setDisplayMonth((prev) =>
                  startOfMonth(setYear(prev, Number(event.target.value)))
                )
              }
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-7 gap-1 text-xs text-center text-slate-400 mb-1">
            {WEEKDAY_LABELS.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1 text-sm">
            {daysInView.flat().map((day) => {
              const isCurrentMonth = day.getMonth() === displayMonth.getMonth();
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const isDraft = draftDate && isSameDay(day, draftDate);
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => handleDayClick(day)}
                  className={`h-9 rounded-lg border text-center transition-colors ${
                    isSelected
                      ? 'bg-brand-blue text-white border-brand-blue'
                      : isDraft
                      ? 'border-brand-blue/60 text-brand-blue'
                      : 'border-transparent'
                  } ${isCurrentMonth ? 'text-slate-700' : 'text-slate-300'} hover:bg-brand-blue/10`}
                >
                  {format(day, 'd')}
                </button>
              );
            })}
          </div>
          {type === 'datetime-local' && (
            <div className="mt-3 border-t border-slate-200 pt-3">
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-slate-500">Hour</label>
                <select
                  className="input h-9 flex-1"
                  value={getHours(draftDate)}
                  onChange={(event) => changeTime('hour', Number(event.target.value))}
                >
                  {hours.map((hour) => (
                    <option key={`hour-${hour}`} value={hour}>
                      {hour.toString().padStart(2, '0')}
                    </option>
                  ))}
                </select>
                <label className="text-xs font-semibold text-slate-500">Minute</label>
                <select
                  className="input h-9 flex-1"
                  value={getMinutes(draftDate)}
                  onChange={(event) => changeTime('minute', Number(event.target.value))}
                >
                  {minutes.map((minute) => (
                    <option key={`minute-${minute}`} value={minute}>
                      {minute.toString().padStart(2, '0')}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
          <div className="mt-3 flex justify-between text-xs text-brand-blue">
            <button type="button" onClick={clearValue} className="font-semibold">
              Clear
            </button>
            {type === 'date' && (
              <button type="button" onClick={() => setOpen(false)} className="font-semibold">
                Close
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
