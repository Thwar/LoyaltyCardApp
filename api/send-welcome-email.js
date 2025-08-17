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
        <title>Bienvenido a CaseroApp - Tu Plataforma de Fidelización</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Baloo+Bhaijaan+2:wght@400;500;600;700;800&display=swap');
            
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: 'Baloo Bhaijaan 2', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                line-height: 1.6;
                color: #1a1a1a;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                margin: 0;
                padding: 20px 0;
                min-height: 100vh;
            }
            
            .email-wrapper {
                max-width: 600px;
                margin: 0 auto;
                background: transparent;
            }
            
            .container {
                background: #ffffff;
                border-radius: 16px;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
                overflow: hidden;
                margin: 20px;
            }
            
            .header {
                background: linear-gradient(135deg, #E53935 0%, #C62828 100%);
                color: white;
                padding: 40px 32px;
                text-align: center;
                position: relative;
            }
            
            .header::before {
                content: '';
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                height: 20px;
                background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none"><path d="M1200 120L0 16.48V0h1200v120z" fill="%23ffffff"></path></svg>') no-repeat center bottom;
                background-size: cover;
            }
            
            .logo-container {
                margin-bottom: 20px;
            }
            
            .logo-img {
                max-width: 250px;
                height: auto;
                filter: brightness(0) invert(1);
                margin-bottom: 12px;
            }
            
            .brand-name {
                font-size: 32px;
                font-weight: 700;
                margin-bottom: 8px;
                letter-spacing: -0.02em;
            }
            
            .brand-tagline {
                font-size: 16px;
                opacity: 0.9;
                font-weight: 300;
            }
            
            .content {
                padding: 48px 32px;
            }
            
            .welcome-title {
                font-size: 28px;
                font-weight: 600;
                color: #1a1a1a;
                margin-bottom: 24px;
                text-align: center;
                letter-spacing: -0.02em;
            }
            
            .intro-text {
                font-size: 16px;
                color: #4a5568;
                margin-bottom: 32px;
                text-align: center;
                line-height: 1.7;
            }
            
            .highlight-box {
                background: linear-gradient(135deg, #E53935 0%, #C62828 100%);
                color: white;
                padding: 24px;
                border-radius: 12px;
                margin: 32px 0;
                text-align: center;
            }
            
            .highlight-box h3 {
                font-size: 20px;
                font-weight: 600;
                margin-bottom: 8px;
            }
            
            .highlight-box p {
                font-size: 15px;
                opacity: 0.95;
                line-height: 1.6;
            }
            
            .features-section {
                margin: 40px 0;
            }
            
            .features-title {
                font-size: 20px;
                font-weight: 600;
                color: #1a1a1a;
                margin-bottom: 24px;
                text-align: center;
            }
            
            .features-grid {
                display: grid;
                gap: 16px;
            }
            
            .feature-item {
                display: flex;
                align-items: flex-start;
                gap: 16px;
                padding: 20px;
                background: #f8fafc;
                border-radius: 12px;
                border-left: 4px solid #E53935;
            }
            
            .feature-icon {
                flex-shrink: 0;
                width: 40px;
                height: 40px;
                background: linear-gradient(135deg, #E53935 0%, #C62828 100%);
                border-radius: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 18px;
            }
            
            .feature-content h4 {
                font-size: 16px;
                font-weight: 600;
                color: #1a1a1a;
                margin-bottom: 4px;
            }
            
            .feature-content p {
                font-size: 14px;
                color: #64748b;
                line-height: 1.5;
            }
            
            .cta-section {
                text-align: center;
                margin: 40px 0;
                padding: 32px;
                background: #f8fafc;
                border-radius: 12px;
            }
            
            .cta-button {
                display: inline-block;
                background: linear-gradient(135deg, #E53935 0%, #C62828 100%);
                color: white;
                padding: 16px 32px;
                border-radius: 10px;
                text-decoration: none;
                font-weight: 600;
                font-size: 16px;
                box-shadow: 0 4px 12px rgba(229, 57, 53, 0.3);
                transition: transform 0.2s ease;
            }
            
            .cta-button:hover {
                transform: translateY(-2px);
            }
            
            .footer {
                background: #f8fafc;
                padding: 32px;
                text-align: center;
                border-top: 1px solid #e2e8f0;
            }
            
            .footer-content {
                max-width: 400px;
                margin: 0 auto;
            }
            
            .footer h3 {
                font-size: 18px;
                font-weight: 600;
                color: #1a1a1a;
                margin-bottom: 12px;
            }
            
            .footer p {
                font-size: 14px;
                color: #64748b;
                margin-bottom: 8px;
            }
            
            .footer-legal {
                margin-top: 24px;
                padding-top: 24px;
                border-top: 1px solid #e2e8f0;
                font-size: 12px;
                color: #94a3b8;
            }
            
            @media (max-width: 600px) {
                .container {
                    margin: 10px;
                    border-radius: 12px;
                }
                
                .header {
                    padding: 32px 24px;
                }
                
                .content {
                    padding: 32px 24px;
                }
                
                .brand-name {
                    font-size: 28px;
                }
                
                .welcome-title {
                    font-size: 24px;
                }
            }
        </style>
    </head>
    <body>
        <div class="email-wrapper">
            <div class="container">
                <div class="header">
                    <div class="logo-container">
                        <img src="https://caseroapp.com/landing/assets/logo.png" alt="CaseroApp Logo" class="logo-img" onerror="this.style.display='none';" />
                        <div class="brand-tagline">Plataforma Empresarial de Fidelización</div>
                    </div>
                </div>

                <div class="content">
                    <h1 class="welcome-title">¡Bienvenido, ${displayName}!</h1>
                    
                    <p class="intro-text">
                        Nos complace darte la bienvenida a <strong>CaseroApp</strong>, la plataforma líder que revolucionará la forma en que conectas con tus clientes y haces crecer tu negocio.
                    </p>

                    <div class="highlight-box">
                        <h3>🎉 ¡Tu viaje hacia el éxito comienza aquí!</h3>
                        <p>Acabas de unirte a miles de empresarios que han transformado visitantes ocasionales en clientes fieles usando nuestras herramientas de fidelización.</p>
                    </div>

                    <div class="features-section">
                        <h2 class="features-title">🚀 Potencia tu negocio con CaseroApp</h2>
                        <div class="features-grid">
                            <div class="feature-item">
                                <div class="feature-icon">🎨</div>
                                <div class="feature-content">
                                    <h4>Tarjetas Personalizadas</h4>
                                    <p>Diseña tarjetas de fidelización únicas que reflejen tu marca con colores, logos y recompensas atractivas.</p>
                                </div>
                            </div>
                            <div class="feature-item">
                                <div class="feature-icon">🎁</div>
                                <div class="feature-content">
                                    <h4>Sistema de Recompensas</h4>
                                    <p>Crea incentivos irresistibles que motiven a tus clientes a regresar una y otra vez.</p>
                                </div>
                            </div>
                            <div class="feature-item">
                                <div class="feature-icon">📊</div>
                                <div class="feature-content">
                                    <h4>Análisis en Tiempo Real</h4>
                                    <p>Monitorea el progreso de tus programas y obtén insights valiosos sobre el comportamiento de tus clientes.</p>
                                </div>
                            </div>
                            <div class="feature-item">
                                <div class="feature-icon">📱</div>
                                <div class="feature-content">
                                    <h4>Código QR Inteligente</h4>
                                    <p>Comparte tus programas fácilmente y permite a los clientes unirse con un simple escaneo.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="cta-section">
                        <h3 style="margin-bottom: 16px; color: #1a1a1a;">¿Listo para comenzar?</h3>
                        <p style="margin-bottom: 24px; color: #64748b;">Accede a tu cuenta y crea tu primer programa de fidelización en minutos.</p>
                        <a href="www.caseroapp.com/web" class="cta-button">Iniciar Sesión</a>
                    </div>
                </div>

                <div class="footer">
                    <div class="footer-content">
                        <h3>¡Bienvenido a la familia CaseroApp!</h3>
                        <p>Estamos aquí para apoyarte en cada paso de tu crecimiento empresarial.</p>
                        <p>Si tienes preguntas, nuestro equipo está listo para ayudarte.</p>
                    </div>
                    <div class="footer-legal">
                        © 2025 CaseroApp. Todos los derechos reservados.<br>
                        <small>Este es un correo automático. Por favor, no respondas a este mensaje.</small>
                    </div>
                </div>
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
        <title>Bienvenido a CaseroApp - Tu Billetera Digital de Recompensas</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Baloo+Bhaijaan+2:wght@400;500;600;700;800&display=swap');
            
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: 'Baloo Bhaijaan 2', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                line-height: 1.6;
                color: #1a1a1a;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                margin: 0;
                padding: 20px 0;
                min-height: 100vh;
            }
            
            .email-wrapper {
                max-width: 600px;
                margin: 0 auto;
                background: transparent;
            }
            
            .container {
                background: #ffffff;
                border-radius: 16px;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
                overflow: hidden;
                margin: 20px;
            }
            
            .header {
                background: linear-gradient(135deg, #E53935 0%, #C62828 100%);
                color: white;
                padding: 40px 32px;
                text-align: center;
                position: relative;
            }
            
            .header::before {
                content: '';
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                height: 20px;
                background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none"><path d="M1200 120L0 16.48V0h1200v120z" fill="%23ffffff"></path></svg>') no-repeat center bottom;
                background-size: cover;
            }
            
            .logo-container {
                margin-bottom: 20px;
            }
            
            .logo-img {
                max-width: 250px;
                height: auto;
                filter: brightness(0) invert(1);
                margin-bottom: 12px;
            }
            
            .brand-name {
                font-size: 32px;
                font-weight: 700;
                margin-bottom: 8px;
                letter-spacing: -0.02em;
            }
            
            .brand-tagline {
                font-size: 16px;
                opacity: 0.9;
                font-weight: 300;
            }
            
            .content {
                padding: 48px 32px;
            }
            
            .welcome-title {
                font-size: 28px;
                font-weight: 600;
                color: #1a1a1a;
                margin-bottom: 24px;
                text-align: center;
                letter-spacing: -0.02em;
            }
            
            .intro-text {
                font-size: 16px;
                color: #4a5568;
                margin-bottom: 32px;
                text-align: center;
                line-height: 1.7;
            }
            
            .highlight-box {
                background: linear-gradient(135deg, #E53935 0%, #C62828 100%);
                color: white;
                padding: 24px;
                border-radius: 12px;
                margin: 32px 0;
                text-align: center;
            }
            
            .highlight-box h3 {
                font-size: 20px;
                font-weight: 600;
                margin-bottom: 8px;
            }
            
            .highlight-box p {
                font-size: 15px;
                opacity: 0.95;
                line-height: 1.6;
            }
            
            .features-section {
                margin: 40px 0;
            }
            
            .features-title {
                font-size: 20px;
                font-weight: 600;
                color: #1a1a1a;
                margin-bottom: 24px;
                text-align: center;
            }
            
            .features-grid {
                display: grid;
                gap: 16px;
            }
            
            .feature-item {
                display: flex;
                align-items: flex-start;
                gap: 16px;
                padding: 20px;
                background: #f8fafc;
                border-radius: 12px;
                border-left: 4px solid #E53935;
            }
            
            .feature-icon {
                flex-shrink: 0;
                width: 40px;
                height: 40px;
                background: linear-gradient(135deg, #E53935 0%, #C62828 100%);
                border-radius: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 18px;
            }
            
            .feature-content h4 {
                font-size: 16px;
                font-weight: 600;
                color: #1a1a1a;
                margin-bottom: 4px;
            }
            
            .feature-content p {
                font-size: 14px;
                color: #64748b;
                line-height: 1.5;
            }
            
            .reward-box {
                background: linear-gradient(135deg, #FFA726 0%, #FF7043 100%);
                color: white;
                padding: 24px;
                border-radius: 12px;
                margin: 32px 0;
                text-align: center;
            }
            
            .reward-box h3 {
                font-size: 20px;
                font-weight: 600;
                margin-bottom: 8px;
            }
            
            .cta-section {
                text-align: center;
                margin: 40px 0;
                padding: 32px;
                background: #f8fafc;
                border-radius: 12px;
            }
            
            .cta-button {
                display: inline-block;
                background: linear-gradient(135deg, #E53935 0%, #C62828 100%);
                color: white;
                padding: 16px 32px;
                border-radius: 10px;
                text-decoration: none;
                font-weight: 600;
                font-size: 16px;
                box-shadow: 0 4px 12px rgba(229, 57, 53, 0.3);
                transition: transform 0.2s ease;
            }
            
            .cta-button:hover {
                transform: translateY(-2px);
            }
            
            .footer {
                background: #f8fafc;
                padding: 32px;
                text-align: center;
                border-top: 1px solid #e2e8f0;
            }
            
            .footer-content {
                max-width: 400px;
                margin: 0 auto;
            }
            
            .footer h3 {
                font-size: 18px;
                font-weight: 600;
                color: #1a1a1a;
                margin-bottom: 12px;
            }
            
            .footer p {
                font-size: 14px;
                color: #64748b;
                margin-bottom: 8px;
            }
            
            .footer-legal {
                margin-top: 24px;
                padding-top: 24px;
                border-top: 1px solid #e2e8f0;
                font-size: 12px;
                color: #94a3b8;
            }
            
            @media (max-width: 600px) {
                .container {
                    margin: 10px;
                    border-radius: 12px;
                }
                
                .header {
                    padding: 32px 24px;
                }
                
                .content {
                    padding: 32px 24px;
                }
                
                .brand-name {
                    font-size: 28px;
                }
                
                .welcome-title {
                    font-size: 24px;
                }
            }
        </style>
    </head>
    <body>
        <div class="email-wrapper">
            <div class="container">
                <div class="header">
                    <div class="logo-container">
                        <img src="https://caseroapp.com/landing/assets/logo.png" alt="CaseroApp Logo" class="logo-img" onerror="this.style.display='none';" />
                        <div class="brand-tagline">Tu Billetera Digital de Recompensas</div>
                    </div>
                </div>

                <div class="content">
                    <h1 class="welcome-title">¡Hola, ${displayName}!</h1>
                    
                    <p class="intro-text">
                        ¡Bienvenido a <strong>CaseroApp</strong>! Estás a punto de descubrir un mundo lleno de recompensas increíbles en tus lugares favoritos.
                    </p>

                    <div class="highlight-box">
                        <h3>🎉 ¡Tu aventura de recompensas comienza ahora!</h3>
                        <p>Cada visita a tus restaurantes, cafeterías y tiendas favoritas te acerca más a obtener increíbles premios y descuentos exclusivos.</p>
                    </div>

                    <div class="features-section">
                        <h2 class="features-title">🌟 Descubre todo lo que puedes hacer</h2>
                        <div class="features-grid">
                            <div class="feature-item">
                                <div class="feature-icon">🔍</div>
                                <div class="feature-content">
                                    <h4>Explora Negocios Cercanos</h4>
                                    <p>Descubre restaurantes, cafeterías y tiendas locales que ofrecen programas de fidelización increíbles.</p>
                                </div>
                            </div>
                            <div class="feature-item">
                                <div class="feature-icon">💳</div>
                                <div class="feature-content">
                                    <h4>Únete Fácilmente</h4>
                                    <p>Conéctate a programas de lealtad con un simple toque y comienza a acumular recompensas de inmediato.</p>
                                </div>
                            </div>
                            <div class="feature-item">
                                <div class="feature-icon">⭐</div>
                                <div class="feature-content">
                                    <h4>Acumula Sellos Automáticamente</h4>
                                    <p>Gana sellos en cada visita sin complicaciones. Todo se registra automáticamente en tu perfil.</p>
                                </div>
                            </div>
                            <div class="feature-item">
                                <div class="feature-icon">🎁</div>
                                <div class="feature-content">
                                    <h4>Canjea Recompensas Increíbles</h4>
                                    <p>Disfruta de comidas gratis, descuentos especiales, productos exclusivos y mucho más.</p>
                                </div>
                            </div>
                            <div class="feature-item">
                                <div class="feature-icon">📊</div>
                                <div class="feature-content">
                                    <h4>Sigue Tu Progreso</h4>
                                    <p>Mantén un registro de todos tus sellos y recompensas en una interfaz simple e intuitiva.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="reward-box">
                        <h3>🏆 ¡Obtén tu primera recompensa!</h3>
                        <p>Busca negocios en tu área, únete a un programa y comienza a acumular sellos. ¡Tu primera recompensa te está esperando!</p>
                    </div>

                    <div class="cta-section">
                        <h3 style="margin-bottom: 16px; color: #1a1a1a;">¿Listo para comenzar?</h3>
                        <p style="margin-bottom: 24px; color: #64748b;">Explora la app y descubre todas las recompensas que tienes disponibles.</p>
                        <a href="#" class="cta-button">Explorar Recompensas</a>
                    </div>
                </div>

                <div class="footer">
                    <div class="footer-content">
                        <h3>¡Bienvenido a la familia CaseroApp!</h3>
                        <p>Estamos emocionados de ayudarte a obtener las mejores recompensas en tus lugares favoritos.</p>
                        <p>¡Disfruta coleccionando sellos y canjeando premios increíbles!</p>
                    </div>
                    <div class="footer-legal">
                        © 2025 CaseroApp. Todos los derechos reservados.<br>
                        <small>Este es un correo automático. Por favor, no respondas a este mensaje.</small>
                    </div>
                </div>
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
      subject = "🚀 ¡Bienvenido a CaseroApp! Tu plataforma de fidelización empresarial está lista";
      html = getBusinessWelcomeTemplate(displayName);
    } else {
      subject = "🎉 ¡Bienvenido a CaseroApp! Descubre un mundo de recompensas increíbles";
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
