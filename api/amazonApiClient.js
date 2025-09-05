// api/amazonApiClient.js
// FINALE VERSION FÜR SUPPORT-TICKET

const {
    AMAZON_CLIENT_ID,
    AMAZON_CLIENT_SECRET,
    AMAZON_REFRESH_TOKEN
} = process.env;

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

        // --- NEUE ÄNDERUNG: Wir lesen die Antwort zuerst als Text, um JSON-Fehler zu vermeiden ---
        const responseText = await response.text();
        let data;

        try {
            // Wir versuchen, den Text als JSON zu parsen
            data = JSON.parse(responseText);
        } catch (e) {
            // Wenn das fehlschlägt, ist die Antwort kein JSON (wahrscheinlich eine HTML-Fehlerseite)
            console.error('ERROR: Amazon did not return valid JSON. Full response:', responseText);
            throw new Error('Failed to parse Amazon auth response. It was not JSON.');
        }
        
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

        const marketplaceId = 'ATVPDKIKX0DER'; 
        const sandboxEndpoint = `https://sandbox.sellingpartnerapi-na.amazon.com/fba/inventory/v1/summaries?details=true&granularityType=Marketplace&marketplaceIds=${marketplaceId}`;
        
        const requestHeaders = {
            'x-amz-access-token': accessToken,
            'Content-Type': 'application/json'
        };

        try {
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
    
    createMCFOrders: async (orders) => { /* ... unverändert ... */ },
    getTrackingForShippedOrders: async () => { /* ... unverändert ... */ }
};

module.exports = amazonApiClient;

