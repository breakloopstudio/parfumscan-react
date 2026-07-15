// État partagé minimal pour passer une query du Scan vers le Catalogue
// + pont pour passer les données parfum du Catalogue vers la fiche détail

import type { ParfumSearchResult } from './fragella';
import type { Parfum } from '../models';

let _pendingQuery: string | null = null;
let _pendingParfum: ParfumSearchResult | Parfum | null = null;

export function setPendingCatalogQuery(q: string) { _pendingQuery = q; }
export function consumePendingCatalogQuery(): string | null {
  const q = _pendingQuery;
  _pendingQuery = null;
  return q;
}

export function setPendingParfum(p: ParfumSearchResult | Parfum) {
  console.log('[bridge] setPendingParfum:', p.id, p.marque, p.nom);
  _pendingParfum = p;
}
export function consumePendingParfum(): ParfumSearchResult | Parfum | null {
  const p = _pendingParfum;
  _pendingParfum = null;
  console.log('[bridge] consumePendingParfum:', p?.id, p ? (p as any).marque : 'null');
  return p;
}