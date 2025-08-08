interface WelcomeEmailParams {
  email: string;
  displayName: string;
  userType: "customer" | "business";
}

class EmailService {
  private static readonly API_BASE_URL =
    process.env.NODE_ENV === "production"
      ? "" // Use same origin in production to avoid CORS issues
      : "https://caseroapp-thomas-projects-09adf0ba.vercel.app"; // Use deployed Vercel app for development

  /**
   * Sends a welcome email to new users via serverless function
   */
  static async sendWelcomeEmail(params: WelcomeEmailParams): Promise<boolean> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/api/send-welcome-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(params),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        console.log("Welcome email sent successfully:", result.messageId);
        return true;
      } else {
        console.error("Failed to send welcome email:", result.error);
        return false;
      }
    } catch (error) {
      console.error("Error sending welcome email:", error);
      return false;
    }
  }

  /**
   * Sends a test email to verify the service is working (for development only)
   */
  static async sendTestEmail(to: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/api/send-welcome-email`, {
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
