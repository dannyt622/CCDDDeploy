export function cycleSortOrder(current, key) {
  if (!current || current.key !== key) {
    return { key, direction: 'desc' };
  }
  if (current.direction === 'desc') {
    return { key, direction: 'asc' };
  }
  if (current.direction === 'asc') {
    return null;
  }
  return { key, direction: 'desc' };
}

export function sortData(data, sortState, accessor = (row, key) => row[key]) {
  if (!sortState) return data;
  const { key, direction } = sortState;
  if (!key || !direction) return data;
  const sorted = [...data].sort((a, b) => compareValues(accessor(a, key), accessor(b, key)));
  return direction === 'desc' ? sorted.reverse() : sorted;
}

function compareValues(a, b) {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (isDateString(a) && isDateString(b)) {
    return new Date(a).getTime() - new Date(b).getTime();
  }
  const numA = Number(a);
  const numB = Number(b);
  const bothNumeric = !Number.isNaN(numA) && !Number.isNaN(numB);
  if (bothNumeric) {
    return numA - numB;
  }
  return String(a).localeCompare(String(b));
}

function isDateString(value) {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}
