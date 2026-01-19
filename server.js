const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const ROBLOX_API_KEY = process.env.ROBLOX_API_KEY;
const UNIVERSE_ID = process.env.UNIVERSE_ID;
const TOPIC_NAME = "SaweriaDonation";

console.log('🚀 Starting Saweria to Roblox Bridge...');

app.post('/saweria-webhook', async (req, res) => {
    try {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📩 RAW WEBHOOK DATA:', JSON.stringify(req.body, null, 2));
        
        const donation = req.body;
        
        // Saweria bisa pakai berbagai field name, cek semua kemungkinan
        const donorName = donation.donator_name || 
                         donation.donor_name || 
                         donation.name || 
                         donation.donatur || 
                         "Anonymous";
        
        const amount = parseInt(donation.amount) || 
                      parseInt(donation.total) || 
                      parseInt(donation.amount_raw) ||
                      parseInt(donation.nominal) ||
                      0;
        
        const message = donation.message || 
                       donation.comment || 
                       donation.note || 
                       donation.pesan ||
                       "";
        
        const notifData = {
            donor_name: donorName,
            amount: amount,
            message: message,
            timestamp: Date.now(),
            donation_id: donation.id || ""
        };
        
        console.log('📤 FORMATTED DATA:', JSON.stringify(notifData, null, 2));
        console.log('💰 Parsed Amount:', amount);
        
        if (!ROBLOX_API_KEY || !UNIVERSE_ID) {
            throw new Error('Missing ROBLOX_API_KEY or UNIVERSE_ID');
        }
        
        const robloxUrl = `https://apis.roblox.com/messaging-service/v1/universes/${UNIVERSE_ID}/topics/${TOPIC_NAME}`;
        
        const response = await axios.post(
            robloxUrl,
            { message: JSON.stringify(notifData) },
            {
                headers: {
                    'x-api-key': ROBLOX_API_KEY,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        console.log('✅ Successfully sent to Roblox!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        res.status(200).json({ 
            success: true, 
            message: 'Donation processed',
            parsed_data: notifData
        });
        
    } catch (error) {
        console.error('❌ ERROR:', error.message);
        if (error.response) {
            console.error('Response:', error.response.data);
        }
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/', (req, res) => {
    res.send(`
        <h1>🎮 Saweria to Roblox Bridge</h1>
        <p>Status: <strong style="color: green;">Running</strong></p>
        <p>Universe ID: <strong>${UNIVERSE_ID || 'Not configured'}</strong></p>
        <hr>
        <p>Webhook: <code>POST /saweria-webhook</code></p>
    `);
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
