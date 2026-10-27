export const createDirectoryReader = (client, base, viewKey) => {
  const declaration = base.views.find((view) => view.key === viewKey);
  const primarySlug = base.fields[0].slug;
  if (!declaration) throw new Error(`SCHEMA_INCOMPLETE: ${viewKey} view is missing`);
  let viewPromise;
  const resolveView = () => viewPromise ||= client.bases.listViews({ baseId: base.baseId }).then((views) => {
    const view = views.find((item) => declaration.viewId
      ? item.id === declaration.viewId
      : item.slug === declaration.key);
    const sort = view?.config?.sorts?.[0];
    if (!view || view.config?.filters?.length || sort?.fieldSlug !== primarySlug || sort.direction !== "asc") {
      throw new Error(`SCHEMA_INCOMPLETE: ${viewKey} needs an unfiltered ascending ${primarySlug} sort`);
    }
    return view.id;
  });

  return async ({ cursor, query = "", filter = null } = {}) => {
    const scope = cursor ? JSON.parse(cursor) : { page: 1, query: query.trim(), filter };
    const filters = [
      ...(scope.query ? [{ fieldSlug: primarySlug, operator: "contains", value: scope.query }] : []),
      ...(scope.filter ? [{ fieldSlug: scope.filter.fieldSlug, operator: "equals", value: scope.filter.value }] : []),
    ];
    const page = await client.records.listPage({
      baseId: base.baseId,
      viewId: await resolveView(),
      page: scope.page,
      pageSize: base.readLimit,
      ...(filters.length ? { filters } : {}),
    });
    return {
      records: page.records,
      nextCursor: page.page < page.totalPages ? JSON.stringify({ ...scope, page: page.page + 1 }) : null,
      limit: base.readLimit,
    };
  };
};
