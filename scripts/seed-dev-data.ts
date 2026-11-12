// Dev seed: a lived-in Spoolhouse for local development and demos.
//
// Seeds, around the main user (the first admin, or --email):
//  - test users (password below): a borrower, a trusted contributor, a
//    blacklist/whitelist sharer, a casual member, a fresh account with nothing,
//    and a banned one — so /admin/users and every empty state have something.
//  - its own small catalog (spool types + materials across all filament types,
//    incl. pending/rejected requests for the review queues) — no SpoolmanDB
//    import needed. Catalog rows carry `externalKey` `seed:…`.
//  - datasheet properties: the migration-seeded definitions plus a few extra,
//    verified values and unverified wiki edits by non-admins.
//  - a year of spools per user with a realistic weighing history (seasonal
//    usage, used-up spools, repurchases), prices, locations, drying dates.
//    Every seeded spool has a `seed-<n>` tag.
//  - three groups with all/whitelist/blacklist share modes, and lends in every
//    state (requested, active, returned, declined, a cancelled request) with
//    matching weighings, lend weights and notifications (read and unread).
//  - an API token for the main user (plaintext printed once).
//
// Deterministic (seeded PRNG), so re-seeding produces the same charts.
// Usage: npm run db:seed -- [--email you@x] [--reset | --clean] [--allow-remote]
//   --reset         remove previously seeded data, then seed again
//   --clean         only remove previously seeded data
//   --allow-remote  run even though DATABASE_URL / DATABASE_PASSWORD_FILE is
//                   set (refused by default: never seed a real database)
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { and, eq, inArray, like, notExists, or } from 'drizzle-orm';
import { hashPassword } from 'better-auth/crypto';
import { closeDb, db, runMigrations } from '../lib/db';
import { materialLabel } from '../lib/filament';
import {
  isPropertyValueType,
  normalizePropertyValue,
} from '../lib/property-value';
import { withLocalDb } from './local-db.mjs';
import {
  account,
  apiTokens,
  filamentShareOverrides,
  groupMembers,
  groups,
  lends,
  materialProperties,
  materials,
  notifications,
  properties,
  spools,
  spoolTypes,
  spoolWeighings,
  user,
} from '../lib/db/schema';

const PASSWORD = 'testuser12345';
const CATALOG_KEY = 'seed:';
const TAG_PREFIX = 'seed-'; // also matches the old seed-usage-history tags
const TOKEN_NAME = 'Seeded scale (dev)';
const DAY_MS = 24 * 60 * 60 * 1000;

// ─── Deterministic randomness ────────────────────────────────────────────────

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(42);
const between = (min: number, max: number) => min + rand() * (max - min);

// ─── Users ───────────────────────────────────────────────────────────────────

type UserKey = 'main' | 'bob' | 'alice' | 'carla' | 'dan' | 'eve' | 'mallory';

const USERS: {
  key: Exclude<UserKey, 'main'>;
  email: string;
  name: string;
  joinedDaysAgo: number;
  trusted?: boolean;
  banned?: string;
}[] = [
  {
    key: 'bob',
    email: 'bob@example.com',
    name: 'Bob Borrower',
    joinedDaysAgo: 330,
  },
  {
    key: 'alice',
    email: 'alice@example.com',
    name: 'Alice Maker',
    joinedDaysAgo: 300,
    trusted: true,
  },
  {
    key: 'carla',
    email: 'carla@example.com',
    name: 'Carla Chen',
    joinedDaysAgo: 240,
  },
  {
    key: 'dan',
    email: 'dan@example.com',
    name: 'Dan Dryer',
    joinedDaysAgo: 320,
  },
  // No spools, no groups: every empty state.
  {
    key: 'eve',
    email: 'eve@example.com',
    name: 'Eve Newcomer',
    joinedDaysAgo: 2,
  },
  {
    key: 'mallory',
    email: 'mallory@example.com',
    name: 'Mallory Spam',
    joinedDaysAgo: 60,
    banned: 'Spam catalog requests',
  },
];

// ─── Catalog ─────────────────────────────────────────────────────────────────

type Status = 'approved' | 'pending' | 'rejected';

const SPOOL_TYPES: Record<
  string,
  {
    manufacturer: string;
    name: string;
    grams: number;
    status?: Status;
    by?: UserKey;
  }
> = {
  prusament: {
    manufacturer: 'Prusament',
    name: 'Prusament 1 kg spool',
    grams: 193,
  },
  polymaker: {
    manufacturer: 'Polymaker',
    name: 'Polymaker 1 kg cardboard spool',
    grams: 140,
  },
  esun: { manufacturer: 'eSun', name: 'eSun 1 kg plastic spool', grams: 224 },
  sunlu: {
    manufacturer: 'Sunlu',
    name: 'Sunlu 1 kg plastic spool',
    grams: 165,
  },
  bambu: {
    manufacturer: 'Bambu Lab',
    name: 'Bambu Lab reusable spool',
    grams: 250,
  },
  spectrum: {
    manufacturer: 'Spectrum',
    name: 'Spectrum 1 kg spool',
    grams: 230,
  },
  fiberlogy: {
    manufacturer: 'Fiberlogy',
    name: 'Fiberlogy 850 g spool',
    grams: 260,
  },
  // Pending: usable by their submitter only, waiting in /admin/spool-types/review.
  eryone: {
    manufacturer: 'Eryone',
    name: 'Eryone 1 kg cardboard spool',
    grams: 150,
    status: 'pending',
    by: 'alice',
  },
  elegoo: {
    manufacturer: 'Elegoo',
    name: 'Elegoo 1 kg cardboard spool',
    grams: 155,
    status: 'pending',
    by: 'carla',
  },
  mystery: {
    manufacturer: 'Generic',
    name: 'Mystery spool',
    grams: 999,
    status: 'rejected',
    by: 'mallory',
  },
};

const MATERIALS: Record<
  string,
  {
    manufacturer: string;
    name: string;
    type: string;
    color: string | null;
    status?: Status;
    by?: UserKey;
  }
> = {
  'prusa-galaxy-black': {
    manufacturer: 'Prusament',
    name: 'Galaxy Black',
    type: 'PLA',
    color: '#2b2b33',
  },
  'prusa-jet-black': {
    manufacturer: 'Prusament',
    name: 'Jet Black',
    type: 'PETG',
    color: '#111111',
  },
  'prusa-orange': {
    manufacturer: 'Prusament',
    name: 'Prusa Orange',
    type: 'PETG',
    color: '#fa6831',
  },
  'prusa-lipstick': {
    manufacturer: 'Prusament',
    name: 'Lipstick Red',
    type: 'ASA',
    color: '#b0122b',
  },
  'prusa-pc-blend': {
    manufacturer: 'Prusament',
    name: 'PC Blend Natural',
    type: 'PC',
    color: '#e8e4d8',
  },
  'spectrum-deep-blue': {
    manufacturer: 'Spectrum',
    name: 'Deep Blue',
    type: 'PLA',
    color: '#1d3d8f',
  },
  'spectrum-forest': {
    manufacturer: 'Spectrum',
    name: 'Forest Green',
    type: 'PETG',
    color: '#2e6b3a',
  },
  'spectrum-traffic-black': {
    manufacturer: 'Spectrum',
    name: 'Traffic Black',
    type: 'ASA',
    color: '#1c1c1c',
  },
  'sunlu-silk-gold': {
    manufacturer: 'Sunlu',
    name: 'Silk Gold',
    type: 'PLA',
    color: '#d4a72c',
  },
  'sunlu-white': {
    manufacturer: 'Sunlu',
    name: 'White',
    type: 'PLA',
    color: '#f4f4f0',
  },
  'sunlu-grey': {
    manufacturer: 'Sunlu',
    name: 'Grey',
    type: 'ABS',
    color: '#7d7f82',
  },
  'poly-sakura': {
    manufacturer: 'Polymaker',
    name: 'PolyTerra Sakura Pink',
    type: 'PLA',
    color: '#f2a7b8',
  },
  'poly-teal': {
    manufacturer: 'Polymaker',
    name: 'PolyLite Teal',
    type: 'PETG',
    color: '#1b8a8f',
  },
  'poly-flex-black': {
    manufacturer: 'Polymaker',
    name: 'PolyFlex TPU95 Black',
    type: 'TPU',
    color: '#151515',
  },
  'poly-nylon': {
    manufacturer: 'Polymaker',
    name: 'PolyMide CoPA Natural',
    type: 'Nylon',
    color: '#efe9d9',
  },
  'poly-pva': {
    manufacturer: 'Polymaker',
    name: 'PolyDissolve S1',
    type: 'PVA',
    color: '#f6f1d5',
  },
  'esun-signal-white': {
    manufacturer: 'eSun',
    name: 'Signal White',
    type: 'PETG',
    color: '#f5f5f0',
  },
  'esun-cold-white': {
    manufacturer: 'eSun',
    name: 'PLA+ Cold White',
    type: 'PLA',
    color: '#f8fbff',
  },
  'esun-fire-red': {
    manufacturer: 'eSun',
    name: 'PLA+ Fire Engine Red',
    type: 'PLA',
    color: '#c8102e',
  },
  'esun-hips': {
    manufacturer: 'eSun',
    name: 'HIPS Natural',
    type: 'HIPS',
    color: '#ece8dc',
  },
  'bambu-charcoal': {
    manufacturer: 'Bambu Lab',
    name: 'PLA Matte Charcoal',
    type: 'PLA',
    color: '#3b3b3b',
  },
  'bambu-cyan': {
    manufacturer: 'Bambu Lab',
    name: 'PLA Basic Cyan',
    type: 'PLA',
    color: '#0086d6',
  },
  'fiberlogy-graphite': {
    manufacturer: 'Fiberlogy',
    name: 'Easy PETG Graphite',
    type: 'PETG',
    color: '#41434a',
  },
  // Trusted contributor: auto-approved, reviewed by herself.
  'eryone-rainbow': {
    manufacturer: 'Eryone',
    name: 'Silk Rainbow',
    type: 'PLA',
    color: null,
    by: 'alice',
  },
  // Review queue (/admin/materials/review).
  'elegoo-rapid-blue': {
    manufacturer: 'Elegoo',
    name: 'Rapid PLA+ Blue',
    type: 'PLA',
    color: '#2453c4',
    status: 'pending',
    by: 'carla',
  },
  'jayo-orange': {
    manufacturer: 'Jayo',
    name: 'PETG Orange',
    type: 'PETG',
    color: '#f07f13',
    status: 'pending',
    by: 'bob',
  },
  'prusa-galaxy-black-dupe': {
    manufacturer: 'Prusament',
    name: 'Galaxy Black PLA',
    type: 'PLA',
    color: '#2a2a30',
    status: 'pending',
    by: 'dan',
  },
  'generic-mystery': {
    manufacturer: 'Generic',
    name: 'Mystery Filament',
    type: 'Other',
    color: '#999999',
    status: 'rejected',
    by: 'mallory',
  },
};

// ─── Properties ──────────────────────────────────────────────────────────────

// Definitions beyond the five that migrations seed (density, diameter,
// extruder_temp, bed_temp, drying_temp). Inserted if missing, never removed.
const EXTRA_PROPERTIES = [
  {
    key: 'tensile_strength',
    name: 'Tensile strength',
    unit: 'MPa',
    valueType: 'number',
    description: 'Ultimate tensile strength (XY)',
  },
  {
    key: 'heat_deflection_temp',
    name: 'Heat deflection temp',
    unit: '°C',
    valueType: 'integer',
    description: 'HDT at 0.45 MPa',
  },
  {
    key: 'max_volumetric_speed',
    name: 'Max volumetric speed',
    unit: 'mm³/s',
    valueType: 'number',
    description: 'Highest reliable flow rate',
  },
  {
    key: 'shore_hardness',
    name: 'Shore hardness',
    unit: null,
    valueType: 'text',
    description: 'For flexible filaments',
  },
];

// Typical datasheet values per filament type, written as verified values.
const TYPE_PROPERTIES: Record<string, Record<string, string>> = {
  PLA: {
    density: '1.24',
    diameter: '1.75, 2.85',
    extruder_temp: '190–220',
    bed_temp: '50–60',
    drying_temp: '45–55',
    tensile_strength: '60',
    heat_deflection_temp: '55',
    max_volumetric_speed: '15',
  },
  PETG: {
    density: '1.27',
    diameter: '1.75, 2.85',
    extruder_temp: '230–250',
    bed_temp: '70–85',
    drying_temp: '60–65',
    tensile_strength: '50',
    heat_deflection_temp: '70',
    max_volumetric_speed: '12',
  },
  ABS: {
    density: '1.04',
    diameter: '1.75',
    extruder_temp: '240–260',
    bed_temp: '95–110',
    drying_temp: '75–80',
    tensile_strength: '40',
    heat_deflection_temp: '95',
  },
  ASA: {
    density: '1.07',
    diameter: '1.75',
    extruder_temp: '240–260',
    bed_temp: '90–110',
    drying_temp: '75–80',
    tensile_strength: '45',
    heat_deflection_temp: '95',
  },
  TPU: {
    density: '1.21',
    diameter: '1.75',
    extruder_temp: '220–240',
    bed_temp: '40–60',
    drying_temp: '50–55',
    tensile_strength: '35',
    shore_hardness: '95A',
  },
  Nylon: {
    density: '1.14',
    diameter: '1.75',
    extruder_temp: '250–280',
    bed_temp: '70–90',
    drying_temp: '75–80',
    tensile_strength: '70',
    heat_deflection_temp: '120',
  },
  PC: {
    density: '1.20',
    diameter: '1.75',
    extruder_temp: '260–290',
    bed_temp: '100–120',
    drying_temp: '80–90',
    tensile_strength: '62',
    heat_deflection_temp: '115',
  },
  PVA: {
    density: '1.23',
    diameter: '1.75',
    extruder_temp: '190–210',
    bed_temp: '50–60',
    drying_temp: '45–55',
  },
  HIPS: {
    density: '1.04',
    diameter: '1.75',
    extruder_temp: '230–245',
    bed_temp: '90–110',
    drying_temp: '60–70',
    tensile_strength: '26',
    heat_deflection_temp: '90',
  },
};

// Materials left without any datasheet values (gaps to fill in the UI).
const NO_PROPERTIES = new Set([
  'esun-hips',
  'jayo-orange',
  'generic-mystery',
  'prusa-galaxy-black-dupe',
]);

// Wiki edits on top of the defaults. Non-admin edits stay unverified; raw input
// goes through normalizePropertyValue like the real action (hyphen → en dash,
// decimal comma → dot).
const PROPERTY_EDITS: {
  mat: string;
  key: string;
  value: string;
  by: UserKey;
}[] = [
  { mat: 'sunlu-silk-gold', key: 'extruder_temp', value: '210-230', by: 'bob' },
  {
    mat: 'prusa-galaxy-black',
    key: 'tensile_strength',
    value: '57,3',
    by: 'alice',
  },
  { mat: 'bambu-cyan', key: 'max_volumetric_speed', value: '21', by: 'dan' },
  { mat: 'poly-nylon', key: 'drying_temp', value: '80 to 90', by: 'carla' },
  {
    mat: 'elegoo-rapid-blue',
    key: 'extruder_temp',
    value: '200–230',
    by: 'carla',
  },
  {
    mat: 'prusa-pc-blend',
    key: 'heat_deflection_temp',
    value: '113',
    by: 'main',
  },
];

// ─── Spools ──────────────────────────────────────────────────────────────────

type SpoolSpec = {
  ref?: string; // name for lends below
  mat: string;
  type: string; // spool type key
  startDaysAgo: number;
  gramsPerDay: number;
  price: number | null; // cents
  location: string | null;
  full?: number; // nominal filament grams, default 1000
  driedDaysAgo?: number;
  winterOnly?: boolean;
};

// The main user's set mirrors the old usage-history seed: the Galaxy Black
// workhorse is used up twice and bought a third time.
const SPOOLS: Record<UserKey, SpoolSpec[]> = {
  main: [
    {
      mat: 'prusa-galaxy-black',
      type: 'prusament',
      startDaysAgo: 360,
      gramsPerDay: 9,
      price: 2999,
      location: 'Shelf A',
    },
    {
      mat: 'prusa-galaxy-black',
      type: 'prusament',
      startDaysAgo: 245,
      gramsPerDay: 8,
      price: 2999,
      location: 'Shelf A',
    },
    {
      mat: 'prusa-galaxy-black',
      type: 'prusament',
      startDaysAgo: 118,
      gramsPerDay: 6,
      price: 3199,
      location: 'Printer 1',
    },
    {
      mat: 'spectrum-deep-blue',
      type: 'spectrum',
      startDaysAgo: 330,
      gramsPerDay: 3,
      price: 2290,
      location: 'Shelf A',
    },
    {
      mat: 'sunlu-silk-gold',
      type: 'sunlu',
      startDaysAgo: 300,
      gramsPerDay: 4.5,
      price: 1599,
      location: 'Shelf B',
    },
    {
      mat: 'sunlu-white',
      type: 'sunlu',
      startDaysAgo: 50,
      gramsPerDay: 5,
      price: 1599,
      location: 'Printer 2',
    },
    {
      mat: 'poly-sakura',
      type: 'polymaker',
      startDaysAgo: 365,
      gramsPerDay: 2,
      price: 2199,
      location: 'Shelf B',
    },
    {
      mat: 'poly-teal',
      type: 'polymaker',
      startDaysAgo: 280,
      gramsPerDay: 2.5,
      price: 2499,
      location: 'Dry box 1',
      driedDaysAgo: 12,
    },
    {
      mat: 'prusa-orange',
      type: 'prusament',
      startDaysAgo: 200,
      gramsPerDay: 4,
      price: 2999,
      location: 'Dry box 1',
      driedDaysAgo: 75,
    },
    {
      mat: 'spectrum-forest',
      type: 'spectrum',
      startDaysAgo: 120,
      gramsPerDay: 3,
      price: 2490,
      location: 'Shelf C',
    },
    {
      mat: 'fiberlogy-graphite',
      type: 'fiberlogy',
      startDaysAgo: 20,
      gramsPerDay: 0,
      price: 2790,
      location: 'Shelf C',
      full: 850,
    },
    {
      mat: 'spectrum-traffic-black',
      type: 'spectrum',
      startDaysAgo: 240,
      gramsPerDay: 1.5,
      price: null,
      location: 'Shelf C',
    },
    {
      ref: 'main-asa',
      mat: 'prusa-lipstick',
      type: 'prusament',
      startDaysAgo: 60,
      gramsPerDay: 2,
      price: 3299,
      location: 'Shelf C',
    },
    {
      mat: 'poly-flex-black',
      type: 'polymaker',
      startDaysAgo: 210,
      gramsPerDay: 0.8,
      price: 3490,
      location: 'Dry box 2',
      driedDaysAgo: 40,
    },
    {
      mat: 'sunlu-grey',
      type: 'sunlu',
      startDaysAgo: 330,
      gramsPerDay: 3,
      price: null,
      location: 'Shelf B',
      winterOnly: true,
    },
    {
      mat: 'poly-nylon',
      type: 'polymaker',
      startDaysAgo: 90,
      gramsPerDay: 1.2,
      price: 4499,
      location: 'Dry box 2',
      driedDaysAgo: 5,
      full: 750,
    },
    {
      ref: 'main-white',
      mat: 'esun-signal-white',
      type: 'esun',
      startDaysAgo: 150,
      gramsPerDay: 1.5,
      price: 1899,
      location: 'Shelf B',
    },
    {
      ref: 'main-cyan',
      mat: 'bambu-cyan',
      type: 'bambu',
      startDaysAgo: 30,
      gramsPerDay: 3,
      price: 2499,
      location: 'AMS slot 2',
    },
    {
      ref: 'main-pc',
      mat: 'prusa-pc-blend',
      type: 'prusament',
      startDaysAgo: 100,
      gramsPerDay: 0.5,
      price: 4999,
      location: 'Dry box 2',
      driedDaysAgo: 100,
    },
  ],
  bob: [
    {
      mat: 'esun-fire-red',
      type: 'esun',
      startDaysAgo: 200,
      gramsPerDay: 2,
      price: 1799,
      location: 'Desk',
    },
    {
      ref: 'bob-white',
      mat: 'esun-cold-white',
      type: 'esun',
      startDaysAgo: 90,
      gramsPerDay: 3,
      price: 1799,
      location: 'Desk',
    },
    {
      ref: 'bob-charcoal',
      mat: 'bambu-charcoal',
      type: 'bambu',
      startDaysAgo: 140,
      gramsPerDay: 2.5,
      price: 2299,
      location: 'Garage shelf',
    },
    {
      mat: 'sunlu-white',
      type: 'sunlu',
      startDaysAgo: 300,
      gramsPerDay: 2,
      price: 1499,
      location: 'Garage shelf',
    },
    {
      mat: 'poly-flex-black',
      type: 'polymaker',
      startDaysAgo: 60,
      gramsPerDay: 0.6,
      price: 3290,
      location: 'Drawer',
    },
  ],
  alice: [
    {
      ref: 'alice-galaxy',
      mat: 'prusa-galaxy-black',
      type: 'prusament',
      startDaysAgo: 180,
      gramsPerDay: 3,
      price: 2999,
      location: 'Rack 1',
    },
    {
      ref: 'alice-teal',
      mat: 'poly-teal',
      type: 'polymaker',
      startDaysAgo: 160,
      gramsPerDay: 2,
      price: 2499,
      location: 'Rack 1',
      driedDaysAgo: 30,
    },
    {
      mat: 'eryone-rainbow',
      type: 'eryone',
      startDaysAgo: 80,
      gramsPerDay: 2,
      price: 1999,
      location: 'Rack 2',
    },
    {
      mat: 'prusa-lipstick',
      type: 'prusament',
      startDaysAgo: 100,
      gramsPerDay: 1.5,
      price: 3299,
      location: 'Enclosure',
    },
    {
      mat: 'poly-pva',
      type: 'polymaker',
      startDaysAgo: 200,
      gramsPerDay: 0.3,
      price: 3999,
      location: 'Dry box',
      full: 500,
      driedDaysAgo: 9,
    },
    {
      mat: 'bambu-cyan',
      type: 'bambu',
      startDaysAgo: 40,
      gramsPerDay: 4,
      price: 2499,
      location: 'AMS slot 1',
    },
    {
      mat: 'prusa-jet-black',
      type: 'prusament',
      startDaysAgo: 250,
      gramsPerDay: 5,
      price: 2999,
      location: 'Rack 2',
    },
  ],
  carla: [
    {
      mat: 'elegoo-rapid-blue',
      type: 'elegoo',
      startDaysAgo: 70,
      gramsPerDay: 3,
      price: 1699,
      location: 'Bookshelf',
    },
    {
      ref: 'carla-deep-blue',
      mat: 'spectrum-deep-blue',
      type: 'spectrum',
      startDaysAgo: 150,
      gramsPerDay: 2,
      price: 2290,
      location: 'Bookshelf',
    },
    {
      mat: 'sunlu-grey',
      type: 'sunlu',
      startDaysAgo: 220,
      gramsPerDay: 2,
      price: 1399,
      location: 'Garage',
    },
    {
      mat: 'esun-hips',
      type: 'esun',
      startDaysAgo: 120,
      gramsPerDay: 0.5,
      price: 2099,
      location: 'Garage',
    },
  ],
  dan: [
    {
      mat: 'prusa-orange',
      type: 'prusament',
      startDaysAgo: 100,
      gramsPerDay: 3,
      price: 2999,
      location: 'Workbench',
    },
    {
      mat: 'bambu-charcoal',
      type: 'bambu',
      startDaysAgo: 45,
      gramsPerDay: 2,
      price: 2299,
      location: 'Workbench',
    },
    {
      mat: 'poly-nylon',
      type: 'polymaker',
      startDaysAgo: 300,
      gramsPerDay: 1.5,
      price: 4499,
      location: 'Dry box',
      full: 750,
      driedDaysAgo: 150,
    },
  ],
  eve: [],
  mallory: [],
};

// ─── Groups & lends ──────────────────────────────────────────────────────────

type ShareMode = 'all' | 'whitelist' | 'blacklist';

const GROUPS: {
  name: string;
  createdDaysAgo: number;
  members: {
    user: UserKey;
    mode: ShareMode;
    list?: string[];
    joinedDaysAgo: number;
  }[]; // first = owner
}[] = [
  {
    name: 'Test Makerspace',
    createdDaysAgo: 300,
    members: [
      { user: 'main', mode: 'all', joinedDaysAgo: 300 },
      { user: 'bob', mode: 'all', joinedDaysAgo: 290 },
      {
        user: 'alice',
        mode: 'whitelist',
        list: ['prusa-galaxy-black', 'poly-teal', 'prusa-lipstick'],
        joinedDaysAgo: 250,
      },
      {
        user: 'carla',
        mode: 'blacklist',
        list: ['sunlu-grey'],
        joinedDaysAgo: 200,
      },
    ],
  },
  {
    name: "Bob's Garage",
    createdDaysAgo: 200,
    members: [
      { user: 'bob', mode: 'all', joinedDaysAgo: 200 },
      {
        user: 'main',
        mode: 'blacklist',
        list: ['poly-nylon', 'prusa-pc-blend'],
        joinedDaysAgo: 190,
      },
      { user: 'dan', mode: 'all', joinedDaysAgo: 150 },
    ],
  },
  {
    name: 'Print Farm Collective',
    createdDaysAgo: 180,
    members: [
      { user: 'alice', mode: 'all', joinedDaysAgo: 180 },
      { user: 'carla', mode: 'all', joinedDaysAgo: 170 },
    ],
  },
];
const GROUP_NAMES = GROUPS.map((g) => g.name);

type LendSpec = {
  group: string;
  spool: string; // SpoolSpec.ref
  borrower: UserKey;
  status: 'requested' | 'active' | 'returned' | 'declined';
  requested: number; // days ago
  responded?: number;
  returned?: number;
};

const LENDS: LendSpec[] = [
  {
    group: 'Test Makerspace',
    spool: 'main-white',
    borrower: 'bob',
    status: 'returned',
    requested: 120,
    responded: 119,
    returned: 95,
  },
  {
    group: 'Test Makerspace',
    spool: 'main-white',
    borrower: 'bob',
    status: 'active',
    requested: 10,
    responded: 9,
  },
  {
    group: 'Test Makerspace',
    spool: 'alice-galaxy',
    borrower: 'main',
    status: 'active',
    requested: 21,
    responded: 20,
  },
  {
    group: 'Test Makerspace',
    spool: 'main-cyan',
    borrower: 'carla',
    status: 'requested',
    requested: 2,
  },
  {
    group: 'Test Makerspace',
    spool: 'carla-deep-blue',
    borrower: 'main',
    status: 'requested',
    requested: 3,
  },
  {
    group: 'Test Makerspace',
    spool: 'main-pc',
    borrower: 'alice',
    status: 'declined',
    requested: 40,
    responded: 39,
  },
  {
    group: "Bob's Garage",
    spool: 'bob-white',
    borrower: 'dan',
    status: 'requested',
    requested: 1,
  },
  {
    group: "Bob's Garage",
    spool: 'bob-charcoal',
    borrower: 'main',
    status: 'returned',
    requested: 60,
    responded: 58,
    returned: 30,
  },
  {
    group: 'Print Farm Collective',
    spool: 'alice-teal',
    borrower: 'carla',
    status: 'returned',
    requested: 70,
    responded: 69,
    returned: 45,
  },
];

// A request that was withdrawn: the lend row is gone, only the owner's
// notification remains.
const CANCELLED = {
  group: 'Test Makerspace',
  spool: 'main-asa',
  borrower: 'bob' as UserKey,
  daysAgo: 15,
};

// ─── Simulation ──────────────────────────────────────────────────────────────

// Heavier printing in winter: factor ~1.35 in January, ~0.65 in July.
function seasonal(d: Date, winterOnly: boolean) {
  const m = d.getUTCMonth();
  if (winterOnly && m >= 3 && m <= 9) return 0;
  return 1 + 0.35 * Math.cos((2 * Math.PI * m) / 12);
}

type Point = { grams: number; at: Date };

// Weighings every few days from purchase until today or until it runs empty.
function simulate(
  spec: SpoolSpec,
  emptyGrams: number,
  full: number,
  now: Date
) {
  let filament = full + Math.round(between(0, 15)); // spools ship slightly over
  let t = new Date(now.getTime() - spec.startDaysAgo * DAY_MS);
  const points: Point[] = [{ grams: emptyGrams + filament, at: t }];
  while (filament > 0) {
    const gap = Math.round(between(2, 12)) + (rand() < 0.06 ? 14 : 0); // vacations
    const next = new Date(t.getTime() + gap * DAY_MS + between(-3, 3) * 3600e3);
    if (next >= now) break;
    t = next;
    const used = Math.round(
      spec.gramsPerDay *
        gap *
        seasonal(t, !!spec.winterOnly) *
        between(0.2, 1.8)
    );
    if (used <= 0) continue;
    filament = Math.max(0, filament - used);
    if (filament <= 5) filament = Math.round(between(0, 4)); // scrap on the reel
    points.push({ grams: emptyGrams + filament, at: t });
    if (filament <= 5) break;
  }
  return points;
}

// The spool's measured weight at time t (latest weighing at or before t).
function weightAt(points: Point[], t: Date) {
  let grams = points[0].grams;
  for (const p of points) if (p.at <= t) grams = p.grams;
  return grams;
}

const ymd = (d: Date) => d.toISOString().slice(0, 10);

// ─── Seed ────────────────────────────────────────────────────────────────────

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Owner = { id: string; name: string; email: string };

async function seed(tx: Tx, owner: Owner) {
  const now = new Date();
  const daysAgo = (d: number) => new Date(now.getTime() - d * DAY_MS);

  // Users
  const users = { main: owner } as Record<UserKey, Owner>;
  const passwordHash = await hashPassword(PASSWORD);
  for (const u of USERS) {
    const id = randomUUID();
    const createdAt = daysAgo(u.joinedDaysAgo);
    await tx.insert(user).values({
      id,
      name: u.name,
      email: u.email,
      emailVerified: true,
      role: 'user',
      trustedContributor: !!u.trusted,
      banned: !!u.banned,
      banReason: u.banned ?? null,
      createdAt,
      updatedAt: createdAt,
    });
    await tx.insert(account).values({
      id: randomUUID(),
      accountId: id,
      providerId: 'credential',
      userId: id,
      password: passwordHash,
      createdAt,
      updatedAt: createdAt,
    });
    users[u.key] = { id, name: u.name, email: u.email };
  }
  const reviewer = (status: Status, by: UserKey) =>
    status === 'pending'
      ? null
      : by !== 'main' && status === 'approved'
        ? users[by].id // trusted contributor: auto-approved
        : owner.id;

  // Spool types
  const spoolTypeIds: Record<string, { id: string; empty: number }> = {};
  for (const [key, st] of Object.entries(SPOOL_TYPES)) {
    const status = st.status ?? 'approved';
    const by = st.by ?? 'main';
    const [row] = await tx
      .insert(spoolTypes)
      .values({
        manufacturer: st.manufacturer,
        name: st.name,
        emptyWeightGrams: st.grams,
        status,
        externalKey: `${CATALOG_KEY}spool:${key}`,
        submittedById: users[by].id,
        reviewedById: reviewer(status, by),
        createdAt: daysAgo(status === 'approved' ? 400 : 4),
      })
      .returning({ id: spoolTypes.id });
    spoolTypeIds[key] = { id: row.id, empty: st.grams };
  }

  // Materials
  const materialRows: Record<
    string,
    { id: string; label: string; type: string }
  > = {};
  for (const [key, m] of Object.entries(MATERIALS)) {
    const status = m.status ?? 'approved';
    const by = m.by ?? 'main';
    const [row] = await tx
      .insert(materials)
      .values({
        manufacturer: m.manufacturer,
        name: m.name,
        filamentType: m.type,
        color: m.color,
        status,
        externalKey: `${CATALOG_KEY}material:${key}`,
        submittedById: users[by].id,
        reviewedById: reviewer(status, by),
        createdAt: daysAgo(
          status === 'approved' ? 400 : Math.round(between(1, 6))
        ),
      })
      .returning({ id: materials.id });
    materialRows[key] = {
      id: row.id,
      label: materialLabel({
        manufacturer: m.manufacturer,
        name: m.name,
        filamentType: m.type,
      }),
      type: m.type,
    };
  }

  // Property definitions + values
  await tx
    .insert(properties)
    .values(EXTRA_PROPERTIES)
    .onConflictDoNothing({ target: properties.key });
  const defs = new Map(
    (await tx.select().from(properties)).map((p) => [p.key, p] as const)
  );
  const propertyRows = new Map<
    string,
    typeof materialProperties.$inferInsert
  >();
  const setValue = (
    mat: string,
    key: string,
    raw: string,
    by: UserKey | null
  ) => {
    const def = defs.get(key);
    if (!def)
      throw new Error(
        `Property definition "${key}" missing — migrations not applied?`
      );
    const type = isPropertyValueType(def.valueType) ? def.valueType : 'text';
    const n = normalizePropertyValue(type, raw);
    if (!n.ok) throw new Error(`${mat}.${key} = "${raw}": ${n.message}`);
    propertyRows.set(`${mat}|${key}`, {
      materialId: materialRows[mat].id,
      propertyId: def.id,
      value: n.value,
      valueMin: n.min,
      valueMax: n.max,
      verified: by === null || by === 'main',
      // Alternate between import-style (no submitter) and admin-entered rows.
      submittedById: by ? users[by].id : null,
    });
  };
  Object.keys(MATERIALS).forEach((mat, i) => {
    if (NO_PROPERTIES.has(mat)) return;
    const status = MATERIALS[mat].status ?? 'approved';
    for (const [key, value] of Object.entries(
      TYPE_PROPERTIES[MATERIALS[mat].type] ?? {}
    )) {
      // Pending requests only carry the submitter's own (unverified) basics.
      if (status !== 'approved') {
        if (['density', 'diameter'].includes(key))
          setValue(mat, key, value, MATERIALS[mat].by ?? 'main');
        continue;
      }
      // Leave some optional values unset so not every datasheet is complete.
      if (
        [
          'tensile_strength',
          'heat_deflection_temp',
          'max_volumetric_speed',
        ].includes(key) &&
        i % 3 === 2
      )
        continue;
      setValue(mat, key, value, i % 2 ? 'main' : null);
    }
  });
  for (const e of PROPERTY_EDITS) setValue(e.mat, e.key, e.value, e.by);
  await tx.insert(materialProperties).values([...propertyRows.values()]);

  // Spools + weighing history. Weighings during an active/returned lend are
  // the borrower's (the borrower re-weighs on /borrows).
  const borrowerAt = (ref: string | undefined, at: Date) => {
    if (!ref) return undefined;
    const lend = LENDS.find(
      (l) =>
        l.spool === ref &&
        (l.status === 'active' || l.status === 'returned') &&
        at >= daysAgo(l.responded!) &&
        at <= daysAgo(l.returned ?? 0)
    );
    return lend && users[lend.borrower].id;
  };
  const spoolRefs = new Map<
    string,
    { id: string; owner: UserKey; mat: string; empty: number; points: Point[] }
  >();
  let spoolCount = 0;
  let weighingCount = 0;
  for (const [ownerKey, specs] of Object.entries(SPOOLS) as [
    UserKey,
    SpoolSpec[],
  ][]) {
    for (const [i, spec] of specs.entries()) {
      const st = spoolTypeIds[spec.type];
      const full = spec.full ?? 1000;
      const points = simulate(spec, st.empty, full, now);
      const first = points[0].at;
      const last = points[points.length - 1];
      const [row] = await tx
        .insert(spools)
        .values({
          userId: users[ownerKey].id,
          materialId: materialRows[spec.mat].id,
          spoolTypeId: st.id,
          fullFilamentWeightGrams: full,
          measuredTotalWeightGrams: last.grams,
          tagUid: `${TAG_PREFIX}${i + 1}`,
          pricePaidCents: spec.price,
          purchasedAt: ymd(new Date(first.getTime() - 3 * DAY_MS)),
          location: spec.location,
          lastDriedAt:
            spec.driedDaysAgo === undefined ? null : daysAgo(spec.driedDaysAgo),
          createdAt: first,
          updatedAt: last.at,
        })
        .returning({ id: spools.id });
      await tx.insert(spoolWeighings).values(
        points.map((p) => ({
          spoolId: row.id,
          userId: borrowerAt(spec.ref, p.at) ?? users[ownerKey].id,
          grams: p.grams,
          measuredAt: p.at,
        }))
      );
      if (spec.ref)
        spoolRefs.set(spec.ref, {
          id: row.id,
          owner: ownerKey,
          mat: spec.mat,
          empty: st.empty,
          points,
        });
      spoolCount++;
      weighingCount += points.length;
    }
  }

  // Groups, members, share overrides
  const groupIds: Record<string, string> = {};
  for (const g of GROUPS) {
    const [row] = await tx
      .insert(groups)
      .values({
        name: g.name,
        ownerId: users[g.members[0].user].id,
        inviteCode: randomBytes(4).toString('hex'),
        createdAt: daysAgo(g.createdDaysAgo),
        updatedAt: daysAgo(g.createdDaysAgo),
      })
      .returning({ id: groups.id });
    groupIds[g.name] = row.id;
    for (const [i, m] of g.members.entries()) {
      const [member] = await tx
        .insert(groupMembers)
        .values({
          groupId: row.id,
          userId: users[m.user].id,
          role: i === 0 ? 'owner' : 'member',
          shareMode: m.mode,
          joinedAt: daysAgo(m.joinedDaysAgo),
        })
        .returning({ id: groupMembers.id });
      if (m.list?.length)
        await tx.insert(filamentShareOverrides).values(
          m.list.map((mat) => ({
            groupMemberId: member.id,
            materialId: materialRows[mat].id,
          }))
        );
    }
  }

  // Lends + their notifications (older than 5 days = already read)
  const notificationRows: (typeof notifications.$inferInsert)[] = [];
  const notify = (
    to: UserKey,
    type: string,
    actor: UserKey,
    spoolRef: string,
    group: string,
    at: Date,
    lendId: string | null
  ) =>
    notificationRows.push({
      userId: users[to].id,
      type,
      actorName: users[actor].name,
      filamentName: materialRows[spoolRefs.get(spoolRef)!.mat].label,
      groupName: group,
      lendId,
      createdAt: at,
      readAt: at < daysAgo(5) ? new Date(at.getTime() + 3600e3) : null,
    });

  for (const l of LENDS) {
    const spool = spoolRefs.get(l.spool);
    if (!spool) throw new Error(`Lend references unknown spool "${l.spool}"`);
    if (spool.owner === l.borrower)
      throw new Error(`${l.borrower} cannot borrow their own spool`);
    const requestedAt = daysAgo(l.requested);
    const respondedAt = l.responded === undefined ? null : daysAgo(l.responded);
    const returnedAt = l.returned === undefined ? null : daysAgo(l.returned);
    const lent = l.status === 'active' || l.status === 'returned';
    const atStart = respondedAt ?? requestedAt;
    if (weightAt(spool.points, atStart) - spool.empty <= 5)
      console.warn(
        `  warning: ${l.spool} is empty when ${l.borrower} borrows it`
      );
    const [row] = await tx
      .insert(lends)
      .values({
        filamentId: spool.id,
        borrowerId: users[l.borrower].id,
        groupId: groupIds[l.group],
        status: l.status,
        requestedAt,
        respondedAt,
        returnedAt,
        startWeightGrams: lent ? weightAt(spool.points, respondedAt!) : null,
        endWeightGrams: returnedAt ? weightAt(spool.points, returnedAt) : null,
        createdAt: requestedAt,
        updatedAt: returnedAt ?? respondedAt ?? requestedAt,
      })
      .returning({ id: lends.id });
    notify(
      spool.owner,
      'lend_requested',
      l.borrower,
      l.spool,
      l.group,
      requestedAt,
      row.id
    );
    if (respondedAt)
      notify(
        l.borrower,
        lent ? 'lend_approved' : 'lend_declined',
        spool.owner,
        l.spool,
        l.group,
        respondedAt,
        row.id
      );
    if (returnedAt)
      notify(
        l.borrower,
        'lend_returned',
        spool.owner,
        l.spool,
        l.group,
        returnedAt,
        row.id
      );
  }
  const cancelled = spoolRefs.get(CANCELLED.spool)!;
  notify(
    cancelled.owner,
    'lend_request_cancelled',
    CANCELLED.borrower,
    CANCELLED.spool,
    CANCELLED.group,
    daysAgo(CANCELLED.daysAgo),
    null
  );
  await tx.insert(notifications).values(notificationRows);

  // API token for the main user (as /account would create it)
  const token = 'sph_' + randomBytes(32).toString('base64url');
  await tx.insert(apiTokens).values({
    userId: owner.id,
    name: TOKEN_NAME,
    tokenHash: createHash('sha256').update(token).digest('hex'),
    tokenPrefix: token.slice(0, 12),
    createdAt: daysAgo(30),
    lastUsedAt: daysAgo(1),
  });

  console.log(`Seeded for ${owner.email}:
  users          ${USERS.map((u) => u.email).join(', ')}
                 password: ${PASSWORD}  (${USERS.find((u) => u.banned)!.email} is banned)
  catalog        ${Object.keys(SPOOL_TYPES).length} spool types, ${Object.keys(MATERIALS).length} materials (incl. pending/rejected), ${propertyRows.size} property values
  inventory      ${spoolCount} spools, ${weighingCount} weighings
  groups         ${GROUP_NAMES.join(', ')}
  lends          ${LENDS.length} (${LENDS.filter((l) => l.status === 'requested').length} open requests), ${notificationRows.length} notifications
  API token      ${token}`);
}

// ─── Clean ───────────────────────────────────────────────────────────────────

async function clean(ownerId: string) {
  return db.transaction(async (tx) => {
    // Groups first: members, overrides and lends cascade with them. Matched by
    // name *and* a seeded owner, so a real group that happens to share a name
    // is never touched.
    const seededUserIds = tx
      .select({ id: user.id })
      .from(user)
      .where(
        inArray(
          user.email,
          USERS.map((u) => u.email)
        )
      );
    await tx
      .delete(groups)
      .where(
        and(
          inArray(groups.name, GROUP_NAMES),
          or(
            eq(groups.ownerId, ownerId),
            inArray(groups.ownerId, seededUserIds)
          )
        )
      );
    await tx
      .delete(notifications)
      .where(
        and(
          eq(notifications.userId, ownerId),
          inArray(notifications.groupName, GROUP_NAMES)
        )
      );
    await tx
      .delete(apiTokens)
      .where(
        and(eq(apiTokens.userId, ownerId), eq(apiTokens.name, TOKEN_NAME))
      );
    // Weighings and any lends cascade with the spool.
    const removedSpools = await tx
      .delete(spools)
      .where(
        and(eq(spools.userId, ownerId), like(spools.tagUid, `${TAG_PREFIX}%`))
      )
      .returning({ id: spools.id });
    // Their spools, accounts, memberships, notifications… cascade.
    const removedUsers = await tx
      .delete(user)
      .where(
        inArray(
          user.email,
          USERS.map((u) => u.email)
        )
      )
      .returning({ id: user.id });
    // Catalog rows, unless a real spool has started using them since.
    // Property values and share overrides cascade with the material.
    const removedMaterials = await tx
      .delete(materials)
      .where(
        and(
          like(materials.externalKey, `${CATALOG_KEY}%`),
          notExists(
            tx
              .select({ id: spools.id })
              .from(spools)
              .where(eq(spools.materialId, materials.id))
          )
        )
      )
      .returning({ id: materials.id });
    const removedTypes = await tx
      .delete(spoolTypes)
      .where(
        and(
          like(spoolTypes.externalKey, `${CATALOG_KEY}%`),
          notExists(
            tx
              .select({ id: spools.id })
              .from(spools)
              .where(eq(spools.spoolTypeId, spoolTypes.id))
          )
        )
      )
      .returning({ id: spoolTypes.id });
    console.log(
      `Removed ${removedUsers.length} test users, ${removedSpools.length} of your seeded spools, ` +
        `${removedMaterials.length} materials, ${removedTypes.length} spool types.`
    );
  });
}

async function alreadySeeded() {
  const [m] = await db
    .select({ id: materials.id })
    .from(materials)
    .where(like(materials.externalKey, `${CATALOG_KEY}%`))
    .limit(1);
  const [u] = await db
    .select({ id: user.id })
    .from(user)
    .where(
      inArray(
        user.email,
        USERS.map((x) => x.email)
      )
    )
    .limit(1);
  return !!(m || u);
}

async function main() {
  const args = process.argv.slice(2);
  const emailIdx = args.indexOf('--email');
  const email = emailIdx >= 0 ? args[emailIdx + 1]?.toLowerCase() : undefined;
  const [owner] = await db
    .select({ id: user.id, name: user.name, email: user.email })
    .from(user)
    .where(email ? eq(user.email, email) : eq(user.role, 'admin'))
    .limit(1);
  if (!owner) {
    console.error(
      email
        ? `No user ${email}.`
        : 'No admin account found — run `npm run admin:create -- <email> <name>` first.'
    );
    process.exit(1);
  }

  if (args.includes('--reset') || args.includes('--clean')) {
    await clean(owner.id);
    if (args.includes('--clean')) return;
  } else if (await alreadySeeded()) {
    console.log(
      'Seed data already present — pass --reset to re-seed or --clean to remove it.'
    );
    return;
  }
  await db.transaction((tx) => seed(tx, owner));
}

// The seeded accounts share a published password, one is a trusted
// contributor, and the main user gets a live API token — so refuse any
// database but the local PGlite one unless that is explicitly intended.
if (
  (process.env.DATABASE_URL || process.env.DATABASE_PASSWORD_FILE) &&
  !process.argv.includes('--allow-remote')
) {
  console.error(
    'DATABASE_URL / DATABASE_PASSWORD_FILE is set: refusing to seed a non-local database.\n' +
      'The seed creates accounts with a known password. Unset it to use local PGlite,\n' +
      'or pass --allow-remote if this really is a throwaway database.'
  );
  process.exit(1);
}

// The local dev database is started on demand (and stopped again) when nothing
// is serving it yet; closeDb() releases the pool so the script exits.
withLocalDb(async () => {
  await runMigrations();
  await main();
  await closeDb();
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
