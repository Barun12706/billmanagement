export const calculateLineItemAmount = (qty, rate) => {
  return Number((qty * rate).toFixed(2));
};

export const calculateTotals = (lineItems) => {
  const subtotal = lineItems.reduce((acc, item) => acc + calculateLineItemAmount(item.qty || 0, item.rate || 0), 0);
  const sgst = Number((subtotal * 0.025).toFixed(2));
  const cgst = Number((subtotal * 0.025).toFixed(2));
  const grandTotal = subtotal + sgst + cgst;

  return {
    subtotal: Number(subtotal.toFixed(2)),
    sgst,
    cgst,
    grandTotal: Math.round(grandTotal), // Billing usually rounds to nearest rupee
    grandTotalExact: Number(grandTotal.toFixed(2)) // Keep exact for PDF display if needed
  };
};
