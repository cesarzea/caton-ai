/** The strings of the reports: upcoming charges, spending and documents. */
export const reports = {
  upcomingTitle: 'Upcoming charges',
  upcomingIntro:
    'Charges renewal notices announce, soonest first. A later cancellation removes them.',
  upcomingEmpty: 'No renewal notices announce a charge.',
  upcomingColumns: ['Date', 'Issuer', 'Amount', 'Card or account'],
  spendTitle: 'Spending',
  spendIntro:
    'Money spent per month, card statement payments left out and card charges only documents report included. Transfers between your own accounts still count.',
  cash: 'When paid',
  accrual: 'Over the period paid for',
  spendEmpty: 'No spending yet: sync a connection.',
  spendColumns: ['Month', 'Spending', 'Only in documents', 'Receipts no account shows'],
  documentsTitle: 'Documents',
  documentsIntro:
    'Receipts, invoices, card alerts, notices and statements read from your connections. A verified one has its amount, issuer and date written in its source as read.',
  documentsEmpty: 'No documents match.',
  documentsColumns: ['Date', 'Kind', 'Issuer', 'Amount', 'Card or account', 'State', 'Movement'],
  filter: 'Show',
  filters: {all: 'All', 'to-review': 'To review', unlinked: 'Not matched to a movement'},
  verified: 'Verified',
  toReview: 'To review',
  linked: 'Matched',
  unknown: '—',
} as const;
