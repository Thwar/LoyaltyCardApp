// SendGrid email service using REST API
// No need for nodemailer anymore - using fetch for HTTP requests

// Email templates
const getBusinessWelcomeTemplate = (displayName) => {
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Bienvenido a CaseroApp</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Baloo+Bhaijaan+2:wght@400;500;600;700;800&display=swap');
            
            body {
                font-family: 'Baloo Bhaijaan 2', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #E53935;
            }
            .container {
                background-color: #ffffff;
                padding: 40px;
                border-radius: 12px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
                padding-bottom: 20px;
                border-bottom: 3px solid #E53935;
            }
            .logo-img {
                max-width: 120px;
                height: auto;
                margin-bottom: 15px;
            }
            .logo {
                font-size: 28px;
                font-weight: 700;
                color: #E53935;
                margin-bottom: 10px;
                font-family: 'Baloo Bhaijaan 2', sans-serif;
            }
            .welcome-title {
                color: #2c3e50;
                font-size: 24px;
                margin-bottom: 20px;
                text-align: center;
                font-family: 'Baloo Bhaijaan 2', sans-serif;
                font-weight: 600;
            }
            .content {
                margin-bottom: 30px;
            }
            .highlight {
                background-color: #ffebee;
                padding: 20px;
                border-radius: 8px;
                border-left: 4px solid #E53935;
                margin: 20px 0;
            }
            .features {
                list-style: none;
                padding: 0;
            }
            .features li {
                padding: 10px 0;
                border-bottom: 1px solid #eee;
                position: relative;
                padding-left: 30px;
            }
            .features li:before {
                content: "✅";
                position: absolute;
                left: 0;
                top: 10px;
            }
            .footer {
                text-align: center;
                margin-top: 40px;
                padding-top: 20px;
                border-top: 1px solid #eee;
                color: #666;
                font-size: 14px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <img src="https://caseroapp-thomas-projects-09adf0ba.vercel.app/assets/logo-red.png" alt="CaseroApp Logo" class="logo-img" />
                <div class="logo">CaseroApp</div>
                <p style="color: #666; margin: 0;">Plataforma Empresarial de Fidelización</p>
            </div>

            <h1 class="welcome-title">¡Bienvenido, ${displayName}!</h1>

            <div class="content">
                <p>Nos complace darte la bienvenida a <strong>CaseroApp</strong>, la plataforma líder en soluciones de fidelización empresarial.</p>
                
                <div class="highlight">
                    <p><strong>¡Felicidades por dar el primer paso hacia el crecimiento de tu negocio!</strong></p>
                    <p>Ahora puedes crear programas de fidelización que transformarán visitantes ocasionales en clientes leales.</p>
                </div>

                <h3 style="color: #E53935; font-family: 'Baloo Bhaijaan 2', sans-serif; font-weight: 600;">🚀 Lo que puedes hacer ahora:</h3>
                <ul class="features">
                    <li><strong>Crear tarjetas de fidelización personalizadas</strong> con tu marca y colores</li>
                    <li><strong>Gestionar recompensas atractivas</strong> que incentiven el regreso de tus clientes</li>
                    <li><strong>Seguimiento en tiempo real</strong> de la actividad de tus programas</li>
                    <li><strong>Administrar clientes</strong> y ver estadísticas detalladas</li>
                    <li><strong>Compartir fácilmente</strong> tus programas con códigos QR</li>
                </ul>
            </div>

            <div class="footer">
                <p><strong>¡Gracias por confiar en CaseroApp!</strong></p>
                <p>Estamos emocionados de ser parte del crecimiento de tu negocio.</p>
                <p style="margin-top: 20px;">
                    © 2025 CaseroApp. Todos los derechos reservados.<br>
                    <small>Este es un email automático, por favor no respondas a este mensaje.</small>
                </p>
            </div>
        </div>
    </body>
    </html>
  `;
};

const getCustomerWelcomeTemplate = (displayName) => {
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Bienvenido a CaseroApp</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Baloo+Bhaijaan+2:wght@400;500;600;700;800&display=swap');
            
            body {
                font-family: 'Baloo Bhaijaan 2', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #E53935;
            }
            .container {
                background-color: #ffffff;
                padding: 40px;
                border-radius: 12px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
                padding-bottom: 20px;
                border-bottom: 3px solid #E53935;
            }
            .logo-img {
                max-width: 120px;
                height: auto;
                margin-bottom: 15px;
            }
            .logo {
                font-size: 28px;
                font-weight: 700;
                color: #E53935;
                margin-bottom: 10px;
                font-family: 'Baloo Bhaijaan 2', sans-serif;
            }
            .welcome-title {
                color: #2c3e50;
                font-size: 24px;
                margin-bottom: 20px;
                text-align: center;
                font-family: 'Baloo Bhaijaan 2', sans-serif;
                font-weight: 600;
            }
            .content {
                margin-bottom: 30px;
            }
            .highlight {
                background-color: #ffebee;
                padding: 20px;
                border-radius: 8px;
                border-left: 4px solid #E53935;
                margin: 20px 0;
            }
            .features {
                list-style: none;
                padding: 0;
            }
            .features li {
                padding: 10px 0;
                border-bottom: 1px solid #eee;
                position: relative;
                padding-left: 30px;
            }
            .features li:before {
                content: "🎁";
                position: absolute;
                left: 0;
                top: 10px;
            }
            .footer {
                text-align: center;
                margin-top: 40px;
                padding-top: 20px;
                border-top: 1px solid #eee;
                color: #666;
                font-size: 14px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <img src="https://caseroapp-thomas-projects-09adf0ba.vercel.app/assets/logo-red.png" alt="CaseroApp Logo" class="logo-img" />
                <div class="logo">CaseroApp</div>
                <p style="color: #666; margin: 0;">Tu Pasaporte a Increíbles Recompensas</p>
            </div>

            <h1 class="welcome-title">¡Hola, ${displayName}!</h1>

            <div class="content">
                <p>¡Bienvenido a <strong>CaseroApp</strong>! Estás a punto de descubrir un mundo lleno de recompensas increíbles en tus lugares favoritos.</p>
                
                <div class="highlight">
                    <p><strong>🎉 ¡Tu aventura de recompensas comienza ahora!</strong></p>
                    <p>Cada visita a tus restaurantes, cafeterías y tiendas favoritas te acerca más a obtener increíbles premios.</p>
                </div>

                <h3 style="color: #E53935; font-family: 'Baloo Bhaijaan 2', sans-serif; font-weight: 600;">🌟 Descubre lo que puedes hacer:</h3>
                <ul class="features">
                    <li><strong>Explora negocios cercanos</strong> que ofrecen programas de fidelización</li>
                    <li><strong>Únete a programas</strong> de tus lugares favoritos con un simple toque</li>
                    <li><strong>Acumula sellos automáticamente</strong> en cada visita</li>
                    <li><strong>Canjea recompensas increíbles</strong> como comidas gratis, descuentos especiales y más</li>
                    <li><strong>Sigue tu progreso</strong> y nunca pierdas una oportunidad de ganar</li>
                </ul>
            </div>

            <div class="footer">
                <p><strong>¡Bienvenido a la familia LoyaltyCard!</strong></p>
                <p>Estamos emocionados de ayudarte a obtener las mejores recompensas.</p>
                <p style="margin-top: 20px;">
                    © 2025 CaseroApp. Todos los derechos reservados.<br>
                    <small>Este es un email automático, por favor no respondas a este mensaje.</small>
                </p>
            </div>
        </div>
    </body>
    </html>
  `;
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

    let subject, html;

    if (userType === "business") {
      subject = "¡Bienvenido a CaseroApp! - Tu plataforma de fidelización empresarial";
      html = getBusinessWelcomeTemplate(displayName);
    } else {
      subject = "¡Bienvenido a CaseroApp! - Descubre recompensas increíbles";
      html = getCustomerWelcomeTemplate(displayName);
    }

    // SendGrid API payload
    const emailData = {
      personalizations: [
        {
          to: [{ email: email, name: displayName }],
          subject: subject,
        },
      ],
      from: {
        email: "thomaswar3@gmail.com",
        name: "CaseroApp",
      },
      content: [
        {
          type: "text/html",
          value: html,
        },
      ],
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
