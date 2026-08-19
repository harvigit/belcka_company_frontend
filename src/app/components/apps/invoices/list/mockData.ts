export type InvoiceDocument = {
  id: number;
  file: string;
  type?: string | null;
  original_name?: string | null;
  url?: string | null;
  thumb?: string | null;
};

export type InvoiceRow = {
  id: number;
  company_id?: number;
  project_id?: number | null;
  project: string;
  projectManual?: string | null;
  address_id?: number;
  addressManual?: string | null;
  deliveryAddress: string;
  ordered_by?: number;
  orderedBy: string;
  orderedByImage?: string | null;
  supplier_id?: number | null;
  supplier: string;
  invoiceId: string;
  expectedDeliveryDate: string;
  description: string;
  note: string;
  totalExclVat: number;
  totalInclVat: number;
  document: string;
  document_url?: string | null;
  documents?: InvoiceDocument[];
  document_count?: number;
  creditNoteAmount: number | null;
};

export const mapInvoiceApiRow = (row: any): InvoiceRow => {
  const documents: InvoiceDocument[] = Array.isArray(row.documents)
    ? row.documents.map((d: any) => ({
        id: d.id,
        file: d.file,
        type: d.type,
        original_name: d.original_name,
        url: d.url,
        thumb: d.thumb,
      }))
    : [];

  const primaryName =
    documents[0]?.original_name ||
    documents[0]?.file ||
    row.document ||
    "-";

  const label =
    documents.length > 1
      ? `${primaryName} (+${documents.length - 1})`
      : primaryName;

  return {
    id: row.id,
    company_id: row.company_id,
    project_id: row.project_id,
    project: row.project || row.project_manual || "-",
    projectManual: row.project_manual || null,
    address_id: row.address_id,
    addressManual: row.address_manual || null,
    deliveryAddress: row.delivery_address || "-",
    ordered_by: row.ordered_by,
    orderedBy: row.ordered_by_name || "-",
    orderedByImage:
      row.ordered_by_thumb || row.ordered_by_image || null,
    supplier_id: row.supplier_id,
    supplier: row.supplier || "-",
    invoiceId: row.invoice_id || "",
    expectedDeliveryDate: row.expected_delivery_date || "-",
    description: row.description || "",
    note: row.note || "",
    totalExclVat: Number(row.total_excl_vat) || 0,
    totalInclVat: Number(row.total_incl_vat) || 0,
    document: label,
    document_url: row.document_url || documents[0]?.url || null,
    documents,
    document_count: row.document_count ?? documents.length,
    creditNoteAmount:
      row.credit_note_amount === null || row.credit_note_amount === undefined
        ? null
        : Number(row.credit_note_amount),
  };
};
