/**
 * UPI deep link (NPCI "upi://pay" format). The buyer's UPI app opens with the seller's UPI ID, name, amount
 * and our order reference filled in. Money goes straight from buyer to seller; it never passes through us.
 */
export function upiPayLink({ upiId, payeeName, amountPaise, orderRef }: { upiId: string; payeeName: string; amountPaise: number; orderRef: string }): string {
  const params = [
    ['pa', upiId],
    ['pn', payeeName],
    ['am', (amountPaise / 100).toFixed(2)],
    ['cu', 'INR'],
    ['tn', `AgriAI order ${orderRef}`],
    ['tr', orderRef],
  ];
  // encodeURIComponent (not URLSearchParams): some UPI apps show "+" instead of a space.
  return `upi://pay?${params.map(([key, value]) => `${key}=${encodeURIComponent(value ?? '')}`).join('&')}`;
}
