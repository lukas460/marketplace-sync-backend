// api/amazonApiClient.js
// FINALE SANDBOX VERSION

// 1. Read the secure LWA credentials from Vercel's Environment Variables
const {
    AMAZON_CLIENT_ID,
    AMAZON_CLIENT_SECRET,
    AMAZON_REFRESH_TOKEN
} = process.env;

/**
 * Exchanges the long-lived Refresh Token for a short-lived Access Token.
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
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: body.toString()
        });
        const data = await response.json();
        
        if (!response.ok) {
            console.error('ERROR RESPONSE from Amazon Auth Server:', JSON.stringify(data, null, 2));
            throw new Error(`Amazon Auth Error: ${data.error_description || 'Failed to get access token'}`);
        }

        console.log('AMAZON_API: Successfully received new Access Token.');
        return data.access_token;
    } catch (error) {
        console.error("Fatal error during Amazon Access Token retrieval:", error);
        throw error;
    }
}

const amazonApiClient = {
    getInventory: async () => {
        console.log('AMAZON_API: Calling SANDBOX getInventory endpoint...');
        const accessToken = await getAmazonAccessToken();

        // This is the correct ID for the US Marketplace.
        const marketplaceId = 'ATVPDKIKX0DER'; 
        const sandboxEndpoint = `https://sandbox.sellingpartnerapi-na.amazon.com/fba/inventory/v1/summaries?details=true&granularityType=Marketplace&marketplaceIds=${marketplaceId}`;

        try {
            const response = await fetch(sandboxEndpoint, {
                method: 'GET',
                headers: {
                    'x-amz-access-token': accessToken,
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            console.log('RESPONSE from Amazon Sandbox Server:', JSON.stringify(data, null, 2));

            if (data.errors && data.errors.length > 0) {
                 throw new Error(`Amazon API Error: ${data.errors[0].message}`);
            }

            console.log('AMAZON_API: Successfully received data from Sandbox.');
            
            const inventory = data.payload.inventorySummaries || [];
            const formattedInventory = inventory.map(item => ({
                sku: item.sellerSku,
                quantity: item.inventoryDetails?.fulfillableQuantity || 0
            }));

            return formattedInventory.length > 0 ? formattedInventory : [{sku: 'SANDBOX-SKU-EMPTY', quantity: 0}];

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
