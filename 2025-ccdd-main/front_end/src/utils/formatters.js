import { format, parseISO } from 'date-fns';

export function formatDate(date) {
  if (!date) return '';
  const parsed = typeof date === 'string' ? parseISO(date) : date;
  const timestamp = parsed instanceof Date ? parsed.getTime() : NaN;
  if (Number.isNaN(timestamp)) return '';
  return format(parsed, 'dd/MM/yyyy');
}

export function formatDateTime(date) {
  if (!date) return '';
  const parsed = typeof date === 'string' ? parseISO(date) : date;
  const timestamp = parsed instanceof Date ? parsed.getTime() : NaN;
  if (Number.isNaN(timestamp)) return '';
  return format(parsed, 'dd/MM/yyyy HH:mm');
}

function parseToDate(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const isoCandidate = parseISO(trimmed);
    if (!Number.isNaN(isoCandidate.getTime())) return isoCandidate;
    const stringCandidate = new Date(trimmed);
    if (!Number.isNaN(stringCandidate.getTime())) return stringCandidate;
    return null;
  }
  const candidate = new Date(value);
  return Number.isNaN(candidate.getTime()) ? null : candidate;
}

export function formatReactionOnset(startTime, referenceTime) {
  const start = parseToDate(startTime);
  if (!start) return '';
  const reference = referenceTime ? parseToDate(referenceTime) : new Date();
  if (!reference) return '';
  const minutes = Math.round((start.getTime() - reference.getTime()) / 60000);
  if (Number.isNaN(minutes)) return '';
  const absoluteMinutes = Math.max(0, Math.abs(minutes));
  if (absoluteMinutes < 60) {
    return `${absoluteMinutes} min`;
  }
  if (absoluteMinutes < 1440) {
    return `${Math.max(1, Math.round(absoluteMinutes / 60))} hrs`;
  }
  return `${Math.max(1, Math.round(absoluteMinutes / 1440))} days`;
}
