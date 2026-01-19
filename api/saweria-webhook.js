// api/saweria-webhook.js
const axios = require('axios');

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(200).json({ 
      status: 'OK',
      message: 'Saweria webhook endpoint ready!' 
    });
  }
  
  try {
    const donation = req.body;
    
    const donationData = {
      donor_name: donation.donatur_name || donation.donor_name || "Anonymous",
      amount: parseInt(donation.amount_raw || donation.amount) || 0,
      message: donation.message || "",
      timestamp: Date.now()
    };
    
    console.log('📥 Received donation:', donationData);
    
    const ROBLOX_API_KEY = process.env.ROBLOX_API_KEY;
    const UNIVERSE_ID = process.env.UNIVERSE_ID;
    
    if (!ROBLOX_API_KEY || !UNIVERSE_ID) {
      console.error('❌ Missing env variables!');
      return res.status(500).json({ error: 'Server configuration error' });
    }
    
    // ✅ URL DIPERBAIKI: HAPUS SPASI
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
    
    console.log('✅ Sent to Roblox successfully!');
    
    return res.status(200).json({ 
      success: true,
      donor: donationData.donor_name,
      amount: donationData.amount
    });
    
  } catch (error) {
    console.error('💥 Error:', error.message);
    if (error.response) {
      console.error('Roblox API response:', error.response.data);
    }
    return res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
}
