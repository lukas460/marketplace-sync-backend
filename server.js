require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createServer } = require('http');

const amazonApiClient = require('./api/amazonApiClient');
const walmartApiClient = require('./api/walmartApiClient');

const app = express();

// Allow requests from all origins (for dev). Restrict in production if needed.
app.use(cors({ origin: '*' }));
app.use(express.json());

// Health check route
app.get('/api/status', (req, res) => {
  res.status(200).json({ message: "Backend is running and ready to sync!" });
});

// Sync route
app.post('/api/sync', async (req, res) => {
  console.log('Received request to start sync process...');
  const syncLogs = [];
  const addLog = (message, type = 'info') => {
    const logEntry = { message, type, time: new Date().toISOString() };
    console.log(`[${type.toUpperCase()}] ${message}`);
    syncLogs.push(logEntry);
  };

  try {
    addLog('Sync process started.');
    addLog('Fetching inventory from Amazon...');
    const amazonInventory = await amazonApiClient.getInventory();
    addLog(`Found ${amazonInventory.length} items in Amazon inventory.`);

    addLog('Updating inventory levels on Walmart...');
    await walmartApiClient.updateInventory(amazonInventory);
    addLog('Successfully updated Walmart inventory.');

    addLog('Fetching new orders from Walmart...');
    const newWalmartOrders = await walmartApiClient.getNewOrders();
    addLog(`Found ${newWalmartOrders.length} new orders to fulfill.`);

    if (newWalmartOrders.length > 0) {
      addLog('Creating Multi-Channel Fulfillment orders on Amazon...');
      await amazonApiClient.createMCFOrders(newWalmartOrders);
      addLog('Successfully submitted orders to Amazon MCF.');
    }

    addLog('Checking for tracking updates from Amazon...');
    const trackingUpdates = await amazonApiClient.getTrackingForShippedOrders();
    addLog(`Found ${trackingUpdates.length} tracking updates.`);

    if (trackingUpdates.length > 0) {
      addLog('Updating tracking information on Walmart...');
      await walmartApiClient.updateTracking(trackingUpdates);
      addLog('Successfully updated tracking on Walmart.');
    }

    addLog('Sync process completed successfully.', 'success');
    res.status(200).json({
      status: 'success',
      message: 'Sync completed successfully.',
      logs: syncLogs
    });
  } catch (error) {
    console.error('An error occurred during the sync process:', error);
    addLog(`Error: ${error.message}`, 'error');
    res.status(500).json({
      status: 'error',
      message: 'An internal server error occurred.',
      logs: syncLogs
    });
  }
});

// Wrap Express inside an HTTP server and export handler for Vercel
const server = createServer(app);

module.exports = (req, res) => {
  server.emit('request', req, res);
};
