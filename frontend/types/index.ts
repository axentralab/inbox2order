export type Plan = 'free' | 'starter' | 'pro' | 'business'

export interface User {
  id: string
  name: string
  email: string
  shop_name: string
  phone?: string
  plan: Plan
  plan_order_limit: number
  avatar_url?: string
}

export type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled' | 'returned'
export type OrderSource = 'facebook' | 'whatsapp' | 'manual'

export interface Order {
  id: string
  order_number: string
  customer_name: string
  customer_phone: string
  customer_address: string
  customer_district?: string
  product_name: string
  product_variant?: string
  quantity: number
  unit_price: number
  delivery_charge: number
  total_amount: number
  status: OrderStatus
  source: OrderSource
  notes?: string
  created_at: string
  updated_at: string
  deliveries?: Delivery[]
}

export interface Message {
  id: string
  platform: 'facebook' | 'whatsapp'
  sender_id: string
  sender_name?: string
  sender_phone?: string
  content: string
  direction: 'inbound' | 'outbound'
  is_read: boolean
  converted_to_order: boolean
  order_id?: string
  extracted_data?: ExtractedData
  received_at: string
}

export interface ExtractedData {
  name?: string
  phone?: string
  address?: string
  product?: string
  quantity?: number
  size?: string
  color?: string
  confidence?: number
}

export interface Conversation {
  id: string
  platform: 'facebook' | 'whatsapp'
  sender_id: string
  sender_name?: string
  sender_phone?: string
  last_message?: string
  last_message_at: string
  unread_count: number
  is_archived: boolean
}

export interface Product {
  id: string
  name: string
  description?: string
  price: number
  price_max?: number
  stock: number
  category?: string
  image_url?: string
  total_sold: number
  is_active: boolean
}

export interface Customer {
  id: string
  name: string
  phone: string
  address?: string
  district?: string
  total_orders: number
  total_spent: number
  cancel_count: number
  is_flagged: boolean
  flag_reason?: string
  source: string
  created_at: string
}

export interface Delivery {
  id: string
  order_id: string
  courier: 'steadfast' | 'pathao' | 'redx' | 'other'
  consignment_id?: string
  tracking_code?: string
  status: string
  courier_status?: string
  amount_to_collect?: number
  created_at: string
}
