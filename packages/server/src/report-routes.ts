import type {Handler} from './api-context.ts';
import {sendJson} from './http.ts';

const spendReport: Handler = (_request, response, {reports}) => {
  sendJson(response, 200, reports.spend());
  return Promise.resolve();
};

const documentList: Handler = (_request, response, {reports}) => {
  sendJson(response, 200, reports.documents());
  return Promise.resolve();
};

const upcomingList: Handler = (_request, response, {reports}) => {
  sendJson(response, 200, reports.upcoming());
  return Promise.resolve();
};

/** The routes that read the ledger for the page. */
export function reportRouteFor(route: string): Handler | undefined {
  switch (route) {
    case 'GET /api/spend':
      return spendReport;
    case 'GET /api/documents':
      return documentList;
    case 'GET /api/upcoming':
      return upcomingList;
    default:
      return undefined;
  }
}
