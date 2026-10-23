import type { OrderStatus } from '../modules/orders/orderStateMachine.js';

/** Who a marketplace notification is for. */
export type Audience = 'buyer' | 'seller' | 'coordinator';

export interface OrderFacts {
  ref: string;
  buyerName: string;
  sellerName: string;
  quantity: number;
  unit: string;
  product: string;
  totalRupees: string;
  priceRupees: string;
  isPriceRequest: boolean;
}

/** Short Hindi title per order status (in-app list and phone notification). */
export const ORDER_STATUS_TITLES: Record<OrderStatus, string> = {
  requested: 'नया ऑर्डर',
  accepted: 'ऑर्डर मंज़ूर हुआ',
  rejected: 'ऑर्डर मना हुआ',
  ready: 'माल तैयार है',
  out_for_delivery: 'सामान डिलीवरी पर निकला',
  ready_for_pickup: 'सामान उठाने के लिए तैयार',
  delivered: 'सामान पहुँच गया',
  paid: 'पैसे मिल गए',
  completed: 'ऑर्डर पूरा हुआ',
  cancelled: 'ऑर्डर रद्द हुआ',
};

/** One extra sentence telling this person what to do next. */
const NEXT_STEP: Partial<Record<OrderStatus, Partial<Record<Audience, string>>>> = {
  requested: { buyer: 'विक्रेता के जवाब का इंतज़ार करें।' },
  accepted: { buyer: 'विक्रेता का नंबर और UPI ऐप में दिखेगा।' },
  rejected: { buyer: 'बाज़ार में दूसरा सामान देखें।' },
  ready_for_pickup: { buyer: 'जाकर सामान उठा लें।' },
  delivered: { seller: 'पैसे मिलने पर "पैसे मिल गए" दबाएँ।' },
  paid: { buyer: 'ऑर्डर पूरा करें और रेटिंग दें।' },
};

/** The notification text for one person about one order step. */
export function orderMessage(status: OrderStatus, audience: Audience, facts: OrderFacts): { title: string; body: string } {
  const what = `${facts.quantity} ${facts.unit} ${facts.product}`;

  if (status === 'requested' && audience === 'seller') {
    return facts.isPriceRequest
      ? {
          title: 'भाव पूछा गया',
          body: `${facts.buyerName} ${what} ₹${facts.priceRupees} प्रति ${facts.unit} में लेना चाहते हैं। स्वीकार करें या मना करें।`,
        }
      : { title: 'नया ऑर्डर आया', body: `${facts.buyerName} ने ${what} माँगा है। कुल ₹${facts.totalRupees}। स्वीकार करें या मना करें।` };
  }
  if (audience === 'coordinator') {
    return {
      title: `${ORDER_STATUS_TITLES[status]} · ${facts.ref}`,
      body: `${facts.buyerName} ← ${facts.sellerName}: ${what}, ₹${facts.totalRupees}`,
    };
  }
  const next = NEXT_STEP[status]?.[audience];
  return {
    title: ORDER_STATUS_TITLES[status],
    body: `${what} (ऑर्डर ${facts.ref})।${next ? ` ${next}` : ''}`,
  };
}
