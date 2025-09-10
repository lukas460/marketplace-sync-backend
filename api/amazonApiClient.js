// api/amazonApiClient.js
// FINALE SAUBERE VERSION

const {
    AMAZON_CLIENT_ID,
    AMAZON_CLIENT_SECRET,
    AMAZON_REFRESH_TOKEN
} = process.env;

/**
 * Holt einen kurzlebigen Access Token unter Verwendung des LWA Refresh Tokens.
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
        console.error("Error getting Amazon Access Token:", error);
        throw error;
    }
}


const amazonApiClient = {
    /**
     * Ruft Inventar-Zusammenfassungen von der Amazon SP-API Sandbox ab.
     */
    getInventory: async () => {
        console.log('AMAZON_API: Calling SANDBOX getInventory endpoint...');
        const accessToken = await getAmazonAccessToken();

        // Dies ist der saubere, korrekte Wert für den US-Marktplatz.
        const marketplaceId = 'ATVPDKIKX0DER';
        const sandboxEndpoint = `https://sandbox.sellingpartnerapi-na.amazon.com/fba/inventory/v1/summaries?details=true&granularityType=Marketplace&marketplaceIds=${marketplaceId}`;
        
        const requestHeaders = {
            'x-amz-access-token': accessToken,
            'Content-Type': 'application/json'
        };

        try {
            console.log('--- START AMAZON REQUEST DETAILS ---');
            console.log('Endpoint:', sandboxEndpoint);
            
            const response = await fetch(sandboxEndpoint, {
                method: 'GET',
                headers: requestHeaders
            });
            
            const data = await response.json();
            
            const responseHeaders = {};
            response.headers.forEach((value, name) => {
                responseHeaders[name] = value;
            });
            
            console.log('--- START AMAZON RESPONSE DETAILS ---');
            console.log('Response Status:', response.status);
            console.log('Response Headers:', JSON.stringify(responseHeaders, null, 2));
            console.log('Response Body:', JSON.stringify(data, null, 2));
            console.log('--- END AMAZON RESPONSE DETAILS ---');

            if (data.errors && data.errors.length > 0) {
                 throw new Error(`Amazon API Error: ${data.errors[0].message}`);
            }

            // Verarbeitet die erfolgreiche Antwort
            const inventory = data.payload?.inventorySummaries || [];
            return inventory.map(item => ({
                sku: item.sellerSku,
                quantity: item.inventoryDetails?.fulfillableQuantity || 0
            }));

        } catch (error) {
            console.error("Error fetching Amazon sandbox inventory:", error);
            throw error;
        }
    },
    
    // Die anderen Funktionen bleiben vorerst als Simulationen bestehen.
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