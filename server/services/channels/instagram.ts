import { Channel } from "@shared/schema";
import axios from "axios";

// Function to set up and configure Instagram channel
export async function setupInstagramChannel(channel: Channel): Promise<{ status: string; message?: string }> {
  try {
    // Check channel configuration
    if (!channel.config) {
      return {
        status: "error",
        message: "Invalid channel configuration"
      };
    }

    // Meta (Facebook) credentials
    const accessToken = process.env.META_ACCESS_TOKEN || channel.config.accessToken;
    const appId = process.env.META_APP_ID || channel.config.appId;
    const appSecret = process.env.META_APP_SECRET || channel.config.appSecret;
    const instagramAccountId = channel.config.instagramAccountId;

    if (!accessToken || !instagramAccountId) {
      return {
        status: "error",
        message: "Missing Instagram configuration (accessToken, instagramAccountId)"
      };
    }

    // Setup webhook for incoming messages
    const webhookUrl = process.env.BASE_URL 
      ? `${process.env.BASE_URL}/api/webhooks/instagram/${channel.id}` 
      : `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}/api/webhooks/instagram/${channel.id}`;

    // Verify the access token
    try {
      const response = await axios.get(
        `https://graph.facebook.com/v17.0/me`,
        {
          params: {
            access_token: accessToken
          }
        }
      );

      if (!response.data.id) {
        return {
          status: "error",
          message: "Invalid Meta (Facebook) access token"
        };
      }

      // Subscribe to webhook events for Instagram Direct messages
      await axios.post(
        `https://graph.facebook.com/v17.0/${appId}/subscriptions`,
        {
          object: "instagram",
          callback_url: webhookUrl,
          verify_token: process.env.META_WEBHOOK_VERIFY_TOKEN || channel.config.webhookVerifyToken || "omniconnect-webhook-token",
          fields: "messages,messaging_postbacks",
          access_token: `${appId}|${appSecret}`
        }
      );

      return {
        status: "success",
        message: "Instagram channel configured successfully"
      };
    } catch (error) {
      console.error("Error validating Instagram configuration:", error);
      return {
        status: "error",
        message: "Failed to validate Instagram configuration"
      };
    }
  } catch (error) {
    console.error("Error setting up Instagram channel:", error);
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error setting up Instagram channel"
    };
  }
}

// Function to send an Instagram Direct message
export async function sendInstagramMessage(
  channel: Channel,
  recipientId: string,
  content: string,
  media?: { type: string; url: string }
): Promise<{ status: string; message?: string; messageId?: string }> {
  try {
    // Get channel configuration
    const accessToken = process.env.META_ACCESS_TOKEN || channel.config.accessToken;
    const instagramAccountId = channel.config.instagramAccountId;

    if (!accessToken || !instagramAccountId) {
      return {
        status: "error",
        message: "Missing Instagram configuration"
      };
    }

    // Prepare message payload
    let messageData: any = {};

    if (media) {
      if (media.type === "image") {
        messageData = {
          attachment: {
            type: "image",
            payload: {
              url: media.url,
              is_reusable: false
            }
          }
        };
      } else {
        return {
          status: "error",
          message: `Unsupported media type: ${media.type}`
        };
      }
    } else {
      messageData = {
        text: content
      };
    }

    // Send message via Graph API
    const response = await axios.post(
      `https://graph.facebook.com/v17.0/me/messages`,
      {
        recipient: {
          id: recipientId
        },
        message: messageData,
        messaging_type: "RESPONSE"
      },
      {
        params: {
          access_token: accessToken
        }
      }
    );

    if (response.data.message_id) {
      return {
        status: "success",
        messageId: response.data.message_id
      };
    } else {
      return {
        status: "error",
        message: "Failed to send Instagram message"
      };
    }
  } catch (error) {
    console.error("Error sending Instagram message:", error);
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error sending Instagram message"
    };
  }
}

// Function to get Instagram user information
export async function getInstagramUser(
  channel: Channel,
  userId: string
): Promise<{ status: string; user?: any; message?: string }> {
  try {
    const accessToken = process.env.META_ACCESS_TOKEN || channel.config.accessToken;

    if (!accessToken) {
      return {
        status: "error",
        message: "Missing Instagram configuration"
      };
    }

    // Get user profile using Graph API
    const response = await axios.get(
      `https://graph.facebook.com/v17.0/${userId}`,
      {
        params: {
          fields: "name,profile_pic",
          access_token: accessToken
        }
      }
    );

    if (response.data.id) {
      return {
        status: "success",
        user: {
          id: response.data.id,
          name: response.data.name,
          avatarUrl: response.data.profile_pic
        }
      };
    } else {
      return {
        status: "error",
        message: "Failed to get Instagram user information"
      };
    }
  } catch (error) {
    console.error("Error getting Instagram user:", error);
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error getting Instagram user"
    };
  }
}
