// api/amazonApiClient.js
/* global fetch, process */
const {
  AMAZON_CLIENT_ID,
  AMAZON_CLIENT_SECRET,
  AMAZON_REFRESH_TOKEN
} = process.env;

/**
 * Get a short-lived Access Token using the LWA Refresh Token
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

    const responseText = await response.text();
    let data;

    try {
      data = JSON.parse(responseText);
    } catch (e) {
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
  /**
   * Fetch inventory summaries from Amazon SP-API Sandbox
   */
  getInventory: async () => {
    console.log('AMAZON_API: Calling SANDBOX getInventory endpoint...');
    const accessToken = await getAmazonAccessToken();

    // US Marketplace ID
    const marketplaceId = 'ATVPDKIKX0DER';

    // Sandbox endpoint (notice: no marketplaceIds, just granularityId)
    const sandboxEndpoint =
      `https://sandbox.sellingpartnerapi-na.amazon.com/fba/inventory/v1/summaries` +
      `?details=true&granularityType=Marketplace&granularityId=${marketplaceId}`;

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

      if (data.errors?.length) {
        throw new Error(`Amazon API Error: ${data.errors[0].message}`);
      }

      const inventory = data.payload?.inventorySummaries || [];

      if (inventory.length === 0) {
        console.log('AMAZON_API: Sandbox returned empty inventory. Using dummy data for demo.');
        return [{ sku: 'SANDBOX-SKU-1', quantity: 25 }];
      }

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
