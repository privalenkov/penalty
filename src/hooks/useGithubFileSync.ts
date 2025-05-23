import { useCallback, useEffect, useRef, useState } from 'react';

interface GithubCfg {
  owner: string;     // e.g. "kirill-dev"
  repo: string;      // e.g. "penalty-sync"
  token: string;     // Personal Access Token
}

const API = 'https://api.github.com';

export function useGithubFileSync<T>(
  key: string,
  initial: T,
  cfg: GithubCfg,
  pollMs = 15000,
) {
  const path = `data/${key}.json`;
  const headers = {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${cfg.token}`,
  };

  const [data, setData] = useState<T>(initial);
  const shaRef = useRef<string | null>(null);

  const fetchFile = useCallback(async () => {
    if (!cfg.token) return;
    const res = await fetch(
      `${API}/repos/${cfg.owner}/${cfg.repo}/contents/${encodeURIComponent(path)}`,
      { headers },
    );

    if (res.status === 404) return;
    const json = await res.json();
    shaRef.current = json.sha;
    try {
      const decoded = atob(json.content.replace(/\n/g, ''));
      setData(JSON.parse(decoded));
    } catch (err) {
      console.error('Failed to parse JSON from GitHub', err);
    }
  }, [cfg.owner, cfg.repo, path, cfg.token]);

  const pushFile = useCallback(
    async (next: T) => {
      if (!cfg.token) return;
      const body = {
        message: `update ${path}`,
        content: btoa(JSON.stringify(next, null, 2)),
        ...(shaRef.current ? { sha: shaRef.current } : {}),
      };
      const res = await fetch(
        `${API}/repos/${cfg.owner}/${cfg.repo}/contents/${encodeURIComponent(path)}`,
        { method: 'PUT', headers, body: JSON.stringify(body) },
      );

      if (res.ok) {
        const json = await res.json();
        shaRef.current = json.content.sha;
      } else if (res.status === 409) {
        await fetchFile();
        pushFile(next);
      } else {
        console.error('GitHub push failed', await res.text());
      }
    },
    [cfg.owner, cfg.repo, path, headers, fetchFile, cfg.token],
  );

  useEffect(() => {
    fetchFile();
    const id = setInterval(fetchFile, pollMs);
    return () => clearInterval(id);
  }, [fetchFile, pollMs]);

  return {
    data,
    setData,   // local optimisitic update; remember to call pushFile
    pushFile,
  };
}
