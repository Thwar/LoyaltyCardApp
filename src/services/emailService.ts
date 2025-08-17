import { env } from "../../config/env";

interface WelcomeEmailParams {
  email: string;
  displayName: string;
  userType: "customer" | "business";
}

class EmailService {
  private static readonly API_BASE_URL = env.API_BASE_URL;

  /**
   * Sends a welcome email to new users via serverless function
   */
  static async sendWelcomeEmail(params: WelcomeEmailParams): Promise<boolean> {
    try {
      // Check if API is configured
      if (!this.API_BASE_URL) {
        console.error("API_BASE_URL is not configured for EmailService");
        return false;
      }

      const apiUrl = `${this.API_BASE_URL}/send-welcome-email`;
      console.log("Attempting to send welcome email to:", params.email, "via", apiUrl);

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(params),
      });

      console.log("Email API response status:", response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Email API error response:", errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();

      if (result.success) {
        console.log("Welcome email sent successfully:", result.messageId || "No message ID");
        return true;
      } else {
        console.error("Failed to send welcome email:", result.error || "Unknown error");
        return false;
      }
    } catch (error) {
      console.error("Error sending welcome email:", error);
      // For development/debugging purposes, we might want to see the full error
      if (error instanceof TypeError && error.message === "Network request failed") {
        console.error("Network error - Check if the API endpoint is accessible and CORS is configured properly");
      }
      return false;
    }
  }

  /**
   * Sends a test email to verify the service is working (for development only)
   */
  static async sendTestEmail(to: string): Promise<boolean> {
    try {
      // Check if API is configured
      if (!this.API_BASE_URL) {
        console.error("API_BASE_URL is not configured for EmailService");
        return false;
      }

      const apiUrl = `${this.API_BASE_URL}/send-welcome-email`;
      console.log("Attempting to send test email to:", to, "via", apiUrl);

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: to,
          displayName: "Test User",
          userType: "customer",
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        console.log("Test email sent successfully:", result.messageId);
        return true;
      } else {
        console.error("Failed to send test email:", result.error);
        return false;
      }
    } catch (error) {
      console.error("Error sending test email:", error);
      return false;
    }
  }
}

export default EmailService;
