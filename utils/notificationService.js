const { Expo } = require('expo-server-sdk');

// Create a new Expo SDK client
let expo = new Expo();

/**
 * Send push notifications to multiple users
 * @param {Array<string>} pushTokens - Array of Expo Push Tokens
 * @param {string} title - Notification Title
 * @param {string} body - Notification Body
 * @param {Object} data - Optional data payload
 */
const sendPushNotifications = async(pushTokens, title, body, data = {}) => {
    console.log(`[Notification Service] Attempting to send ${pushTokens.length} notifications: "${title}"`);
    let messages = [];

    for (let pushToken of pushTokens) {
        if (!Expo.isExpoPushToken(pushToken)) {
            console.error(`[Notification Service] Push token ${pushToken} is not a valid Expo push token`);
            continue;
        }

        messages.push({
            to: pushToken,
            sound: 'default',
            title: title,
            body: body,
            data: data,
        });
    }

    if (messages.length === 0) {
        console.log(`[Notification Service] No valid tokens to send to.`);
        return;
    }

    // Batch the messages
    let chunks = expo.chunkPushNotifications(messages);
    let tickets = [];

    for (let chunk of chunks) {
        try {
            let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
            console.log('Notification Tickets:', ticketChunk);
            tickets.push(...ticketChunk);
        } catch (error) {
            console.error(error);
        }
    }

    // Handle receipts (optional, but good for debugging errors)
    // For now, we just log that we sent them.
    console.log(`Sent ${messages.length} notifications: ${title}`);
};

module.exports = { sendPushNotifications };