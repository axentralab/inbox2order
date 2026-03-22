const supabase = require('../db/supabase');

/**
 * Upsert customer — create if new, update if exists
 */
async function upsertCustomer(userId, { name, phone, address, district, source }) {
  const { data: existing } = await supabase
    .from('customers')
    .select('*')
    .eq('user_id', userId)
    .eq('phone', phone)
    .single();

  if (existing) {
    const { data } = await supabase
      .from('customers')
      .update({ name, address: address || existing.address, district: district || existing.district })
      .eq('id', existing.id)
      .select()
      .single();
    return data;
  }

  const { data } = await supabase
    .from('customers')
    .insert([{ user_id: userId, name, phone, address, district, source }])
    .select()
    .single();
  return data;
}

/**
 * Fraud detection — check suspicious patterns
 */
async function checkFraud(userId, phone) {
  const result = { is_suspicious: false, reasons: [] };

  // Check cancel history
  const { data: customer } = await supabase
    .from('customers')
    .select('cancel_count, is_flagged, flag_reason, total_orders')
    .eq('user_id', userId)
    .eq('phone', phone)
    .single();

  if (!customer) return result;

  if (customer.cancel_count >= 3) {
    result.is_suspicious = true;
    result.reasons.push(`${customer.cancel_count} previous cancellations`);
  }

  if (customer.is_flagged) {
    result.is_suspicious = true;
    result.reasons.push(customer.flag_reason || 'Previously flagged');
  }

  // Check duplicate orders in last 24h
  const oneDayAgo = new Date(); oneDayAgo.setDate(oneDayAgo.getDate() - 1);
  const { count: recentOrders } = await supabase
    .from('orders')
    .select('id', { count: 'exact' })
    .eq('user_id', userId)
    .eq('customer_phone', phone)
    .gte('created_at', oneDayAgo.toISOString());

  if (recentOrders >= 3) {
    result.is_suspicious = true;
    result.reasons.push(`${recentOrders} orders in last 24 hours`);
  }

  // Auto-flag if very suspicious
  if (result.is_suspicious && customer.cancel_count >= 5) {
    await supabase.from('customers')
      .update({ is_flagged: true, flag_reason: result.reasons.join(', ') })
      .eq('user_id', userId).eq('phone', phone);
  }

  return result;
}

/**
 * Get flagged customers
 */
async function getFlaggedCustomers(userId) {
  const { data } = await supabase
    .from('customers')
    .select('*')
    .eq('user_id', userId)
    .or('is_flagged.eq.true,cancel_count.gte.3')
    .order('cancel_count', { ascending: false });
  return data || [];
}

module.exports = { upsertCustomer, checkFraud, getFlaggedCustomers };
