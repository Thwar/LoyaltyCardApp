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
    const { Resend } = require("resend");

    // Initialize Resend with API key
    // Fallback to provided key for development if env var is missing
    const resend = new Resend(process.env.RESEND_API_KEY || "re_Z8yBGpLK_LSi7EVtoEaWYPUp2fNU5dBeP");

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
    const subject = userType === "business" ? "🚀 ¡Bienvenido a SoyCasero! Tu plataforma de fidelización está lista" : "🎉 ¡Bienvenido a SoyCasero! Tu billetera de recompensas";

    console.log("Sending email via Resend to:", email);

    // Send email using Resend SDK
    const { data, error } = await resend.emails.send({
      from: "SoyCasero <admin@soycasero.com>",
      to: [email],
      subject: subject,
      html: html,
    });

    if (error) {
      console.error("Resend API error:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to send email via Resend",
        details: error.message,
      });
    }

    console.log("Welcome email sent successfully via Resend:", data.id);

    res.status(200).json({
      success: true,
      messageId: data.id,
      message: "Welcome email sent successfully via Resend",
    });
  } catch (error) {
    console.error("Error sending welcome email:", error);
    res.status(500).json({
      success: false,
      error: "Failed to send email",
      details: error.message,
    });
  }
};
