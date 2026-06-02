import Link from "next/link";

export const metadata = {
  title: "Política de Privacidad · SoyCasero",
  description: "Cómo SoyCasero recopila, usa y protege tus datos en su sitio web.",
};

// Ported from the old static site/privacy-policy/index.html so the policy lives
// at a stable in-app URL (/privacy-policy) for SSO consent screens + the footer.
export default function PrivacyPolicyPage() {
  return (
    <div className="container">
      <div className="center" style={{ margin: "6px 0 18px" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-rojo.png" alt="SoyCasero" className="brand-logo" style={{ height: 48 }} />
      </div>

      <article className="card legal" id="resumen">
        <h1 style={{ fontSize: 26, margin: 0 }}>Política de Privacidad</h1>
        <p className="muted" style={{ marginTop: 4 }}>Última actualización: 2 de junio de 2026</p>

        <p>
          Esta Política de Privacidad describe cómo <strong>SoyCasero</strong> (el “Sitio” o la “Plataforma”)
          recopila, utiliza y protege tu información cuando usas nuestros servicios en{" "}
          <a href="https://www.soycasero.com">https://www.soycasero.com</a>.
        </p>
        <p>
          Si tienes dudas, revisa el índice y contáctanos. Cuando sea necesario, también verás avisos específicos
          dentro de la plataforma.
        </p>

        <nav className="legal-toc" aria-label="Índice">
          <strong>Índice</strong>
          <ul>
            <li><a href="#responsable">1. Responsable del tratamiento</a></li>
            <li><a href="#datos">2. Qué datos recopilamos</a></li>
            <li><a href="#finalidades">3. Para qué usamos tus datos</a></li>
            <li><a href="#base-legal">4. Base legal (si aplica)</a></li>
            <li><a href="#cookies">5. Cookies y tecnologías similares</a></li>
            <li><a href="#terceros">6. Proveedores y servicios de terceros</a></li>
            <li><a href="#compartimos">7. Con quién compartimos información</a></li>
            <li><a href="#transferencias">8. Transferencias internacionales</a></li>
            <li><a href="#retencion">9. Conservación de la información</a></li>
            <li><a href="#seguridad">10. Seguridad</a></li>
            <li><a href="#derechos">11. Tus derechos y opciones</a></li>
            <li><a href="#menores">12. Privacidad de menores</a></li>
            <li><a href="#cambios">13. Cambios a esta política</a></li>
            <li><a href="#contacto">14. Contacto</a></li>
          </ul>
        </nav>

        <section id="responsable">
          <h2>1. Responsable del tratamiento</h2>
          <p>
            El responsable del tratamiento de los datos es SoyCasero. Si necesitas información adicional (por ejemplo,
            razón social o dirección), contáctanos y te la proporcionaremos.
          </p>
        </section>

        <section id="datos">
          <h2>2. Qué datos recopilamos</h2>
          <p>Dependiendo de cómo uses el Sitio, podemos recopilar:</p>
          <ul>
            <li><strong>Datos de cuenta</strong>: nombre, correo electrónico u otros datos que proporciones al registrarte o iniciar sesión.</li>
            <li><strong>Datos de uso</strong>: interacción con las funciones del Sitio, eventos de uso, errores y rendimiento.</li>
            <li><strong>Datos del dispositivo</strong>: modelo, sistema operativo, identificadores del dispositivo, idioma y zona horaria.</li>
            <li><strong>Contenido que ingresas</strong>: por ejemplo, información relacionada a tarjetas/programas de lealtad (según las funciones que utilices).</li>
            <li>
              <strong>SSO (inicio de sesión con terceros)</strong>: si eliges iniciar sesión con un proveedor (p. ej.,
              Google, Facebook o Apple), recibiremos los datos que ese proveedor nos comparta según tu configuración y
              permisos.
            </li>
          </ul>
          <p>
            No recopilamos deliberadamente información sensible (p. ej., datos financieros completos o identificaciones
            gubernamentales), salvo que sea estrictamente necesaria y se te informe previamente.
          </p>
        </section>

        <section id="finalidades">
          <h2>3. Para qué usamos tus datos</h2>
          <ul>
            <li>Proveer y operar el Sitio (crear tu cuenta, iniciar sesión, generar tus tarjetas de lealtad y mostrar tu progreso y recompensas).</li>
            <li>Mejorar el rendimiento, diagnosticar errores y optimizar la experiencia.</li>
            <li>Soporte al cliente y comunicación relacionada con el servicio.</li>
            <li>Seguridad, prevención de fraude y cumplimiento de obligaciones legales.</li>
          </ul>
        </section>

        <section id="base-legal">
          <h2>4. Base legal (si aplica)</h2>
          <p>
            Dependiendo de tu jurisdicción, nuestras bases legales pueden incluir: ejecución de un contrato (prestar el
            servicio), interés legítimo (mejoras y seguridad) y/o consentimiento (por ejemplo, ciertas cookies o
            comunicaciones).
          </p>
        </section>

        <section id="cookies">
          <h2>5. Cookies y tecnologías similares</h2>
          <p>
            El Sitio puede usar cookies o tecnologías similares para recordar preferencias, mantener sesiones y medir
            uso. Puedes controlar cookies desde la configuración de tu navegador.
          </p>
        </section>

        <section id="terceros">
          <h2>6. Proveedores y servicios de terceros</h2>
          <p>Para operar SoyCasero, podemos integrar servicios de terceros (según corresponda), por ejemplo:</p>
          <ul>
            <li><strong>Google Firebase</strong>: autenticación, inicio de sesión, base de datos y almacenamiento.</li>
            <li><strong>Vercel</strong>: alojamiento del sitio web.</li>
            <li><strong>Apple Wallet y Google Wallet</strong>: para generar y mantener actualizadas tus tarjetas de lealtad en la billetera de tu teléfono.</li>
            <li><strong>Resend</strong>: envío de correos electrónicos relacionados con el servicio (por ejemplo, de bienvenida).</li>
            <li><strong>Meta (Facebook), Google y Apple</strong>: inicio de sesión (SSO) cuando lo eliges.</li>
          </ul>
          <p>
            Estos proveedores pueden procesar datos en nuestro nombre para prestar sus servicios. Sus prácticas también
            están sujetas a sus propias políticas de privacidad.
          </p>
        </section>

        <section id="compartimos">
          <h2>7. Con quién compartimos información</h2>
          <p>Podemos compartir información únicamente cuando sea necesario:</p>
          <ul>
            <li>Con proveedores (encargados) que nos ayudan a operar el Sitio.</li>
            <li>Con negocios/programas de lealtad con los que interactúas, según la funcionalidad utilizada.</li>
            <li>Para cumplir la ley, responder a procesos legales o proteger derechos y seguridad.</li>
            <li>En una transacción corporativa (fusión/adquisición), con las salvaguardas correspondientes.</li>
          </ul>
        </section>

        <section id="transferencias">
          <h2>8. Transferencias internacionales</h2>
          <p>
            Tus datos pueden ser procesados en países distintos al tuyo (por ejemplo, donde operan nuestros
            proveedores). Cuando aplique, usaremos salvaguardas apropiadas para proteger tu información.
          </p>
        </section>

        <section id="retencion">
          <h2>9. Conservación de la información</h2>
          <p>
            Conservamos tus datos solo el tiempo necesario para prestar el servicio, cumplir obligaciones legales,
            resolver disputas y hacer cumplir acuerdos. Puedes solicitar la eliminación de tu cuenta (ver sección de
            derechos).
          </p>
        </section>

        <section id="seguridad">
          <h2>10. Seguridad</h2>
          <p>
            Implementamos medidas técnicas y organizativas razonables para proteger tus datos. Sin embargo, ningún
            sistema es 100% seguro. Recomendamos usar contraseñas fuertes y mantener tu dispositivo protegido.
          </p>
        </section>

        <section id="derechos">
          <h2>11. Tus derechos y opciones</h2>
          <p>Según tu país/estado, puedes tener derechos como:</p>
          <ul>
            <li>Acceder, corregir o actualizar tus datos.</li>
            <li>Solicitar eliminación de tu cuenta/datos (cuando corresponda).</li>
            <li>Oponerte o limitar ciertos tratamientos.</li>
            <li>Retirar tu consentimiento (si el tratamiento se basa en consentimiento).</li>
          </ul>
          <p>Para ejercerlos, contáctanos usando los datos de la sección “Contacto”.</p>
        </section>

        <section id="menores">
          <h2>12. Privacidad de menores</h2>
          <p>
            SoyCasero no está dirigido a menores de edad. Si crees que un menor nos proporcionó datos personales,
            contáctanos para que podamos eliminarlos.
          </p>
        </section>

        <section id="cambios">
          <h2>13. Cambios a esta política</h2>
          <p>
            Podemos actualizar esta política ocasionalmente. Publicaremos la versión vigente en esta misma página e
            indicaremos la fecha de “Última actualización”.
          </p>
        </section>

        <section id="contacto">
          <h2>14. Contacto</h2>
          <p>
            Para preguntas sobre privacidad o solicitudes relacionadas a tus datos, contáctanos en:{" "}
            <a href="mailto:admin@soycasero.com">admin@soycasero.com</a>
          </p>
        </section>

        <p className="muted legal-bottom">
          © 2026 SoyCasero · <Link href="/">Inicio</Link>
        </p>
      </article>
    </div>
  );
}
