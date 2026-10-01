import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext.jsx';

/**
 * The child a page shows: a student's own card, or the child a parent picked.
 * `fromParams` keeps the choice in the address (?child=), so links can point to one child.
 */
export function useChild({ fromParams = false } = {}) {
  const { children } = useApp();
  const [params, setParams] = useSearchParams();
  const [local, setLocal] = useState(null);
  const want = fromParams ? params.get('child') : local;
  const child = children.find((c) => c.id === want) || children[0] || null;
  const setChildId = fromParams ? (v) => setParams({ child: v }, { replace: true }) : setLocal;
  return {
    child,
    childId: child?.id ?? null,
    setChildId,
    children,
    many: children.length > 1,
    options: children.map((c) => ({ value: c.id, label: `${c.name} · ${c.className}` })),
  };
}
