import logoUrl from '@/assets/logo.png';

export interface InvoiceData {
  orderNumber: string;
  orderDate: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  shippingAddress: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
  };
  items: Array<{
    name: string;
    quantity: number;
    goldType: string;
    weight: number;
    goldPrice: number;
    labourFee: number;
    subtotal: number;
  }>;
  subtotal: number;
  shippingFee: number;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
}

export async function generateInvoicePDF(invoiceData: InvoiceData): Promise<void> {
  // Create a new window for printing
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    throw new Error("Could not open print window");
  }

  const invoiceHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Invoice - ${invoiceData.orderNumber}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; padding: 40px; }
        .header { text-align: center; margin-bottom: 40px; border-bottom: 3px solid #FFD700; padding-bottom: 20px; }
        .header img { max-width: 150px; margin-bottom: 15px; }
        .header h1 { color: #B8860B; font-size: 32px; margin-bottom: 10px; }
        .info-section { margin-bottom: 30px; }
        .info-section h2 { font-size: 16px; color: #333; margin-bottom: 10px; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
        .info-row { margin-bottom: 5px; font-size: 14px; }
        .label { font-weight: bold; display: inline-block; width: 150px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th { background-color: #FFD700; color: #000; padding: 12px; text-align: left; font-size: 14px; }
        td { padding: 10px; border-bottom: 1px solid #ddd; font-size: 13px; }
        tr:hover { background-color: #f9f9f9; }
        .totals { margin-top: 20px; text-align: right; }
        .totals-row { margin: 8px 0; font-size: 14px; }
        .totals-row.total { font-size: 18px; font-weight: bold; color: #B8860B; margin-top: 15px; padding-top: 15px; border-top: 2px solid #ddd; }
        .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #ddd; padding-top: 20px; }
        @media print {
          body { padding: 20px; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <img src="${logoUrl}" alt="JJ Emas Logo" />
        <h1>INVOICE</h1>
        <p style="font-size: 14px; color: #666;">Premium Gold Jewelry</p>
      </div>

      <div class="info-section">
        <h2>Order Information</h2>
        <div class="info-row"><span class="label">Order Number:</span> ${invoiceData.orderNumber}</div>
        <div class="info-row"><span class="label">Order Date:</span> ${new Date(invoiceData.orderDate).toLocaleDateString()}</div>
        <div class="info-row"><span class="label">Payment Method:</span> ${invoiceData.paymentMethod}</div>
        <div class="info-row"><span class="label">Payment Status:</span> ${invoiceData.paymentStatus}</div>
      </div>

      <div class="info-section">
        <h2>Customer Information</h2>
        <div class="info-row"><span class="label">Name:</span> ${invoiceData.customerName}</div>
        <div class="info-row"><span class="label">Phone:</span> ${invoiceData.customerPhone}</div>
        ${invoiceData.customerEmail ? `<div class="info-row"><span class="label">Email:</span> ${invoiceData.customerEmail}</div>` : ""}
      </div>

      <div class="info-section">
        <h2>Shipping Address</h2>
        <div class="info-row">${invoiceData.shippingAddress.line1}</div>
        ${invoiceData.shippingAddress.line2 ? `<div class="info-row">${invoiceData.shippingAddress.line2}</div>` : ""}
        <div class="info-row">${invoiceData.shippingAddress.city}, ${invoiceData.shippingAddress.state} ${invoiceData.shippingAddress.postcode}</div>
        <div class="info-row">${invoiceData.shippingAddress.country}</div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Product</th>
            <th>Qty</th>
            <th>Cost (Unit)</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${invoiceData.items.map(item => {
            const unit = item.quantity ? item.subtotal / item.quantity : item.subtotal;
            return `
              <tr>
                <td>${item.name}</td>
                <td>${item.quantity}</td>
                <td>RM ${unit.toFixed(2)}</td>
                <td>RM ${item.subtotal.toFixed(2)}</td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>

      <div class="totals">
        <div class="totals-row">Subtotal: RM ${invoiceData.subtotal.toFixed(2)}</div>
        <div class="totals-row">Shipping Fee: RM ${invoiceData.shippingFee.toFixed(2)}</div>
        <div class="totals-row total">TOTAL: RM ${invoiceData.total.toFixed(2)}</div>
      </div>

      <div class="footer">
        <p>Thank you for your purchase!</p>
        <p>For inquiries, please contact us via WhatsApp</p>
      </div>

      <div class="no-print" style="text-align: center; margin-top: 30px;">
        <button onclick="window.print()" style="padding: 12px 30px; background: #FFD700; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; font-weight: bold;">
          Print Invoice
        </button>
        <button onclick="window.close()" style="padding: 12px 30px; background: #ddd; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; margin-left: 10px;">
          Close
        </button>
      </div>
    </body>
    </html>
  `;

  printWindow.document.write(invoiceHTML);
  printWindow.document.close();
}
