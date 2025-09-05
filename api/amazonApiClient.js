// api/amazonApiClient.js
// FINALE VERSION FÜR SUPPORT-TICKET

const {
    AMAZON_CLIENT_ID,
    AMAZON_CLIENT_SECRET,
    AMAZON_REFRESH_TOKEN
} = process.env;

async function getAmazonAccessToken() {
    // Diese Funktion bleibt unverändert...
    console.log('AMAZON_API: Authenticating with LWA to get new Access Token...');
    const tokenUrl = 'https://api.amazon.com/auth/o2/token';
    const body = new URLSearchParams({ /* ... unverändert ... */ });
    // ... der Rest der Funktion ist identisch ...
    const response = await fetch(tokenUrl, { /* ... */ });
    const data = await response.json();
    if (!response.ok) {
        console.error('ERROR RESPONSE from Amazon Auth Server:', JSON.stringify(data, null, 2));
        throw new Error(`Amazon Auth Error: ${data.error_description || 'Failed to get access token'}`);
    }
    console.log('AMAZON_API: Successfully received new Access Token.');
    return data.access_token;
}

const amazonApiClient = {
    getInventory: async () => {
        console.log('AMAZON_API: Calling SANDBOX getInventory endpoint...');
        const accessToken = await getAmazonAccessToken();

        const marketplaceId = 'ATVPDKIKX0DER'; 
        const sandboxEndpoint = `https://sandbox.sellingpartnerapi-na.amazon.com/fba/inventory/v1/summaries?details=true&granularityType=Marketplace&marketplaceIds=${marketplaceId}`;
        
        // --- NEUE ÄNDERUNG: Wir definieren die Request-Header hier ---
        const requestHeaders = {
            'x-amz-access-token': accessToken,
            'Content-Type': 'application/json'
        };

        try {
            // --- NEUE ÄNDERUNG: Wir protokollieren die Anfrage-Details ---
            console.log('--- START AMAZON REQUEST DETAILS ---');
            console.log('Timestamp:', new Date().toISOString());
            console.log('Endpoint:', sandboxEndpoint);
            console.log('Method:', 'GET');
            console.log('Request Headers:', JSON.stringify(requestHeaders, null, 2));
            console.log('Request Body: N/A (GET Request)');
            
            const response = await fetch(sandboxEndpoint, {
                method: 'GET',
                headers: requestHeaders
            });
            
            const data = await response.json();
            
            // --- NEUE ÄNDERUNG: Wir protokollieren die Antwort-Details ---
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

            const inventory = data.payload.inventorySummaries || [];
            return inventory.map(item => ({
                sku: item.sellerSku,
                quantity: item.inventoryDetails?.fulfillableQuantity || 0
            }));

        } catch (error) {
            console.error("Error fetching Amazon sandbox inventory:", error);
            throw error;
        }
    },
    
    // Die anderen Funktionen bleiben unverändert
    createMCFOrders: async (orders) => { /* ... unverändert ... */ },
    getTrackingForShippedOrders: async () => { /* ... unverändert ... */ }
};

module.exports = amazonApiClient;

