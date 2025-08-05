import { Resend } from 'resend';

// Initialize Resend with API key
const resend = new Resend('re_DN28F9BM_E7sbVGgM76wHWMhTUPicXomT');

interface EmailData {
  to: string;
  subject: string;
  html: string;
}

interface WelcomeEmailParams {
  email: string;
  displayName: string;
  userType: 'customer' | 'business';
}

class EmailService {
  private static readonly FROM_EMAIL = 'noreply@loyaltyapp.com';
  private static readonly COMPANY_NAME = 'LoyaltyCard App';

  /**
   * Sends a welcome email to new users
   */
  static async sendWelcomeEmail(params: WelcomeEmailParams): Promise<boolean> {
    try {
      const emailData = this.buildWelcomeEmail(params);
      
      const result = await resend.emails.send({
        from: this.FROM_EMAIL,
        to: emailData.to,
        subject: emailData.subject,
        html: emailData.html,
      });

      console.log('Welcome email sent successfully:', result);
      return true;
    } catch (error) {
      console.error('Error sending welcome email:', error);
      return false;
    }
  }

  /**
   * Builds the welcome email content based on user type
   */
  private static buildWelcomeEmail(params: WelcomeEmailParams): EmailData {
    const { email, displayName, userType } = params;
    
    if (userType === 'business') {
      return {
        to: email,
        subject: '¡Bienvenido a LoyaltyCard App! - Tu plataforma de fidelización empresarial',
        html: this.getBusinessWelcomeTemplate(displayName)
      };
    } else {
      return {
        to: email,
        subject: '¡Bienvenido a LoyaltyCard App! - Descubre recompensas increíbles',
        html: this.getCustomerWelcomeTemplate(displayName)
      };
    }
  }

  /**
   * Business welcome email template
   */
  private static getBusinessWelcomeTemplate(displayName: string): string {
    return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Bienvenido a LoyaltyCard App</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f8f9fa;
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
                border-bottom: 3px solid #007bff;
            }
            .logo {
                font-size: 28px;
                font-weight: bold;
                color: #007bff;
                margin-bottom: 10px;
            }
            .welcome-title {
                color: #2c3e50;
                font-size: 24px;
                margin-bottom: 20px;
                text-align: center;
            }
            .content {
                margin-bottom: 30px;
            }
            .highlight {
                background-color: #e3f2fd;
                padding: 20px;
                border-radius: 8px;
                border-left: 4px solid #007bff;
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
            .cta-button {
                display: inline-block;
                background-color: #007bff;
                color: white;
                padding: 15px 30px;
                text-decoration: none;
                border-radius: 8px;
                font-weight: bold;
                text-align: center;
                margin: 20px 0;
            }
            .footer {
                text-align: center;
                margin-top: 40px;
                padding-top: 20px;
                border-top: 1px solid #eee;
                color: #666;
                font-size: 14px;
            }
            .support-box {
                background-color: #f8f9fa;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
                text-align: center;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">🎯 LoyaltyCard App</div>
                <p style="color: #666; margin: 0;">Plataforma Empresarial de Fidelización</p>
            </div>

            <h1 class="welcome-title">¡Bienvenido, ${displayName}!</h1>

            <div class="content">
                <p>Nos complace darte la bienvenida a <strong>LoyaltyCard App</strong>, la plataforma líder en soluciones de fidelización empresarial.</p>
                
                <div class="highlight">
                    <p><strong>¡Felicidades por dar el primer paso hacia el crecimiento de tu negocio!</strong></p>
                    <p>Ahora puedes crear programas de fidelización que transformarán visitantes ocasionales en clientes leales.</p>
                </div>

                <h3 style="color: #007bff;">🚀 Lo que puedes hacer ahora:</h3>
                <ul class="features">
                    <li><strong>Crear tarjetas de fidelización personalizadas</strong> con tu marca y colores</li>
                    <li><strong>Gestionar recompensas atractivas</strong> que incentiven el regreso de tus clientes</li>
                    <li><strong>Seguimiento en tiempo real</strong> de la actividad de tus programas</li>
                    <li><strong>Administrar clientes</strong> y ver estadísticas detalladas</li>
                    <li><strong>Compartir fácilmente</strong> tus programas con códigos QR</li>
                </ul>

                <h3 style="color: #28a745;">💡 Beneficios para tu negocio:</h3>
                <ul class="features">
                    <li><strong>Incrementa la retención de clientes</strong> hasta un 60%</li>
                    <li><strong>Aumenta la frecuencia de visitas</strong> y el ticket promedio</li>
                    <li><strong>Obtén datos valiosos</strong> sobre el comportamiento de tus clientes</li>
                    <li><strong>Diferénciate de la competencia</strong> con experiencias únicas</li>
                    <li><strong>Reduce costos de marketing</strong> con clientes que regresan</li>
                </ul>

                <div class="support-box">
                    <h3 style="color: #dc3545; margin-top: 0;">🎯 Primeros pasos recomendados:</h3>
                    <ol style="text-align: left; display: inline-block;">
                        <li>Completa tu perfil empresarial</li>
                        <li>Crea tu primera tarjeta de fidelización</li>
                        <li>Define una recompensa atractiva</li>
                        <li>Comparte el programa con tus clientes</li>
                        <li>¡Comienza a ver resultados!</li>
                    </ol>
                </div>
            </div>

            <div style="text-align: center;">
                <a href="#" class="cta-button">Comenzar Ahora</a>
            </div>

            <div class="support-box">
                <h4 style="color: #6c757d; margin-top: 0;">💬 ¿Necesitas ayuda?</h4>
                <p style="margin-bottom: 10px;">Nuestro equipo de soporte está aquí para ayudarte</p>
                <p style="margin: 5px 0;"><strong>Email:</strong> soporte@loyaltyapp.com</p>
                <p style="margin: 5px 0;"><strong>Horario:</strong> Lunes a Viernes, 9:00 AM - 6:00 PM</p>
            </div>

            <div class="footer">
                <p><strong>¡Gracias por confiar en LoyaltyCard App!</strong></p>
                <p>Estamos emocionados de ser parte del crecimiento de tu negocio.</p>
                <p style="margin-top: 20px;">
                    © 2025 LoyaltyCard App. Todos los derechos reservados.<br>
                    <small>Este es un email automático, por favor no respondas a este mensaje.</small>
                </p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  /**
   * Customer welcome email template
   */
  private static getCustomerWelcomeTemplate(displayName: string): string {
    return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Bienvenido a LoyaltyCard App</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f8f9fa;
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
                border-bottom: 3px solid #28a745;
            }
            .logo {
                font-size: 28px;
                font-weight: bold;
                color: #28a745;
                margin-bottom: 10px;
            }
            .welcome-title {
                color: #2c3e50;
                font-size: 24px;
                margin-bottom: 20px;
                text-align: center;
            }
            .content {
                margin-bottom: 30px;
            }
            .highlight {
                background-color: #e8f5e8;
                padding: 20px;
                border-radius: 8px;
                border-left: 4px solid #28a745;
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
            .cta-button {
                display: inline-block;
                background-color: #28a745;
                color: white;
                padding: 15px 30px;
                text-decoration: none;
                border-radius: 8px;
                font-weight: bold;
                text-align: center;
                margin: 20px 0;
            }
            .footer {
                text-align: center;
                margin-top: 40px;
                padding-top: 20px;
                border-top: 1px solid #eee;
                color: #666;
                font-size: 14px;
            }
            .reward-showcase {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 25px;
                border-radius: 12px;
                margin: 25px 0;
                text-align: center;
            }
            .tip-box {
                background-color: #fff3cd;
                border: 1px solid #ffeaa7;
                padding: 15px;
                border-radius: 8px;
                margin: 20px 0;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">🎁 LoyaltyCard App</div>
                <p style="color: #666; margin: 0;">Tu Pasaporte a Increíbles Recompensas</p>
            </div>

            <h1 class="welcome-title">¡Hola, ${displayName}!</h1>

            <div class="content">
                <p>¡Bienvenido a <strong>LoyaltyCard App</strong>! Estás a punto de descubrir un mundo lleno de recompensas increíbles en tus lugares favoritos.</p>
                
                <div class="highlight">
                    <p><strong>🎉 ¡Tu aventura de recompensas comienza ahora!</strong></p>
                    <p>Cada visita a tus restaurantes, cafeterías y tiendas favoritas te acerca más a obtener increíbles premios.</p>
                </div>

                <div class="reward-showcase">
                    <h3 style="margin-top: 0;">✨ ¿Cómo funciona?</h3>
                    <p><strong>1. Visita</strong> → <strong>2. Acumula sellos</strong> → <strong>3. Obtén recompensas</strong></p>
                    <p style="font-size: 18px; margin-bottom: 0;">¡Es así de simple!</p>
                </div>

                <h3 style="color: #28a745;">🌟 Descubre lo que puedes hacer:</h3>
                <ul class="features">
                    <li><strong>Explora negocios cercanos</strong> que ofrecen programas de fidelización</li>
                    <li><strong>Únete a programas</strong> de tus lugares favoritos con un simple toque</li>
                    <li><strong>Acumula sellos automáticamente</strong> en cada visita</li>
                    <li><strong>Canjea recompensas increíbles</strong> como comidas gratis, descuentos especiales y más</li>
                    <li><strong>Sigue tu progreso</strong> y nunca pierdas una oportunidad de ganar</li>
                </ul>

                <h3 style="color: #dc3545;">🎯 Ejemplos de recompensas que puedes obtener:</h3>
                <ul class="features">
                    <li><strong>Café gratis</strong> después de 8 visitas</li>
                    <li><strong>Descuento del 20%</strong> en tu próxima compra</li>
                    <li><strong>Comida gratis</strong> al completar tu tarjeta</li>
                    <li><strong>Ofertas exclusivas</strong> solo para miembros</li>
                    <li><strong>Acceso anticipado</strong> a nuevos productos</li>
                </ul>

                <div class="tip-box">
                    <h4 style="color: #856404; margin-top: 0;">💡 Consejo especial:</h4>
                    <p style="margin-bottom: 0;">¡No olvides mostrar tu tarjeta digital en cada visita! Es la clave para acumular sellos y obtener esas recompensas que tanto deseas.</p>
                </div>
            </div>

            <div style="text-align: center;">
                <a href="#" class="cta-button">Explorar Negocios</a>
            </div>

            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
                <h4 style="color: #6c757d; margin-top: 0;">📱 Tu tarjeta siempre contigo</h4>
                <p style="margin-bottom: 10px;">Accede a todas tus tarjetas de fidelización desde cualquier lugar</p>
                <p style="margin: 5px 0;"><strong>💾 Nunca las pierdas</strong> - Todo se guarda automáticamente</p>
                <p style="margin: 5px 0;"><strong>📊 Sigue tu progreso</strong> - Ve cuántos sellos te faltan</p>
                <p style="margin: 5px 0;"><strong>🔔 Recibe notificaciones</strong> - Cuando tengas recompensas listas</p>
            </div>

            <div class="footer">
                <p><strong>¡Bienvenido a la familia LoyaltyCard!</strong></p>
                <p>Estamos emocionados de ayudarte a obtener las mejores recompensas.</p>
                <p style="margin-top: 20px;">
                    © 2025 LoyaltyCard App. Todos los derechos reservados.<br>
                    <small>Este es un email automático, por favor no respondas a este mensaje.</small>
                </p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  /**
   * Sends a test email to verify the service is working (for development only)
   */
  static async sendTestEmail(to: string): Promise<boolean> {
    try {
      const result = await resend.emails.send({
        from: this.FROM_EMAIL,
        to: to,
        subject: 'Test Email - LoyaltyCard App',
        html: `
          <h1>Test Email</h1>
          <p>This is a test email from LoyaltyCard App email service.</p>
          <p>If you receive this, the email service is working correctly!</p>
        `
      });

      console.log('Test email sent successfully:', result);
      return true;
    } catch (error) {
      console.error('Error sending test email:', error);
      return false;
    }
  }
}

export default EmailService;