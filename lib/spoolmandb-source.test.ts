import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SPOOLMANDB_REF,
  DEFAULT_SPOOLMANDB_REPO,
  isValidSlug,
  spoolmandbSource,
} from '@/lib/spoolmandb-source';

describe('isValidSlug', () => {
  it.each(['bambulab', 'bambu-lab', '3djake', 'AmazonBasics', 'fill_a_mentum'])(
    'accepts upstream file name %s',
    (slug) => expect(isValidSlug(slug)).toBe(true)
  );

  it.each([
    '',
    '../x',
    '..',
    'a/b',
    'a?b',
    'a#b',
    '%2e%2e',
    'a.json',
    '-leading-dash',
    ' bambulab',
    'a\\b',
  ])('rejects %j', (slug) => expect(isValidSlug(slug)).toBe(false));
});

describe('spoolmandbSource', () => {
  it('defaults to the upstream community repo on main', () => {
    const s = spoolmandbSource({});
    expect(s.repo).toBe(DEFAULT_SPOOLMANDB_REPO);
    expect(s.ref).toBe(DEFAULT_SPOOLMANDB_REF);
    expect(s.repoUrl).toBe(
      'https://github.com/Icezaza2543/SpoolmanDB-Community'
    );
    expect(s.manufacturerListUrl).toBe(
      'https://api.github.com/repos/Icezaza2543/SpoolmanDB-Community/contents/filaments?ref=main'
    );
    expect(s.manufacturerFileUrl('bambulab')).toBe(
      'https://raw.githubusercontent.com/Icezaza2543/SpoolmanDB-Community/main/filaments/bambulab.json'
    );
  });

  it('treats empty variables as unset', () => {
    const s = spoolmandbSource({ SPOOLMANDB_REPO: '', SPOOLMANDB_REF: ' ' });
    expect(s.repo).toBe(DEFAULT_SPOOLMANDB_REPO);
    expect(s.ref).toBe(DEFAULT_SPOOLMANDB_REF);
  });

  it('derives every URL from a configured fork and pinned commit', () => {
    const sha = '0123456789abcdef0123456789abcdef01234567';
    const s = spoolmandbSource({
      SPOOLMANDB_REPO: 'me/SpoolmanDB-Fork',
      SPOOLMANDB_REF: sha,
    });
    expect(s.repoUrl).toBe('https://github.com/me/SpoolmanDB-Fork');
    expect(s.manufacturerListUrl).toBe(
      `https://api.github.com/repos/me/SpoolmanDB-Fork/contents/filaments?ref=${sha}`
    );
    expect(s.manufacturerFileUrl('prusament')).toBe(
      `https://raw.githubusercontent.com/me/SpoolmanDB-Fork/${sha}/filaments/prusament.json`
    );
  });

  it('accepts a branch name with slashes', () => {
    const s = spoolmandbSource({ SPOOLMANDB_REF: 'release/2026-11' });
    expect(s.manufacturerListUrl).toMatch(/\?ref=release%2F2026-11$/);
    expect(s.manufacturerFileUrl('x')).toContain('/release/2026-11/filaments/');
  });

  it.each([
    'owner',
    'owner/repo/extra',
    '../repo',
    'owner/..',
    'owner/.',
    './repo',
    'o w/r',
    'evil.com:80/x',
  ])('rejects SPOOLMANDB_REPO=%j', (repo) =>
    expect(() => spoolmandbSource({ SPOOLMANDB_REPO: repo })).toThrow(
      /SPOOLMANDB_REPO/
    )
  );

  it.each(['../main', 'main/..', '/main', 'main?x', 'main#x', 'a b'])(
    'rejects SPOOLMANDB_REF=%j',
    (ref) =>
      expect(() => spoolmandbSource({ SPOOLMANDB_REF: ref })).toThrow(
        /SPOOLMANDB_REF/
      )
  );

  it('refuses to build a file URL for an invalid slug', () => {
    expect(() => spoolmandbSource({}).manufacturerFileUrl('../x')).toThrow(
      /Invalid manufacturer slug/
    );
  });
});
