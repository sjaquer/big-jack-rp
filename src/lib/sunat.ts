const env = (key: string) => process.env[key] ?? process.env[key.replace(/-/g, '_')];

export type SunatEnvironment = 'rest' | 'soap-prod' | 'soap-beta';

export interface SunatConfig {
  clientId: string | null;
  clientSecret: string | null;
  tokenUrl: string;
  scope: string;
  receiptUrl: string;
  soapProdUrl?: string;
  soapBetaUrl?: string;
  environment: SunatEnvironment;
}

export interface SunatTokenResult {
  token: string;
  raw: Record<string, unknown>;
}

export class SunatTokenError extends Error {
  status?: number;
  body?: Record<string, unknown>;

  constructor(message: string, status?: number, body?: Record<string, unknown>) {
    super(message);
    this.name = 'SunatTokenError';
    this.status = status;
    this.body = body;
  }
}

export const resolveSunatConfig = (): SunatConfig => {
  const clientId = env('SUNAT_CLIENT_ID') ?? env('id_client') ?? null;
  const clientSecret = env('SUNAT_CLIENT_SECRET') ?? env('clave_sunat') ?? env('clave-sunat') ?? null;

  const tokenUrlBase = env('SUNAT_TOKEN_URL_BASE') ?? 'https://api-seguridad.sunat.gob.pe/v1/clientesextranet';
  const explicitTokenUrl = env('SUNAT_API_TOKEN_URL');
  const tokenUrl = explicitTokenUrl ?? (clientId ? `${tokenUrlBase}/${clientId}/oauth2/token/` : tokenUrlBase);

  const scope = env('SUNAT_SCOPE') ?? env('SUNAT_API_SCOPE') ?? 'https://api-cpe.sunat.gob.pe';

  const restBase = env('SUNAT_API_BASE_URL') ?? 'https://api.sunat.gob.pe/v1/contribuyente/conectate';
  const receiptUrl = env('SUNAT_API_RECEIPT_URL') ?? `${restBase}/boleta`;

  const soapProd = env('SUNAT_ENVIO_URL_PROD');
  const soapBeta = env('SUNAT_ENVIO_URL_BETA');
  const environment = (env('SUNAT_ENV_MODE') ?? env('SUNAT_ENV') ?? 'rest') as SunatEnvironment;

  return {
    clientId,
    clientSecret,
    tokenUrl,
    scope,
    receiptUrl,
    soapProdUrl: soapProd ?? undefined,
    soapBetaUrl: soapBeta ?? undefined,
    environment,
  };
};

export const getSunatToken = async (config = resolveSunatConfig()): Promise<SunatTokenResult> => {
  if (!config.clientId || !config.clientSecret) {
    throw new SunatTokenError('Credenciales de SUNAT no configuradas.');
  }

  const tokenBody = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: config.clientId,
    client_secret: config.clientSecret,
    scope: config.scope,
  });

  const tokenResponse = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: tokenBody.toString(),
  });

  const tokenJson = (await tokenResponse.json().catch(() => ({}))) as Record<string, unknown>;

  if (!tokenResponse.ok || typeof tokenJson.access_token !== 'string') {
    throw new SunatTokenError('No se pudo obtener el token de SUNAT.', tokenResponse.status, tokenJson);
  }

  return {
    token: tokenJson.access_token,
    raw: tokenJson,
  };
};
