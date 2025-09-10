// api/amazonApiClient.js
require('dotenv').config();
const fetch = require('node-fetch');
const crypto = require('crypto');

let cachedAccessToken = null;
let tokenExpiry = null;

// Get LWA (Login With Amazon) Access Token
async function getAmazonAccessToken() {
    if (cachedAccessToken && tokenExpiry && new Date() < tokenExpiry) {
        return cachedAccessToken;
    }

    console.log("AMAZON_API: Authenticating with LWA to get new Access Token...");

    const params = new URLSearchParams();
    params.append("grant_type", "refresh_token");
    params.append("refresh_token", process.env.AMAZON_REFRESH_TOKEN);
    params.append("client_id", process.env.AMAZON_CLIENT_ID);
    params.append("client_secret", process.env.AMAZON_CLIENT_SECRET);

    const response = await fetch("https://api.amazon.com/auth/o2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error("Failed to get LWA token: " + JSON.stringify(data));
    }

    cachedAccessToken = data.access_token;
    tokenExpiry = new Date(Date.now() + data.expires_in * 1000);
    console.log("AMAZON_API: Successfully received new Access Token.");
    return cachedAccessToken;
}

module.exports = {
    // ✅ Sandbox-friendly getInventory
    getInventory: async () => {
        console.log('AMAZON_API: Calling SANDBOX getInventory endpoint...');
        const accessToken = await getAmazonAccessToken();

        const marketplaceId = 'ATVPDKIKX0DER'; // US marketplace
        const sandboxEndpoint = `https://sandbox.sellingpartnerapi-na.amazon.com/fba/inventory/v1/summaries?details=true&granularityType=Marketplace&granularityId=${marketplaceId}`;

        console.log('DEBUG: Fetching URL ->', sandboxEndpoint);

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

            // 🚨 If sandbox responds with error, return dummy inventory
            if (data.errors?.length) {
                console.warn('SANDBOX WARNING: Amazon returned error. Using dummy inventory.');
                return [
                    { sku: 'SANDBOX-SKU-1', quantity: 25 },
                    { sku: 'SANDBOX-SKU-2', quantity: 10 }
                ];
            }

            const inventory = data.payload?.inventorySummaries || [];
            return inventory.map(item => ({
                sku: item.sellerSku,
                quantity: item.inventoryDetails?.fulfillableQuantity || 0
            }));
        } catch (error) {
            console.error('Error fetching Amazon sandbox inventory:', error);
            // Fallback dummy inventory
            return [{ sku: 'SANDBOX-SKU-ERROR', quantity: 0 }];
        }
    },

    // Dummy implementations for the rest
    createMCFOrders: async (orders) => {
        console.log("SANDBOX: Pretending to create MCF orders:", orders.length);
        return true;
    },

    getTrackingForShippedOrders: async () => {
        console.log("SANDBOX: Returning dummy tracking updates...");
        return [
            { orderId: "SANDBOX-ORDER-1", trackingNumber: "1234567890", carrier: "UPS" }
        ];
    }
};
