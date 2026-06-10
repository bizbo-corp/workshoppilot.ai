/**
 * Build Pack Nav Context
 * Lets the build pack (outputs) layout publish the current workshop —
 * title, session, step statuses — up to the dashboard sidebar, which sits
 * above the page in the (dashboard) route group layout and otherwise has
 * no access to route-level data.
 */

'use client';

import * as React from 'react';

export type StepStatus =
  | 'not_started'
  | 'in_progress'
  | 'complete'
  | 'needs_regeneration';

export interface BuildPackNavInfo {
  sessionId: string;
  workshopTitle: string;
  workshopEmoji?: string | null;
  steps: Array<{ stepId: string; status: StepStatus }>;
}

interface BuildPackNavContextValue {
  info: BuildPackNavInfo | null;
  setInfo: (info: BuildPackNavInfo | null) => void;
}

const BuildPackNavContext = React.createContext<BuildPackNavContextValue>({
  info: null,
  setInfo: () => {},
});

export function BuildPackNavProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [info, setInfo] = React.useState<BuildPackNavInfo | null>(null);
  const value = React.useMemo(() => ({ info, setInfo }), [info]);
  return (
    <BuildPackNavContext.Provider value={value}>
      {children}
    </BuildPackNavContext.Provider>
  );
}

export function useBuildPackNav() {
  return React.useContext(BuildPackNavContext);
}

/**
 * Rendered by the outputs layout (server) to push the current workshop into
 * the sidebar; clears it again when the user navigates out of the build pack.
 */
export function BuildPackNavSetter({ info }: { info: BuildPackNavInfo }) {
  const { setInfo } = useBuildPackNav();
  // Server components re-create `info` every render; key the effect on content.
  const json = JSON.stringify(info);
  React.useEffect(() => {
    setInfo(JSON.parse(json) as BuildPackNavInfo);
    return () => setInfo(null);
  }, [json, setInfo]);
  return null;
}
