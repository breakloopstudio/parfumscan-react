// __mocks__/@react-native-firebase/firestore.ts
// Mock Firestore in-memory pour tests de la couche service

type WhereClause = { field: string; op: string; value: unknown };
type OrderClause = { field: string; dir: 'asc' | 'desc' };
type LimitClause = { n: number };

let store: Map<string, Map<string, Record<string, unknown>>> = new Map();
let listeners: Array<() => void> = [];

function col(path: string): Map<string, Record<string, unknown>> {
  if (!store.has(path)) store.set(path, new Map());
  return store.get(path)!;
}

export function __resetStore() {
  store = new Map();
}

export function __seedCollection(path: string, docs: Record<string, Record<string, unknown>>) {
  const c = col(path);
  for (const [id, data] of Object.entries(docs)) {
    c.set(id, { ...data });
  }
}

function applyQuery(c: Map<string, Record<string, unknown>>, clauses: unknown[]): Record<string, unknown>[] {
  let results = Array.from(c.entries()).map(([id, data]) => ({ id, ...data }));

  const whereClauses = clauses.filter((cl): cl is WhereClause =>
    typeof cl === 'object' && cl !== null && 'op' in cl && 'field' in cl
  );
  const orderClauses = clauses.filter((cl): cl is OrderClause =>
    typeof cl === 'object' && cl !== null && 'dir' in cl && 'field' in cl
  );
  const limitClauses = clauses.filter((cl): cl is LimitClause =>
    typeof cl === 'object' && cl !== null && 'n' in cl
  );

  for (const w of whereClauses) {
    results = results.filter(doc => {
      const val = doc[w.field];
      if (w.op === '==') return val === w.value;
      if (w.op === '>=') return typeof val === 'string' && typeof w.value === 'string' && val >= w.value;
      if (w.op === '<=') return typeof val === 'string' && typeof w.value === 'string' && val <= w.value;
      if (w.op === 'array-contains') {
        return Array.isArray(val) && val.includes(w.value);
      }
      if (w.op === 'array-contains-any') {
        return Array.isArray(val) && Array.isArray(w.value) && w.value.some((v: unknown) => val.includes(v));
      }
      if (w.op === 'in') {
        return Array.isArray(w.value) && w.value.includes(val);
      }
      return true;
    });
  }

  for (const o of orderClauses) {
    results.sort((a, b) => {
      const va = a[o.field] ?? 0;
      const vb = b[o.field] ?? 0;
      if (typeof va === 'number' && typeof vb === 'number') {
        return o.dir === 'desc' ? vb - va : va - vb;
      }
      if (typeof va === 'string' && typeof vb === 'string') {
        return o.dir === 'desc' ? vb.localeCompare(va) : va.localeCompare(vb);
      }
      return 0;
    });
  }

  if (limitClauses.length > 0) {
    results = results.slice(0, limitClauses[0].n);
  }

  return results;
}

export const getFirestore = () => ({});

export const collection = jest.fn((_db: unknown, path: string) => ({ path }));

export const doc = jest.fn((_col: unknown, ...pathSegments: string[]) => {
  const colPath = typeof _col === 'object' && 'path' in _col ? (_col as { path: string }).path : '';
  if (colPath) {
    const id = pathSegments.join('/');
    return { path: `${colPath}/${id}`, id };
  }
  const id = pathSegments.join('/');
  return { path: id, id };
});

export const getDoc = jest.fn(async (ref: { path: string }) => {
  const parts = ref.path.split('/');
  const docId = parts.pop()!;
  const colPath = parts.join('/');
  const c = store.get(colPath);
  const data = c?.get(docId);
  return {
    exists: !!data,
    id: docId,
    data: () => (data ? { ...data } : undefined),
  };
});

export const setDoc = jest.fn(async (ref: { path: string }, data: Record<string, unknown>, options?: { merge?: boolean }) => {
  const parts = ref.path.split('/');
  const docId = parts.pop()!;
  const colPath = parts.join('/');
  const c = col(colPath);
  if (options?.merge) {
    const existing = c.get(docId) ?? {};
    const resolved: Record<string, unknown> = { ...existing };
    for (const [key, val] of Object.entries(data)) {
      if (typeof val === 'object' && val !== null && '__sentinel' in val && (val as { __sentinel: symbol }).__sentinel === INCREMENT_SENTINEL) {
        const current = typeof resolved[key] === 'number' ? (resolved[key] as number) : 0;
        resolved[key] = current + (val as { n: number }).n;
      } else {
        resolved[key] = val;
      }
    }
    c.set(docId, resolved);
  } else {
    c.set(docId, { ...data });
  }
});

export const deleteDoc = jest.fn(async (ref: { path: string }) => {
  const parts = ref.path.split('/');
  const docId = parts.pop()!;
  const colPath = parts.join('/');
  store.get(colPath)?.delete(docId);
});

export const addDoc = jest.fn(async (colRef: unknown, data: Record<string, unknown>) => {
  const colPath = (colRef as { path: string }).path;
  const c = col(colPath);
  const id = `auto_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  c.set(id, data);
  return { id, path: `${colPath}/${id}` };
});

export const getDocs = jest.fn(async (q: unknown) => {
  const clauses = Array.isArray(q) ? q : [];
  // Find the collection path from the first argument chain
  let colPath = '';
  for (const cl of clauses) {
    if (typeof cl === 'object' && cl !== null && 'path' in cl) {
      colPath = (cl as { path: string }).path;
      break;
    }
  }
  const c = store.get(colPath) ?? new Map();
  const results = applyQuery(c, clauses);
  return {
    empty: results.length === 0,
    docs: results.map(r => {
      const { id, ...data } = r;
      return { id, data: () => ({ ...data }) };
    }),
    forEach: (fn: (doc: { id: string; data: () => Record<string, unknown> }) => void) => {
      for (const r of results) {
        const { id, ...data } = r;
        fn({ id, data: () => ({ ...data }) });
      }
    },
  };
});

export const query = jest.fn((...args: unknown[]) => args);

export const where = jest.fn((field: string, op: string, value: unknown) => ({
  field, op, value,
}));

export const orderBy = jest.fn((field: string, dir?: string) => ({
  field, dir: dir || 'asc',
}));

export const limit = jest.fn((n: number) => ({ n }));

export const writeBatch = jest.fn((_db?: unknown) => {
  const ops: Array<{ type: 'set' | 'update' | 'delete'; ref: { path: string }; data?: Record<string, unknown>; options?: { merge?: boolean } }> = [];
  return {
    set: jest.fn((ref: { path: string }, data: Record<string, unknown>, options?: { merge?: boolean }) => {
      ops.push({ type: 'set', ref, data, options });
      return { path: ref.path };
    }),
    update: jest.fn((ref: { path: string }, data: Record<string, unknown>) => {
      ops.push({ type: 'update', ref, data });
      return { path: ref.path };
    }),
    delete: jest.fn((ref: { path: string }) => {
      ops.push({ type: 'delete', ref });
      return { path: ref.path };
    }),
    commit: jest.fn(async () => {
      for (const op of ops) {
        if (op.type === 'delete') {
          await (deleteDoc as jest.Mock)(op.ref);
        } else if (op.type === 'set') {
          await (setDoc as jest.Mock)(op.ref, op.data!, op.options);
        } else if (op.type === 'update') {
          await (setDoc as jest.Mock)(op.ref, op.data!, { merge: true });
        }
      }
    }),
  };
});

export const onSnapshot = jest.fn((_q: unknown, cb: (snap: unknown) => void, errCb?: (err: Error) => void) => {
  const unsub = () => {};
  listeners.push(unsub);
  return unsub;
});

export const Timestamp = {
  now: () => ({ toDate: () => new Date(), seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 }),
  fromDate: (d: Date) => ({ toDate: () => d, seconds: Math.floor(d.getTime() / 1000), nanoseconds: 0 }),
};

const INCREMENT_SENTINEL = Symbol('FieldValue.increment');

export const FieldValue = {
  increment: (n: number) => ({ __sentinel: INCREMENT_SENTINEL, n }),
};
