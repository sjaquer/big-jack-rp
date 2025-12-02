import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import AdmZip from 'adm-zip';
import { SignedXml } from 'xml-crypto';
import forge from 'node-forge';
import { v4 as uuidv4 } from 'uuid';
import { getSunatToken, resolveSunatConfig, SunatTokenError } from '@/lib/sunat';

/**
 * Endpoint para emitir boletas electrónicas vía API REST de SUNAT.
 * Requiere las siguientes variables de entorno configuradas en producción: 
 * - SUNAT_CLIENT_ID / SUNAT_CLIENT_SECRET
 * - SUNAT_TOKEN_URL_BASE / SUNAT_API_RECEIPT_URL
 * - SUNAT_CERT_BASE64 / SUNAT_CERT_PASSWORD (Certificado CDT en base64)
 * - SUNAT_RUC / SUNAT_RAZON_SOCIAL
 * - Opcional: SUNAT_BOLETA_SERIE
 */

type DocumentType = '0' | '1' | '6';

interface SunatRequestBody {
  saleId: string;
  total: number;
  paymentMethod: string;
  issuedAt?: string;
  serie?: string;
  correlativo?: string | number;
  items: Array<{
    productId: string;
    description: string;
    quantity: number;
    unitPrice: number;
  }>;
  customer?: {
    name?: string;
    documentType?: DocumentType;
    documentNumber?: string;
  };
}

interface InvoiceLine {
  id: number;
  description: string;
  quantity: number;
  price: number;
  unitValue: number;
  lineExtension: number;
  igv: number;
}

interface CertificatePair {
  keyPem: string;
  certPem: string;
}

const IGV_RATE = 0.18;
const DEFAULT_CURRENCY = 'PEN';

const DOCUMENT_DEFAULTS: Record<DocumentType, { scheme: string; placeholder: string }> = {
  '0': { scheme: '-', placeholder: '00000000' },
  '1': { scheme: '1', placeholder: '00000000' },
  '6': { scheme: '6', placeholder: '00000000000' },
};

const getEnv = (key: string) => process.env[key] ?? process.env[key.replace(/-/g, '_')];
const getRequiredEnv = (key: string) => {
  const value = getEnv(key);
  if (!value) {
    throw new Error(`La variable de entorno ${key} es obligatoria para emitir comprobantes electrónicos.`);
  }
  return value;
};

let certificateCache: CertificatePair | null = null;

const toFixed = (value: number) => (Math.round((value + Number.EPSILON) * 100) / 100).toFixed(2);

const normalizeDateParts = (date: Date) => {
  const tzDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  const isoString = tzDate.toISOString();
  const [issueDate, timePart] = isoString.split('T');
  const issueTime = timePart?.slice(0, 8) ?? '00:00:00';
  return { issueDate, issueTime };
};

const sanitizeCorrelative = (correlativo: string | number | undefined) => {
  if (typeof correlativo === 'number') {
    return correlativo.toString().padStart(8, '0');
  }
  if (typeof correlativo === 'string' && correlativo.trim().length > 0) {
    const numeric = correlativo.replace(/\D/g, '');
    return numeric.padStart(8, '0').slice(-8);
  }
  return Date.now().toString().slice(-8);
};

const loadCertificatePair = (): CertificatePair => {
  if (certificateCache) {
    return certificateCache;
  }
  const base64 = getRequiredEnv('SUNAT_CERT_BASE64');
  const password = getRequiredEnv('SUNAT_CERT_PASSWORD');

  const p12Der = forge.util.decode64(base64);
  const p12Asn1 = forge.asn1.fromDer(p12Der);
  const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);

  let keyPem = '';
  let certPem = '';

  for (const safeContent of p12.safeContents ?? []) {
    for (const safeBag of safeContent.safeBags ?? []) {
      if (safeBag.type === forge.pki.oids.pkcs8ShroudedKeyBag && safeBag.key) {
        keyPem = forge.pki.privateKeyToPem(safeBag.key);
      }
      if (safeBag.type === forge.pki.oids.certBag && safeBag.cert) {
        certPem = forge.pki.certificateToPem(safeBag.cert);
      }
    }
  }

  if (!keyPem || !certPem) {
    throw new Error('No se pudo extraer la llave privada o el certificado del archivo P12 provisto.');
  }

  certificateCache = { keyPem, certPem };
  return certificateCache;
};

const buildInvoiceLines = (items: SunatRequestBody['items']): { lines: InvoiceLine[]; taxable: number; igv: number; total: number } => {
  const lines: InvoiceLine[] = [];
  let taxable = 0;
  let igv = 0;

  items.forEach((item, index) => {
    const unitValue = item.unitPrice / (1 + IGV_RATE);
    const lineExtension = unitValue * item.quantity;
    const igvLine = lineExtension * IGV_RATE;

    const normalized: InvoiceLine = {
      id: index + 1,
      description: item.description,
      quantity: item.quantity,
      price: item.unitPrice,
      unitValue,
      lineExtension,
      igv: igvLine,
    };
    lines.push(normalized);
    taxable += lineExtension;
    igv += igvLine;
  });

  const total = taxable + igv;
  return { lines, taxable, igv, total };
};

const buildInvoiceXml = (input: {
  invoiceId: string;
  uuid: string;
  issueDate: string;
  issueTime: string;
  currency: string;
  supplier: { ruc: string; legalName: string };
  customer: { scheme: string; documentNumber: string; name: string };
  totals: { taxable: number; igv: number; total: number };
  lines: InvoiceLine[];
}) => {
  const { invoiceId, uuid, issueDate, issueTime, currency, supplier, customer, totals, lines } = input;

  const invoiceLinesXml = lines
    .map(
      (line) => `    <cac:InvoiceLine>
        <cbc:ID>${line.id}</cbc:ID>
        <cbc:InvoicedQuantity unitCode="NIU">${line.quantity}</cbc:InvoicedQuantity>
        <cbc:LineExtensionAmount currencyID="${currency}">${toFixed(line.lineExtension)}</cbc:LineExtensionAmount>
        <cac:PricingReference>
            <cac:AlternativeConditionPrice>
                <cbc:PriceAmount currencyID="${currency}">${toFixed(line.price)}</cbc:PriceAmount>
                <cbc:PriceTypeCode>01</cbc:PriceTypeCode>
            </cac:AlternativeConditionPrice>
        </cac:PricingReference>
        <cac:TaxTotal>
            <cbc:TaxAmount currencyID="${currency}">${toFixed(line.igv)}</cbc:TaxAmount>
            <cac:TaxSubtotal>
                <cbc:TaxableAmount currencyID="${currency}">${toFixed(line.lineExtension)}</cbc:TaxableAmount>
                <cbc:TaxAmount currencyID="${currency}">${toFixed(line.igv)}</cbc:TaxAmount>
                <cac:TaxCategory>
                    <cbc:Percent>${(IGV_RATE * 100).toFixed(0)}</cbc:Percent>
                    <cbc:TaxExemptionReasonCode>10</cbc:TaxExemptionReasonCode>
                    <cac:TaxScheme>
                        <cbc:ID>1000</cbc:ID>
                        <cbc:Name>IGV</cbc:Name>
                        <cbc:TaxTypeCode>VAT</cbc:TaxTypeCode>
                    </cac:TaxScheme>
                </cac:TaxCategory>
            </cac:TaxSubtotal>
        </cac:TaxTotal>
        <cac:Item>
            <cbc:Description><![CDATA[${line.description}]]></cbc:Description>
        </cac:Item>
        <cac:Price>
            <cbc:PriceAmount currencyID="${currency}">${toFixed(line.unitValue)}</cbc:PriceAmount>
        </cac:Price>
    </cac:InvoiceLine>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
         xmlns:ds="http://www.w3.org/2000/09/xmldsig#"
         xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2">
    <ext:UBLExtensions>
        <ext:UBLExtension>
            <ext:ExtensionContent></ext:ExtensionContent>
        </ext:UBLExtension>
    </ext:UBLExtensions>
    <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
    <cbc:CustomizationID>2.0</cbc:CustomizationID>
    <cbc:ProfileID>0101</cbc:ProfileID>
    <cbc:ID>${invoiceId}</cbc:ID>
    <cbc:UUID>${uuid}</cbc:UUID>
    <cbc:IssueDate>${issueDate}</cbc:IssueDate>
    <cbc:IssueTime>${issueTime}</cbc:IssueTime>
    <cbc:InvoiceTypeCode listAgencyName="PE:SUNAT" listName="Tipo de Documento" listURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo01">03</cbc:InvoiceTypeCode>
    <cbc:DocumentCurrencyCode>${currency}</cbc:DocumentCurrencyCode>
    <cbc:LineCountNumeric>${lines.length}</cbc:LineCountNumeric>
    <cac:Signature>
        <cbc:ID>${supplier.ruc}</cbc:ID>
        <cac:SignatoryParty>
            <cac:PartyIdentification>
                <cbc:ID>${supplier.ruc}</cbc:ID>
            </cac:PartyIdentification>
            <cac:PartyName>
                <cbc:Name><![CDATA[${supplier.legalName}]]></cbc:Name>
            </cac:PartyName>
        </cac:SignatoryParty>
        <cac:DigitalSignatureAttachment>
            <cac:ExternalReference>
                <cbc:URI>#SignatureSP</cbc:URI>
            </cac:ExternalReference>
        </cac:DigitalSignatureAttachment>
    </cac:Signature>
    <cac:AccountingSupplierParty>
        <cac:Party>
            <cac:PartyIdentification>
                <cbc:ID schemeID="6">${supplier.ruc}</cbc:ID>
            </cac:PartyIdentification>
            <cac:PartyLegalEntity>
                <cbc:RegistrationName><![CDATA[${supplier.legalName}]]></cbc:RegistrationName>
            </cac:PartyLegalEntity>
        </cac:Party>
    </cac:AccountingSupplierParty>
    <cac:AccountingCustomerParty>
        <cac:Party>
            <cac:PartyIdentification>
                <cbc:ID schemeID="${customer.scheme}">${customer.documentNumber}</cbc:ID>
            </cac:PartyIdentification>
            <cac:PartyLegalEntity>
                <cbc:RegistrationName><![CDATA[${customer.name}]]></cbc:RegistrationName>
            </cac:PartyLegalEntity>
        </cac:Party>
    </cac:AccountingCustomerParty>
    <cac:TaxTotal>
        <cbc:TaxAmount currencyID="${currency}">${toFixed(totals.igv)}</cbc:TaxAmount>
        <cac:TaxSubtotal>
            <cbc:TaxableAmount currencyID="${currency}">${toFixed(totals.taxable)}</cbc:TaxableAmount>
            <cbc:TaxAmount currencyID="${currency}">${toFixed(totals.igv)}</cbc:TaxAmount>
            <cac:TaxCategory>
                <cac:TaxScheme>
                    <cbc:ID>1000</cbc:ID>
                    <cbc:Name>IGV</cbc:Name>
                    <cbc:TaxTypeCode>VAT</cbc:TaxTypeCode>
                </cac:TaxScheme>
            </cac:TaxCategory>
        </cac:TaxSubtotal>
    </cac:TaxTotal>
    <cac:LegalMonetaryTotal>
        <cbc:LineExtensionAmount currencyID="${currency}">${toFixed(totals.taxable)}</cbc:LineExtensionAmount>
        <cbc:TaxInclusiveAmount currencyID="${currency}">${toFixed(totals.total)}</cbc:TaxInclusiveAmount>
        <cbc:PayableAmount currencyID="${currency}">${toFixed(totals.total)}</cbc:PayableAmount>
    </cac:LegalMonetaryTotal>
${invoiceLinesXml}
</Invoice>`;
};

const signInvoiceXml = (xml: string, pair: CertificatePair) => {
  const signer = new SignedXml();
  signer.signatureAlgorithm = 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256';
  signer.addReference("//*[local-name()='Invoice']", ['http://www.w3.org/2000/09/xmldsig#enveloped-signature'], 'http://www.w3.org/2001/04/xmlenc#sha256');
  signer.signingKey = pair.keyPem;
  const cleanCert = pair.certPem.replace(/-----BEGIN CERTIFICATE-----/g, '').replace(/-----END CERTIFICATE-----/g, '').replace(/\s+/g, '');
  signer.keyInfoProvider = {
    getKeyInfo: () => `<ds:X509Data><ds:X509Certificate>${cleanCert}</ds:X509Certificate></ds:X509Data>`,
  };
  signer.signatureId = 'SignatureSP';
  signer.computeSignature(xml, {
    location: { reference: "//*[local-name()='ExtensionContent']", action: 'append' },
  });
  return signer.getSignedXml();
};

const zipSignedXml = (xml: string, fileName: string) => {
  const buffer = Buffer.from(xml, 'utf-8');
  const zip = new AdmZip();
  zip.addFile(`${fileName}.xml`, buffer);
  const zipBuffer = zip.toBuffer();
  const hash = crypto.createHash('sha256').update(buffer).digest('base64');
  return { archivo: zipBuffer.toString('base64'), hash };
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SunatRequestBody;
    if (!body.saleId || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ status: 'error', message: 'Faltan datos para generar la boleta.' }, { status: 400 });
    }

    const supplierRuc = getRequiredEnv('SUNAT_RUC');
    const supplierName = getRequiredEnv('SUNAT_RAZON_SOCIAL');

    const sunatConfig = resolveSunatConfig();
    if (!sunatConfig.clientId || !sunatConfig.clientSecret) {
      return NextResponse.json({ status: 'error', message: 'Credenciales de SUNAT no configuradas.' }, { status: 500 });
    }

    const { lines, taxable, igv, total } = buildInvoiceLines(body.items);
    const totalRounded = Number(toFixed(total));
    if (Math.abs(totalRounded - body.total) > 0.05) {
      return NextResponse.json(
        {
          status: 'error',
          message: 'El total calculado y el total enviado no coinciden. Verifica los montos.',
        },
        { status: 400 }
      );
    }

    const dateSource = body.issuedAt ? new Date(body.issuedAt) : new Date();
    const { issueDate, issueTime } = normalizeDateParts(dateSource);
    const serie = body.serie ?? getEnv('SUNAT_BOLETA_SERIE') ?? 'B001';
    const correlativo = sanitizeCorrelative(body.correlativo ?? body.saleId);
    const invoiceId = `${serie}-${correlativo}`;

    const rawDocumentType = (body.customer?.documentType ?? '0') as DocumentType;
    const documentType: DocumentType = ['0', '1', '6'].includes(rawDocumentType) ? rawDocumentType : '0';
    const defaults = DOCUMENT_DEFAULTS[documentType];
    const docNumber = documentType === '0'
      ? defaults.placeholder
      : (body.customer?.documentNumber?.replace(/\D/g, '') || defaults.placeholder);
    const customerName = body.customer?.name?.trim() || 'CLIENTE VARIOS';

    const invoiceXml = buildInvoiceXml({
      invoiceId,
      uuid: uuidv4(),
      issueDate,
      issueTime,
      currency: DEFAULT_CURRENCY,
      supplier: { ruc: supplierRuc, legalName: supplierName },
      customer: { scheme: defaults.scheme, documentNumber: docNumber, name: customerName },
      totals: { taxable, igv, total },
      lines,
    });

    const certificatePair = loadCertificatePair();
    const signedXml = signInvoiceXml(invoiceXml, certificatePair);
    const fileKey = `${supplierRuc}-03-${serie}-${correlativo}`;
    const { archivo, hash } = zipSignedXml(signedXml, fileKey);

    let token: string;
    try {
      const tokenResult = await getSunatToken(sunatConfig);
      token = tokenResult.token;
    } catch (error) {
      if (error instanceof SunatTokenError) {
        return NextResponse.json(
          {
            status: 'error',
            message: error.message,
            details: { status: error.status, body: error.body },
          },
          { status: 502 }
        );
      }
      throw error;
    }

    const payload = {
      archivo,
      hash,
      nomArchivo: `${fileKey}.zip`,
    };

    const response = await fetch(sunatConfig.receiptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const json = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        {
          status: 'rejected',
          message: json?.message ?? 'SUNAT rechazó la boleta.',
          details: json,
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      status: 'accepted',
      ticket: json?.numTicket ?? json?.ticket ?? null,
      response: json,
      referencia: invoiceId,
    });
  } catch (error) {
    console.error('Error SUNAT:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: (error as Error).message ?? 'Error inesperado generando boleta.',
      },
      { status: 500 }
    );
  }
}
