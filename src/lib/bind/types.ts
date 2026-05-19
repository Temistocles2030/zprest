// Tipos de eventos webhook BindX (nombres reales de la API)
export type BindWebhookEventType =
  | "endpoint.created"          // validación al registrar webhook
  | "debin.acredited"           // DEBIN cobrado exitosamente
  | "debin.rejected"            // DEBIN rechazado por el comprador
  | "debin.refunded"            // DEBIN disputado/devuelto
  | "transfer.cvu.received"     // transferencia recibida en CVU del cliente ← principal
  | "transfer.cbu.received"     // transferencia recibida en CBU de Zprest
  | "transfer.cvu.reversed"     // reversión de transferencia CVU
  | "transfer.mep.completed"    // transferencia MEP completada
  | "transfer.mep.rejected";    // transferencia MEP rechazada

export interface BindWebhookEnvelope {
  id: string;
  object: "ApiTransaction";
  created: string;
  type: BindWebhookEventType;
  redeliveries: number;
  data: BindWebhookData;
}

// transfer.cvu.received — el más importante para Zprest
export interface BindTransferCVUReceived {
  id: string;
  type: "TRANSFER";
  details: {
    origin_credit: {
      cvu: string;   // ← CVU del cliente que recibió el pago (identifica al cliente)
      cuit: string;
    };
  };
  status: "COMPLETED";
  charge: { summary: string; value: { currency: string; amount: number } };
}

// debin.acredited / debin.rejected / debin.refunded
export interface BindDebinEvent {
  id: string;
  type: "DEBIN";
  details: {
    origin_id: string;          // ← tu referencia (origin_id que enviaste)
    sellerCuit: string;
    sellerAccountCBU: string;
    buyerAccountCBU: string;
    buyerCuit: string;
    buyerAccountLabel: string;
  };
  status: "COMPLETED" | "REJECTED_CLIENT" | "ACCREDITED";
  charge: { summary: string; value: { currency: string; amount: number } };
}

// transfer.cbu.received
export interface BindTransferCBUReceived {
  credit: { bank_account: { tax_id: string; cbu: string; name: string } };
  debit: { bank_account: { tax_id: string; cbu: string } };
  transfer_type: "TRANSFERENCIA" | "CREDIN";
  net_id: string;
  amount: number;
  currency: string;
  concept: string;
  operation_date: string;
}

export type BindWebhookData =
  | BindTransferCVUReceived
  | BindDebinEvent
  | BindTransferCBUReceived
  | Record<string, unknown>;
