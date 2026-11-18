// Where the SpoolmanDB importer (lib/spoolmandb.ts) reads its source files.
// The GitHub repo and git ref are configurable — SPOOLMANDB_REPO / SPOOLMANDB_REF,
// defaulting to the community repo's main branch — and every URL is derived from
// those two, so the manufacturer list and the files can't come from different
// places. Pinning SPOOLMANDB_REF to a commit sha freezes the import source.
//
// Kept free of DB imports so it can be unit-tested (lib/spoolmandb-source.test.ts).

export const DEFAULT_SPOOLMANDB_REPO = 'Icezaza2543/SpoolmanDB-Community';
export const DEFAULT_SPOOLMANDB_REF = 'main';

// Upstream file names (filaments/<slug>.json) — all 491 at the time of writing
// match this, including mixed-case ones like "AmazonBasics". A slug ends up in a
// fetch URL path, so nothing that can steer the request (/, ., ?, #, %) is let
// through (code-scanning alert js/request-forgery).
export const SLUG_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;

export function isValidSlug(slug: string): boolean {
  return SLUG_PATTERN.test(slug);
}

const REPO_PATTERN = /^[A-Za-z0-9-]+\/[A-Za-z0-9_.-]+$/;
const REF_PATTERN = /^[A-Za-z0-9_.-]+(\/[A-Za-z0-9_.-]+)*$/;
// "." / ".." segments would be collapsed by URL parsing and shift the path.
const hasDotSegment = (path: string) =>
  path.split('/').some((s) => /^\.+$/.test(s));

export type SpoolmandbSource = {
  repo: string;
  ref: string;
  // Human-facing project page (linked from /admin/import).
  repoUrl: string;
  // GitHub contents API listing of filaments/ (60 unauthenticated req/h).
  manufacturerListUrl: string;
  manufacturerFileUrl: (slug: string) => string;
};

// Resolves the source from the environment. Throws on a malformed value rather
// than building an unexpected URL; empty variables count as unset.
export function spoolmandbSource(
  env: Record<string, string | undefined> = process.env
): SpoolmandbSource {
  const repo = env.SPOOLMANDB_REPO?.trim() || DEFAULT_SPOOLMANDB_REPO;
  const ref = env.SPOOLMANDB_REF?.trim() || DEFAULT_SPOOLMANDB_REF;
  if (!REPO_PATTERN.test(repo) || hasDotSegment(repo))
    throw new Error(
      `SPOOLMANDB_REPO must be "<owner>/<repo>" on GitHub, got "${repo}"`
    );
  if (!REF_PATTERN.test(ref) || hasDotSegment(ref))
    throw new Error(
      `SPOOLMANDB_REF must be a branch, tag or commit sha, got "${ref}"`
    );

  return {
    repo,
    ref,
    repoUrl: `https://github.com/${repo}`,
    manufacturerListUrl: `https://api.github.com/repos/${repo}/contents/filaments?ref=${encodeURIComponent(ref)}`,
    manufacturerFileUrl: (slug) => {
      if (!isValidSlug(slug))
        throw new Error(`Invalid manufacturer slug "${slug}"`);
      return `https://raw.githubusercontent.com/${repo}/${ref}/filaments/${slug}.json`;
    },
  };
}
