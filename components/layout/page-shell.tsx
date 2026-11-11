import { PageHeader, type Crumb } from '@/components/common/page-header';

// Transitional adapter for sub-pages not yet rebuilt in the redesign (tasks
// 06a–06d): the (app) layout's shell supplies width, padding and navigation,
// so this only renders the page's PageHeader above its content. Task 07
// removes it once every page builds its own PageHeader.
export function PageShell({
  title,
  description,
  breadcrumb,
  children,
}: {
  title: string;
  description?: React.ReactNode;
  /** Parent pages for the kicker trail; the title is appended as current. */
  breadcrumb?: Crumb[];
  children: React.ReactNode;
}) {
  return (
    <>
      <PageHeader
        title={title}
        description={description}
        breadcrumb={breadcrumb && [...breadcrumb, { label: title }]}
      />
      <div>{children}</div>
    </>
  );
}
