import { useEffect, useRef } from 'react';
import { useLocation, useSearch } from 'wouter';
import { useSearchState } from '@/hooks/use-search-state';

/** Preserve old activity/deep links without maintaining a second search form. */
export default function NameSearch() {
  const [, setLocation] = useLocation();
  const params = useSearch();
  const { runSearch } = useSearchState();
  const redirected = useRef(false);
  useEffect(() => {
    if (redirected.current) return;
    redirected.current = true;
    const query = new URLSearchParams(params).get('q');
    if (query?.trim()) runSearch(query);
    setLocation('/', { replace: true });
  }, [params, runSearch, setLocation]);
  return null;
}
