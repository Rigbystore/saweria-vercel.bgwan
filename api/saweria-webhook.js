// api/saweria-webhook.js
// ✅ Vercel Serverless Function - Compatible with Saweria Webhook

const axios = require('axios');

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Health check
  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'OK',
      message: 'Saweria webhook endpoint ready!',
      universeId: process.env.UNIVERSE_ID ? 'Configured' : 'MISSING'
    });
  }

  // Only accept POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const donation = req.body;

    // Parse donor name (handle various field names from Saweria)
    const donorName = 
      donation.donator_name ||
      donation.donor_name ||
      donation.name ||
      donation.donatur ||
      "Anonymous";

    // Parse amount (handle various formats)
    const amount = 
      parseInt(donation.amount) ||
      parseInt(donation.total) ||
      parseInt(donation.amount_raw) ||
      parseInt(donation.nominal) ||
      0;

    // Parse message
    const message = 
      donation.message ||
      donation.comment ||
      donation.note ||
      donation.pesan ||
      "";

    const donationData = {
      donor_name: donorName,
      amount: amount,
      message: message,
      timestamp: Date.now(),
      donation_id: donation.id || ""
    };

    console.log('📥 Received donation:', JSON.stringify(donationData, null, 2));

    // Validate environment variables
    const ROBLOX_API_KEY = process.env.ROBLOX_API_KEY;
    const UNIVERSE_ID = process.env.UNIVERSE_ID;

    if (!ROBLOX_API_KEY || !UNIVERSE_ID) {
      console.error('❌ Missing environment variables!');
      return res.status(500).json({ 
        error: 'Server misconfigured: missing ROBLOX_API_KEY or UNIVERSE_ID' 
      });
    }

    // Send to Roblox MessagingService
    const robloxUrl = `https://apis.roblox.com/messaging-service/v1/universes/${UNIVERSE_ID}/topics/SaweriaDonation`;

    await axios.post(
      robloxUrl,
      { message: JSON.stringify(donationData) },
      {
        headers: {
          'x-api-key': ROBLOX_API_KEY,
          'Content-Type': 'application/json'
        },
        timeout: 5000
      }
    );

    console.log('✅ Successfully sent to Roblox!');
    
    return res.status(200).json({
      success: true,
      donor: donorName,
      amount: amount
    });

  } catch (error) {
    console.error('💥 Webhook error:', error.message);
    if (error.response) {
      console.error('Roblox API response:', error.response.data);
    }
    
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
