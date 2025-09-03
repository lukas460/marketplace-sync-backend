// api/amazonApiClient.js

// 1. Read the secure LWA credentials from Vercel's Environment Variables
const {
    AMAZON_CLIENT_ID,
    AMAZON_CLIENT_SECRET,
    AMAZON_REFRESH_TOKEN
} = process.env;

/**
 * Exchanges the long-lived Refresh Token for a short-lived Access Token.
 * This is the core of LWA authentication.
 * @returns {Promise<string>} The Access Token.
 */
async function getAmazonAccessToken() {
    console.log('AMAZON_API: Authenticating with LWA to get new Access Token...');
    const tokenUrl = 'https://api.amazon.com/auth/o2/token';

    const body = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: AMAZON_REFRESH_TOKEN,
        client_id: AMAZON_CLIENT_ID,
        client_secret: AMAZON_CLIENT_SECRET
    });

    try {
        const response = await fetch(tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
            },
            body: body.toString()
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(`Amazon Auth Error: ${data.error_description || 'Failed to get access token'}`);
        }

        console.log('AMAZON_API: Successfully received new Access Token.');
        return data.access_token;

    } catch (error) {
        console.error("Error getting Amazon Access Token:", error);
        throw error;
    }
}


const amazonApiClient = {
    getInventory: async () => {
        console.log('AMAZON_API: Calling SANDBOX getInventory endpoint...');
        const accessToken = await getAmazonAccessToken();

        // IMPORTANT: Use the correct sandbox endpoint for your region. This is for Europe.
        // You MUST replace 'YOUR_MARKETPLACE_ID' with your actual marketplace ID (e.g., A1PA6795UKMFR9 for Germany).
        const marketplaceId = 'ATVPDKIKX0DER'; // <-- HIER IHRE MARKETPLACE ID EINTRAGEN
        const sandboxEndpoint = `https://sandbox.sellingpartnerapi-eu.amazon.com/fba/inventory/v1/summaries?details=true&granularityType=Marketplace&marketplaceIds=${marketplaceId}`;

        try {
            const response = await fetch(sandboxEndpoint, {
                method: 'GET',
                headers: {
                    'x-amz-access-token': accessToken
                }
            });
            
            const data = await response.json();

            if (data.errors && data.errors.length > 0) {
                 throw new Error(`Amazon Sandbox API Error: ${data.errors[0].message}`);
            }

            console.log('AMAZON_API: Received successful response from Sandbox.');
            
            const formattedInventory = data.payload.inventorySummaries.map(item => ({
                sku: item.sellerSku,
                quantity: item.inventoryDetails?.fulfillableQuantity || 0
            }));

            // If sandbox returns empty, send back dummy data so the sync can continue
            return formattedInventory.length > 0 ? formattedInventory : [{sku: 'SANDBOX-SKU', quantity: 10}];

        } catch (error) {
            console.error("Error fetching Amazon sandbox inventory:", error);
            throw error;
        }
    },
    
    // The other functions remain as placeholders for now
    createMCFOrders: async (orders) => { 
        console.log('AMAZON_API: Simulating createMCFOrders call...');
        return { success: true, created: orders.length };
     },
    getTrackingForShippedOrders: async () => { 
        console.log('AMAZON_API: Simulating getTrackingForShippedOrders call...');
        return [];
     }
};

module.exports = amazonApiClient;