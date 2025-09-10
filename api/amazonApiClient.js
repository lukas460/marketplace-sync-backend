// api/amazonApiClient.js
// api/amazonApiClient.js
// api/amazonApiClient.js
// CLEAN VERSION - NO marketplaceIds

const {
    AMAZON_CLIENT_ID,
    AMAZON_CLIENT_SECRET,
    AMAZON_REFRESH_TOKEN
} = process.env;

/**
 * Get a short-lived Access Token using your LWA Refresh Token
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

    const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString()
    });

    const data = await response.json();
    if (!response.ok) {
        console.error('ERROR RESPONSE from Amazon Auth Server:', data);
        throw new Error(`Amazon Auth Error: ${data.error_description || 'Failed to get access token'}`);
    }

    console.log('AMAZON_API: Successfully received new Access Token.');
    return data.access_token;
}

const amazonApiClient = {
    /**
     * Fetch inventory summaries from Amazon SP-API Sandbox
     */
    getInventory: async () => {
        console.log('AMAZON_API: Calling SANDBOX getInventory endpoint...');
        const accessToken = await getAmazonAccessToken();

        const marketplaceId = 'ATVPDKIKX0DER'; // US marketplace ID
        // HINWEIS: Der Parameter wurde zurück auf 'marketplaceIds' (Plural) geändert, da dies laut Amazon-Dokumentation korrekt ist.
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

            if (data.errors?.length) {
                throw new Error(`Amazon API Error: ${data.errors[0].message}`);
            }

            const inventory = data.payload?.inventorySummaries || [];
            return inventory.map(item => ({
                sku: item.sellerSku,
                quantity: item.inventoryDetails?.fulfillableQuantity || 0
            }));

        } catch (error) {
            console.error('Error fetching Amazon sandbox inventory:', error);
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
```