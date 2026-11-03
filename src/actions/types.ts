/** Shape every server action returns. Never throw across the boundary, except to redirect(). */
export type ActionResult<T = undefined> = { success: true; data: T } | { success: false; error: string };
