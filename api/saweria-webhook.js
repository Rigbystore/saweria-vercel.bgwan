// api/saweria-webhook.js
// Vercel Serverless Function untuk Saweria → Roblox
// ✅ FIXED: Comprehensive field detection untuk Saweria

const axios = require('axios');

module.exports = async (req, res) => {
    // ═══════════════════════════════════════════════════════════
    // CORS Headers
    // ═══════════════════════════════════════════════════════════
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Health check
    if (req.method === 'GET') {
        return res.status(200).json({
            status: 'OK',
            message: '🎮 Saweria to Roblox webhook ready!',
            timestamp: new Date().toISOString()
        });
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // ═══════════════════════════════════════════════════════════
    // Process Donation
    // ═══════════════════════════════════════════════════════════
    try {
        const donation = req.body;
        
        // 🔍 LOG RAW DATA - PENTING UNTUK DEBUG!
        console.log('═══════════════════════════════════════════════════');
        console.log('📩 RAW SAWERIA WEBHOOK:');
        console.log(JSON.stringify(donation, null, 2));
        console.log('═══════════════════════════════════════════════════');
        
        // Log semua keys yang ada
        console.log('🔑 Available keys:', Object.keys(donation));

        // ═══════════════════════════════════════════════════════════
        // Parse Donor Name - Cek SEMUA kemungkinan field dari Saweria
        // ═══════════════════════════════════════════════════════════
        let donorName = "Anonymous";
        
        // Check direct fields
        const nameFields = [
            'donator_name', 'donatur_name', 'donor_name', 'from_name',
            'sender_name', 'supporter_name', 'name', 'donatur', 'donator',
            'donor', 'from', 'sender', 'supporter', 'username', 'user_name',
            'user', 'nick', 'nickname', 'emiten_name', 'streamer_name'
        ];
        
        for (const field of nameFields) {
            if (donation[field] && donation[field] !== '' && donation[field] !== 'Anonymous') {
                donorName = donation[field];
                console.log(`✅ Found donor name in field: ${field} = ${donorName}`);
                break;
            }
        }
        
        // Check nested objects if still Anonymous
        if (donorName === "Anonymous") {
            // Check nested 'data' object
            if (donation.data && typeof donation.data === 'object') {
                for (const field of nameFields) {
                    if (donation.data[field] && donation.data[field] !== '') {
                        donorName = donation.data[field];
                        console.log(`✅ Found donor name in data.${field} = ${donorName}`);
                        break;
                    }
                }
            }
            
            // Check nested 'supporter' object
            if (donation.supporter && typeof donation.supporter === 'object') {
                donorName = donation.supporter.name || donation.supporter.username || donorName;
            }
            
            // Check nested 'user' object
            if (donation.user && typeof donation.user === 'object') {
                donorName = donation.user.name || donation.user.username || donorName;
            }
        }

        // ═══════════════════════════════════════════════════════════
        // Parse Amount
        // ═══════════════════════════════════════════════════════════
        let amount = 0;
        const amountFields = [
            'amount_raw', 'amount', 'total', 'nominal', 'value', 
            'donation_amount', 'net_amount', 'gross_amount'
        ];
        
        for (const field of amountFields) {
            const val = parseInt(donation[field]);
            if (!isNaN(val) && val > 0) {
                amount = val;
                console.log(`✅ Found amount in field: ${field} = ${amount}`);
                break;
            }
        }
        
        // Check nested data
        if (amount === 0 && donation.data) {
            for (const field of amountFields) {
                const val = parseInt(donation.data[field]);
                if (!isNaN(val) && val > 0) {
                    amount = val;
                    break;
                }
            }
        }

        // ═══════════════════════════════════════════════════════════
        // Parse Message
        // ═══════════════════════════════════════════════════════════
        let message = "";
        const messageFields = ['message', 'msg', 'comment', 'note', 'pesan', 'text', 'content'];
        
        for (const field of messageFields) {
            if (donation[field] && donation[field] !== '') {
                message = donation[field];
                break;
            }
        }
        
        if (!message && donation.data) {
            for (const field of messageFields) {
                if (donation.data[field] && donation.data[field] !== '') {
                    message = donation.data[field];
                    break;
                }
            }
        }

        // Build notification data
        const notifData = {
            donor_name: donorName,
            amount: amount,
            message: message,
            timestamp: Date.now()
        };

        console.log('═══════════════════════════════════════════════════');
        console.log('📤 FINAL PARSED DATA:');
        console.log('   Donor:', donorName);
        console.log('   Amount:', amount);
        console.log('   Message:', message);
        console.log('═══════════════════════════════════════════════════');

        // ═══════════════════════════════════════════════════════════
        // Validate Environment
        // ═══════════════════════════════════════════════════════════
        const ROBLOX_API_KEY = process.env.ROBLOX_API_KEY;
        const UNIVERSE_ID = process.env.UNIVERSE_ID;
        const TOPIC_NAME = "SaweriaDonation";

        if (!ROBLOX_API_KEY || !UNIVERSE_ID) {
            console.error('❌ Missing environment variables!');
            return res.status(200).json({
                success: false,
                error: 'Server config error',
                debug: { donorName, amount, message }
            });
        }

        // ═══════════════════════════════════════════════════════════
        // Send to Roblox
        // ═══════════════════════════════════════════════════════════
        const robloxUrl = `https://apis.roblox.com/messaging-service/v1/universes/${UNIVERSE_ID}/topics/${TOPIC_NAME}`;

        await axios.post(
            robloxUrl,
            { message: JSON.stringify(notifData) },
            {
                headers: {
                    'x-api-key': ROBLOX_API_KEY,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            }
        );

        console.log('✅ Successfully sent to Roblox!');

        return res.status(200).json({
            success: true,
            donor: donorName,
            amount: amount,
            message: message
        });

    } catch (error) {
        console.error('❌ ERROR:', error.message);
        
        if (error.response) {
            console.error('Roblox API Error:', error.response.status, error.response.data);
        }

        return res.status(200).json({
            success: false,
            error: error.message
        });
    }
};
