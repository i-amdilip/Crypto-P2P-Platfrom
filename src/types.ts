export interface User {
  id: number;
  telegram_id: string;
  username: string;
  first_name: string;
  last_name: string;
  photo_url: string;
  usdt_balance: number;
  inr_balance: number;
  rating: number;
  trades_completed: number;
  is_verified: boolean;
  is_admin: boolean;
  created_at: string;
}

export interface Ad {
  id: number;
  user_id: number;
  username: string;
  type: 'buy' | 'sell';
  price: number;
  min_limit: number;
  max_limit: number;
  payment_methods: string;
  terms: string;
  status: 'active' | 'paused' | 'deleted';
  rating: number;
  trades_completed: number;
  is_verified: boolean;
  created_at: string;
}

export interface Message {
  id: number;
  trade_id: number;
  sender_id: number;
  sender_username: string;
  text: string;
  image_url?: string;
  created_at: string;
}

export interface Trade {
  id: number;
  ad_id: number;
  buyer_id: number;
  seller_id: number;
  buyer_username: string;
  seller_username: string;
  amount_usdt: number;
  amount_inr: number;
  status: 'pending' | 'paid' | 'completed' | 'disputed' | 'cancelled';
  escrow_locked: boolean;
  terms: string;
  payment_methods: string;
  created_at: string;
  messages?: Message[];
  ad_type: 'buy' | 'sell';
}
