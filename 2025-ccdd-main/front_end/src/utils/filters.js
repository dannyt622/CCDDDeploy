export function applyFilters(data, filters = {}, predicateMap = {}) {
  const activeEntries = Object.entries(filters).filter(([, value]) => value);
  if (activeEntries.length === 0) return data;
  return data.filter((item) =>
    activeEntries.every(([key, value]) => {
      const predicate = predicateMap[key];
      if (typeof predicate === 'function') {
        return predicate(item, value);
      }
      return item[key] === value;
    })
  );
}
