import { Channel } from "@shared/schema";
import axios from "axios";

// Function to set up and configure Facebook Messenger channel
export async function setupFacebookChannel(channel: Channel): Promise<{ status: string; message?: string }> {
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
    const pageId = channel.config.pageId;

    if (!accessToken || !pageId) {
      return {
        status: "error",
        message: "Missing Facebook configuration (accessToken, pageId)"
      };
    }

    // Setup webhook for incoming messages
    const webhookUrl = process.env.BASE_URL 
      ? `${process.env.BASE_URL}/api/webhooks/facebook/${channel.id}` 
      : `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}/api/webhooks/facebook/${channel.id}`;

    // Verify the access token
    try {
      const response = await axios.get(
        `https://graph.facebook.com/v17.0/${pageId}`,
        {
          params: {
            access_token: accessToken,
            fields: "name,id"
          }
        }
      );

      if (!response.data.id) {
        return {
          status: "error",
          message: "Invalid Facebook page access token"
        };
      }

      // Subscribe to webhook events for Facebook Messenger
      await axios.post(
        `https://graph.facebook.com/v17.0/${appId}/subscriptions`,
        {
          object: "page",
          callback_url: webhookUrl,
          verify_token: process.env.META_WEBHOOK_VERIFY_TOKEN || channel.config.webhookVerifyToken || "omniconnect-webhook-token",
          fields: "messages,messaging_postbacks,message_deliveries,message_reads",
          access_token: `${appId}|${appSecret}`
        }
      );

      return {
        status: "success",
        message: "Facebook Messenger channel configured successfully"
      };
    } catch (error) {
      console.error("Error validating Facebook configuration:", error);
      return {
        status: "error",
        message: "Failed to validate Facebook configuration"
      };
    }
  } catch (error) {
    console.error("Error setting up Facebook channel:", error);
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error setting up Facebook channel"
    };
  }
}

// Function to send a Facebook Messenger message
export async function sendFacebookMessage(
  channel: Channel,
  recipientId: string,
  content: string,
  media?: { type: string; url: string }
): Promise<{ status: string; message?: string; messageId?: string }> {
  try {
    // Get channel configuration
    const accessToken = process.env.META_ACCESS_TOKEN || channel.config.accessToken;
    const pageId = channel.config.pageId;

    if (!accessToken || !pageId) {
      return {
        status: "error",
        message: "Missing Facebook configuration"
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
      } else if (media.type === "video") {
        messageData = {
          attachment: {
            type: "video",
            payload: {
              url: media.url,
              is_reusable: false
            }
          }
        };
      } else if (media.type === "file") {
        messageData = {
          attachment: {
            type: "file",
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
        message: "Failed to send Facebook message"
      };
    }
  } catch (error) {
    console.error("Error sending Facebook message:", error);
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error sending Facebook message"
    };
  }
}

// Function to get Facebook user information
export async function getFacebookUser(
  channel: Channel,
  userId: string
): Promise<{ status: string; user?: any; message?: string }> {
  try {
    const accessToken = process.env.META_ACCESS_TOKEN || channel.config.accessToken;

    if (!accessToken) {
      return {
        status: "error",
        message: "Missing Facebook configuration"
      };
    }

    // Get user profile using Graph API
    const response = await axios.get(
      `https://graph.facebook.com/v17.0/${userId}`,
      {
        params: {
          fields: "first_name,last_name,profile_pic",
          access_token: accessToken
        }
      }
    );

    if (response.data.id) {
      return {
        status: "success",
        user: {
          id: response.data.id,
          name: `${response.data.first_name} ${response.data.last_name}`,
          firstName: response.data.first_name,
          lastName: response.data.last_name,
          avatarUrl: response.data.profile_pic
        }
      };
    } else {
      return {
        status: "error",
        message: "Failed to get Facebook user information"
      };
    }
  } catch (error) {
    console.error("Error getting Facebook user:", error);
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error getting Facebook user"
    };
  }
}
