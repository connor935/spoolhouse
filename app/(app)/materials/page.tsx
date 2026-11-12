import {
  countUsableMaterials,
  getRecentMaterialColors,
  searchMaterialCatalog,
} from '@/app/actions/materials';
import { getPropertyDefinitions } from '@/app/actions/properties';
import { MaterialCatalogContainer } from '@/components/catalog/material-catalog-view';
import { requireUser } from '@/lib/auth-session';
import { parseMaterialCatalogParams } from '@/lib/catalog-params';

export const dynamic = 'force-dynamic';

export default async function MaterialsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const filters = parseMaterialCatalogParams(await searchParams);

  // Only a page of rows is fetched — the catalog reaches tens of thousands of
  // materials after a SpoolmanDB import.
  const [firstPage, grandTotal, properties, recentColors] = await Promise.all([
    searchMaterialCatalog({
      q: filters.q,
      filamentTypes: filters.filamentTypes,
      constraints: filters.constraints,
    }),
    countUsableMaterials(),
    getPropertyDefinitions(),
    getRecentMaterialColors(),
  ]);

  return (
    <MaterialCatalogContainer
      filters={filters}
      firstPage={firstPage}
      grandTotal={grandTotal}
      properties={properties}
      viewerId={user.id}
      autoApprove={user.role === 'admin' || user.trustedContributor === true}
      recentColors={recentColors}
    />
  );
}
