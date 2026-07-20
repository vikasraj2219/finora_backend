// Shared pagination helper used by every list endpoint.
const getPaginationParams = (query) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 100);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

const buildPaginationMeta = (totalItems, page, limit) => ({
  totalItems,
  totalPages: Math.ceil(totalItems / limit) || 1,
  currentPage: page,
  pageSize: limit,
});

module.exports = { getPaginationParams, buildPaginationMeta };
