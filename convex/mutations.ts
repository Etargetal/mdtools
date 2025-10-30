// Bulk update products
export const bulkUpdateProducts = mutation({
  args: {
    ids: v.array(v.id("products")),
    status: v.union(v.literal("active"), v.literal("inactive")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    for (const id of args.ids) {
      await ctx.db.patch(id, {
        status: args.status,
        updatedAt: now,
      });
    }
    return { updated: args.ids.length };
  },
});

// Bulk delete products (set to inactive)
export const bulkDeleteProducts = mutation({
  args: {
    ids: v.array(v.id("products")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    for (const id of args.ids) {
      await ctx.db.patch(id, {
        status: "inactive",
        updatedAt: now,
      });
    }
    return { deleted: args.ids.length };
  },
});

// Reorder products
export const reorderProducts = mutation({
  args: {
    orders: v.array(
      v.object({
        id: v.id("products"),
        order: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    for (const item of args.orders) {
      await ctx.db.patch(item.id, {
        order: item.order,
        updatedAt: now,
      });
    }
    return { reordered: args.orders.length };
  },
});

// Delete product (set to inactive)
export const deleteProduct = mutation({
  args: {
    id: v.id("products"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: "inactive",
      updatedAt: Date.now(),
    });
  },
});
