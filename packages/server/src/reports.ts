import type {DocumentList, SpendReport, UpcomingList} from '@caton-ai/api';

/** What the ledger shows the page, read by the command line from the ledger. */
export interface Reports {
  readonly spend: () => SpendReport;
  readonly documents: () => DocumentList;
  readonly upcoming: () => UpcomingList;
}
