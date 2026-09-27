import type {Connector, ConnectorEnvironment, TransactionSource} from '@caton-ai/core';

import {ConfigError} from './config.ts';
import type {CatonConfig, Connection} from './config.ts';

/** Builds the source of each connection with the connector plugin its `type` names. */
export function sourceFactory(
  connectors: readonly Connector[],
  config: () => CatonConfig,
  environment: ConnectorEnvironment,
): (connection: Connection) => TransactionSource {
  const byId = new Map(connectors.map(connector => [connector.manifest.id, connector]));
  return connection => {
    const connector = byId.get(connection.type);
    if (connector === undefined) {
      const installed = [...byId.keys()].join(', ');
      throw new ConfigError(
        `Connection "${connection.name}" uses unknown connector "${connection.type}"; ` +
          `installed: ${installed}`,
      );
    }
    return connector.createSource(config().plugins[connection.type], connection, environment);
  };
}
