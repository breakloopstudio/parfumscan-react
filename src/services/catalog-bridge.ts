// État partagé minimal pour passer une query du Scan vers le Catalogue
let _pendingQuery: string | null = null;
export function setPendingCatalogQuery(q: string) { _pendingQuery = q; }
export function consumePendingCatalogQuery(): string | null {
  const q = _pendingQuery;
  _pendingQuery = null;
  return q;
}