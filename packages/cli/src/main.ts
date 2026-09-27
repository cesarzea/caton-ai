import {formatMoney, money} from '@caton-ai/core';

const sample = money(10_788, 'USD');

process.stdout.write(`Catón AI core is running (sample amount: ${formatMoney(sample, 'en-US')})\n`);
