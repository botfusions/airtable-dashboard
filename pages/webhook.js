export default async function handler(req, res) {
  // Sadece POST isteklerini kabul et
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Airtable webhook payload'ını logla
    console.log('Webhook received:', JSON.stringify(req.body, null, 2));
    
    // Webhook'u başarıyla aldığımızı bildir
    res.status(200).json({ 
      received: true, 
      timestamp: new Date().toISOString(),
      message: 'Webhook processed successfully'
    });
    
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}
