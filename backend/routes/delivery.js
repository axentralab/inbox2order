const express = require('express');
const router = express.Router();
const axios = require('axios');
const authMiddleware = require('../middleware/auth');
const supabase = require('../db/supabase');

router.use(authMiddleware);

// ============================================================
// STEADFAST
// ============================================================
async function steadfastCreateParcel(apiKey, apiSecret, parcelData) {
  const response = await axios.post(
    `${process.env.STEADFAST_BASE_URL}/create_order`,
    parcelData,
    {
      headers: {
        'Api-Key': apiKey,
        'Secret-Key': apiSecret,
        'Content-Type': 'application/json'
      }
    }
  );
  return response.data;
}

async function steadfastTrack(apiKey, apiSecret, consignmentId) {
  const response = await axios.get(
    `${process.env.STEADFAST_BASE_URL}/status_by_cid/${consignmentId}`,
    { headers: { 'Api-Key': apiKey, 'Secret-Key': apiSecret } }
  );
  return response.data;
}

// ============================================================
// PATHAO
// ============================================================
async function pathaoGetToken(clientId, clientSecret) {
  const response = await axios.post(
    `${process.env.PATHAO_BASE_URL}/issue-token`,
    { client_id: clientId, client_secret: clientSecret, grant_type: 'client_credentials' }
  );
  return response.data.access_token;
}

async function pathaoCreateParcel(token, parcelData) {
  const response = await axios.post(
    `${process.env.PATHAO_BASE_URL}/orders`,
    parcelData,
    { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
  );
  return response.data;
}

// ============================================================
// ROUTES
// ============================================================

// GET /api/delivery - list deliveries
router.get('/', async (req, res) => {
  try {
    const { status, courier } = req.query;

    let query = supabase
      .from('deliveries')
      .select('*, orders(order_number, customer_name, customer_phone, customer_address, total_amount)')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);
    if (courier) query = query.eq('courier', courier);

    const { data, error } = await query;
    if (error) throw error;
    res.json({ deliveries: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/delivery/create - create parcel with courier
router.post('/create', async (req, res) => {
  try {
    const { order_id, courier } = req.body;

    if (!order_id || !courier) {
      return res.status(400).json({ error: 'order_id and courier required' });
    }

    // Get order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', order_id)
      .eq('user_id', req.user.id)
      .single();

    if (orderError || !order) return res.status(404).json({ error: 'Order not found' });

    // Get courier integration
    const { data: integration } = await supabase
      .from('integrations')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('platform', courier)
      .eq('is_active', true)
      .single();

    if (!integration) {
      return res.status(400).json({ error: `${courier} not connected. Add API key in Settings.` });
    }

    let courierResponse = null;
    let consignmentId = null;
    let trackingCode = null;

    if (courier === 'steadfast') {
      courierResponse = await steadfastCreateParcel(integration.api_key, integration.api_secret, {
        invoice: order.order_number,
        recipient_name: order.customer_name,
        recipient_phone: order.customer_phone,
        recipient_address: order.customer_address,
        cod_amount: order.total_amount,
        note: order.notes || ''
      });
      consignmentId = courierResponse?.consignment?.consignment_id;
      trackingCode = courierResponse?.consignment?.tracking_code;
    } else if (courier === 'pathao') {
      const token = await pathaoGetToken(integration.api_key, integration.api_secret);
      courierResponse = await pathaoCreateParcel(token, {
        store_id: integration.page_id,
        merchant_order_id: order.order_number,
        recipient_name: order.customer_name,
        recipient_phone: order.customer_phone,
        recipient_address: order.customer_address,
        recipient_city: 1, // Dhaka default
        delivery_type: 48,
        item_type: 2,
        item_quantity: order.quantity,
        item_weight: 0.5,
        amount_to_collect: order.total_amount
      });
      consignmentId = courierResponse?.data?.consignment_id;
      trackingCode = courierResponse?.data?.order_id;
    }

    // Save delivery record
    const { data: delivery, error: deliveryError } = await supabase
      .from('deliveries')
      .insert([{
        order_id,
        user_id: req.user.id,
        courier,
        consignment_id: consignmentId,
        tracking_code: trackingCode,
        merchant_order_id: order.order_number,
        recipient_name: order.customer_name,
        recipient_phone: order.customer_phone,
        recipient_address: order.customer_address,
        amount_to_collect: order.total_amount,
        courier_response: courierResponse,
        status: 'pickup_pending'
      }])
      .select()
      .single();

    if (deliveryError) throw deliveryError;

    // Update order status to shipped
    await supabase.from('orders')
      .update({ status: 'shipped' })
      .eq('id', order_id);

    res.status(201).json({ delivery, courier_response: courierResponse });
  } catch (err) {
    console.error('Create parcel error:', err.response?.data || err.message);
    res.status(500).json({
      error: 'Failed to create parcel',
      detail: err.response?.data || err.message
    });
  }
});

// GET /api/delivery/track/:id - track parcel
router.get('/track/:id', async (req, res) => {
  try {
    const { data: delivery } = await supabase
      .from('deliveries')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (!delivery) return res.status(404).json({ error: 'Delivery not found' });

    const { data: integration } = await supabase
      .from('integrations')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('platform', delivery.courier)
      .single();

    let trackingData = null;

    if (delivery.courier === 'steadfast' && delivery.consignment_id) {
      trackingData = await steadfastTrack(integration.api_key, integration.api_secret, delivery.consignment_id);

      // Update status
      const newStatus = mapSteadfastStatus(trackingData?.status);
      if (newStatus) {
        await supabase.from('deliveries')
          .update({ status: newStatus, courier_status: trackingData?.status })
          .eq('id', delivery.id);
      }
    }

    res.json({ delivery, tracking: trackingData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/delivery/connect - save courier credentials
router.post('/connect', async (req, res) => {
  try {
    const { courier, api_key, api_secret } = req.body;

    const { data, error } = await supabase
      .from('integrations')
      .upsert([{
        user_id: req.user.id,
        platform: courier,
        api_key, api_secret,
        is_active: true
      }], { onConflict: 'user_id,platform' })
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, courier });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function mapSteadfastStatus(status) {
  const map = {
    'in_review': 'pickup_pending',
    'pending': 'pickup_pending',
    'picked_up': 'picked',
    'in_transit': 'in_transit',
    'delivered': 'delivered',
    'cancelled': 'cancelled',
    'hold': 'hold',
    'partial_delivered': 'partial_delivered',
  };
  return map[status] || null;
}

module.exports = router;
