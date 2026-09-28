import type {DocumentList, SpendReport, UpcomingList} from '@caton-ai/api';

import type {Handler} from './api-context.ts';
import {sendJson} from './http.ts';

/** What the ledger shows the page, read by the command line from the ledger. */
export interface Reports {
  readonly spend: () => SpendReport;
  readonly documents: () => DocumentList;
  readonly upcoming: () => UpcomingList;
}

export const spendReport: Handler = (_request, response, {reports}) => {
  sendJson(response, 200, reports.spend());
  return Promise.resolve();
};

export const documentList: Handler = (_request, response, {reports}) => {
  sendJson(response, 200, reports.documents());
  return Promise.resolve();
};

export const upcomingList: Handler = (_request, response, {reports}) => {
  sendJson(response, 200, reports.upcoming());
  return Promise.resolve();
};
