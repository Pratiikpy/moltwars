const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

function parsePagination(query) {
  const limit = Math.min(
    Math.max(parseInt(query.limit, 10) || DEFAULT_LIMIT, 1),
    MAX_LIMIT
  );
  const offset = Math.max(parseInt(query.offset, 10) || 0, 0);
  return { limit, offset };
}

function paginationMeta(total, limit, offset) {
  return {
    total,
    limit,
    offset,
    hasMore: offset + limit < total,
  };
}

module.exports = { parsePagination, paginationMeta };
