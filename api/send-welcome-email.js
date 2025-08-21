// SendGrid email service using REST API
// Uses standalone HTML templates for easier editing

const fs = require("fs");
const path = require("path");

// Helper function to load and customize HTML templates
const loadTemplate = (templateName, displayName) => {
  try {
    const templatePath = path.join(__dirname, `${templateName}-template.html`);
    let htmlContent = fs.readFileSync(templatePath, "utf8");

    // Replace placeholder with actual display name
    htmlContent = htmlContent.replace(/{{DISPLAY_NAME}}/g, displayName);

    return htmlContent;
  } catch (error) {
    console.error(`Error loading template ${templateName}:`, error);
    return null;
  }
};

const getBusinessWelcomeTemplate = (displayName) => {
  return loadTemplate("business-welcome", displayName);
};

const getCustomerWelcomeTemplate = (displayName) => {
  return loadTemplate("customer-welcome", displayName);
};

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader("Access-Control-Allow-Headers", "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Check if SendGrid API key is available
    if (!process.env.SENDGRID_API_KEY) {
      console.error("SENDGRID_API_KEY environment variable is not set");
      return res.status(500).json({
        success: false,
        error: "Email service configuration error",
        details: "Missing SendGrid API key configuration",
      });
    }

    const { email, displayName, userType } = req.body;

    if (!email || !displayName || !userType) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: email, displayName, userType",
      });
    }

    if (!["business", "customer"].includes(userType)) {
      return res.status(400).json({
        success: false,
        error: 'userType must be either "business" or "customer"',
      });
    }

    // Load the appropriate template and prepare email content
    const html = userType === "business" ? getBusinessWelcomeTemplate(displayName) : getCustomerWelcomeTemplate(displayName);

    // Handle template loading errors
    if (!html) {
      return res.status(500).json({
        success: false,
        error: "Failed to load email template",
        details: "Template file not found or corrupted",
      });
    }

    // Get email subject based on user type
    const subject = userType === "business" ? "🚀 ¡Bienvenido a CaseroApp! Tu plataforma de fidelización está lista" : "🎉 ¡Bienvenido a CaseroApp! Tu billetera de recompensas";

    // SendGrid API payload
    const emailData = {
      personalizations: [
        {
          to: [{ email: email, name: displayName }],
          subject: subject,
        },
      ],
      from: {
        email: "admin@caseroapp.com",
        name: "CaseroApp",
      },
      content: [{ type: "text/html", value: html }],
    };

    console.log("Sending email via SendGrid to:", email);

    // Send email using SendGrid REST API
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailData),
    });

    if (response.ok) {
      // SendGrid returns 202 for successful requests
      const messageId = response.headers.get("x-message-id") || "success";
      console.log("Welcome email sent successfully via SendGrid:", messageId);

      res.status(200).json({
        success: true,
        messageId: messageId,
        message: "Welcome email sent successfully via SendGrid",
      });
    } else {
      const errorText = await response.text();
      console.error("SendGrid API error:", response.status, errorText);

      res.status(500).json({
        success: false,
        error: "Failed to send email via SendGrid",
        details: `SendGrid API returned ${response.status}: ${errorText}`,
      });
    }
  } catch (error) {
    console.error("Error sending welcome email:", error);
    res.status(500).json({
      success: false,
      error: "Failed to send email",
      details: error.message,
    });
  }
};
