const { Expo } = require("expo-server-sdk");

// Create a new Expo SDK client
const expo = new Expo();

module.exports = async (req, res) => {
  // Set CORS headers similar to send-welcome-email
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,OPTIONS,PATCH,DELETE,POST,PUT"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return res.status(200).json({});
  }

  try {
    const { pushTokens, title, body, data } = req.body;

  if (!pushTokens || !Array.isArray(pushTokens) || pushTokens.length === 0) {
      return res.status(400).json({
        success: false,
        error: "pushTokens array is required",
      });
    }

    if (!title || !body) {
      return res.status(400).json({
        success: false,
        error: "title and body are required",
      });
    }

    // Check that all push tokens are valid Expo push tokens
    const messages = [];
    for (let pushToken of pushTokens) {
      // Check if this is a valid Expo push token
      if (!Expo.isExpoPushToken(pushToken)) {
        console.error(`Push token ${pushToken} is not a valid Expo push token`);
        continue;
      }

      // Construct a message
      messages.push({
        to: pushToken,
        sound: "default",
        title: title,
        body: body,
        data: data || {},
        priority: "high",
        ttl: 3600, // 1 hour
      });
    }

    if (messages.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No valid push tokens found",
      });
    }

    // Send the messages in chunks
    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];

    for (let chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        console.error("Error sending push notification chunk:", error);
      }
    }

    return res.status(200).json({
      success: true,
      tickets: tickets,
      message: "Push notifications sent successfully",
      sentCount: messages.length,
    });
  } catch (error) {
    console.error("Error in push notification function:", error);

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
