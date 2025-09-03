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
            console.error('Antwort vom Amazon Auth Server (FEHLER):', JSON.stringify(data, null, 2));
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

        // KORREKTUR: Dies sind die korrekten Werte für den amerikanischen Marktplatz (NA).
        const marketplaceId = 'ATVPDKIKX0DER'; 
        const sandboxEndpoint = `https://sandbox.sellingpartnerapi-na.amazon.com/fba/inventory/v1/summaries?details=true&granularityType=Marketplace&marketplaceIds=${marketplaceId}`;

        try {
            const response = await fetch(sandboxEndpoint, {
                method: 'GET',
                headers: {
                    'x-amz-access-token': accessToken
                }
            });
            
            const data = await response.json();
            // Diese Log-Nachricht ist entscheidend für die Fehlersuche.
            console.log('Antwort vom Amazon Sandbox Server:', JSON.stringify(data, null, 2));

            if (data.errors && data.errors.length > 0) {
                 throw new Error(`Amazon Sandbox API Error: ${data.errors[0].message}`);
            }

            console.log('AMAZON_API: Received successful response from Sandbox.');
            
            const formattedInventory = data.payload.inventorySummaries.map(item => ({
                sku: item.sellerSku,
                quantity: item.inventoryDetails?.fulfillableQuantity || 0
            }));

            return formattedInventory.length > 0 ? formattedInventory : [{sku: 'SANDBOX-SKU', quantity: 10}];

        } catch (error) {
            console.error("Error fetching Amazon sandbox inventory:", error);
            throw error;
        }
    },
    
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
// FINALE SANDBOX VERSION
