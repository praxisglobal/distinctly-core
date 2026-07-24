import { styled } from '@linaria/react';

import { CommandMenuComponentInstanceContext } from '@/command-menu/states/contexts/CommandMenuComponentInstanceContext';
import { MAIN_CONTEXT_STORE_INSTANCE_ID } from '@/context-store/constants/MainContextStoreInstanceId';
import { ContextStoreComponentInstanceContext } from '@/context-store/states/contexts/ContextStoreComponentInstanceContext';
import { PageLayoutRenderer } from '@/page-layout/components/PageLayoutRenderer';
import { LayoutRenderingProvider } from '@/ui/layout/contexts/LayoutRenderingContext';
import { PageCardLayout } from '@/ui/layout/page/components/PageCardLayout';
import { PageLayoutType } from '~/generated-metadata/graphql';
import { StandalonePageHeader } from '~/pages/page-layout/StandalonePageHeader';

// distinctly branding: renders a module's custom STANDALONE_PAGE layout for a KNOWN
// pageLayoutId (resolved from the module's nav item) instead of the route param. This is
// the same rendering StandalonePageLayoutPage does at /page/:pageLayoutId, reused so a
// redesigned module shows its design AT /objects/<namePlural>. See distinctlyModuleIndexRoutes.
const StyledPageLayoutContainer = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  overflow-y: auto;

  @media print {
    display: block;
    min-height: auto;
    overflow: visible;
  }
`;

export const DistinctlyModulePageLayoutView = ({
  pageLayoutId,
}: {
  pageLayoutId: string;
}) => {
  return (
    <ContextStoreComponentInstanceContext.Provider
      value={{ instanceId: MAIN_CONTEXT_STORE_INSTANCE_ID }}
    >
      <CommandMenuComponentInstanceContext.Provider
        value={{ instanceId: pageLayoutId }}
      >
        <PageCardLayout
          header={<StandalonePageHeader pageLayoutId={pageLayoutId} />}
        >
          <LayoutRenderingProvider
            value={{
              targetRecordIdentifier: undefined,
              layoutType: PageLayoutType.STANDALONE_PAGE,
              isInSidePanel: false,
            }}
          >
            <StyledPageLayoutContainer>
              <PageLayoutRenderer pageLayoutId={pageLayoutId} />
            </StyledPageLayoutContainer>
          </LayoutRenderingProvider>
        </PageCardLayout>
      </CommandMenuComponentInstanceContext.Provider>
    </ContextStoreComponentInstanceContext.Provider>
  );
};
