import type {DocumentInfo, SpendReport, UpcomingCharge} from '@caton-ai/api';
import {useEffect, useState} from 'react';
import type {ReactNode} from 'react';

import type {Api} from '../api.ts';
import {useAction} from '../use-action.ts';
import {Documents} from './Documents.tsx';
import {Notice} from './Layout.tsx';
import {Spending} from './Spending.tsx';
import {Upcoming} from './Upcoming.tsx';

type Loaded = Readonly<{spend: SpendReport; documents: DocumentInfo[]; upcoming: UpcomingCharge[]}>;

type Props = Readonly<{
  api: Api;
  /** Changes when a sync ends, so the reports are read again. */
  version: string;
}>;

/** What the ledger shows: upcoming charges, spending and documents. Hidden while it is empty. */
export function Reports({api, version}: Props): ReactNode {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const {error, run} = useAction();
  useEffect(() => {
    void run(async () => {
      const [spend, documents, upcoming] = await Promise.all([
        api.spend(),
        api.documents(),
        api.upcoming(),
      ]);
      setLoaded({spend, documents, upcoming});
    });
  }, [api, run, version]);
  const empty =
    loaded === null || (loaded.spend.cash.length === 0 && loaded.documents.length === 0);
  return (
    <>
      {empty ? null : (
        <>
          <Upcoming charges={loaded.upcoming} />
          <Spending report={loaded.spend} />
          <Documents documents={loaded.documents} />
        </>
      )}
      <Notice message={error} />
    </>
  );
}
