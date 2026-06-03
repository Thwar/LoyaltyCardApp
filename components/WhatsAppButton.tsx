// Floating WhatsApp contact button for the landing page (SME's expected channel).
const PHONE = "59175983004"; // +591 75983004
const TEXT = "Hola, quiero más información sobre SoyCasero.";

export function WhatsAppButton() {
  return (
    <a
      href={`https://wa.me/${PHONE}?text=${encodeURIComponent(TEXT)}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Escríbenos por WhatsApp"
      style={{
        position: "fixed",
        bottom: 20,
        right: 20,
        zIndex: 60,
        width: 58,
        height: 58,
        borderRadius: "50%",
        background: "#25D366",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 6px 20px rgba(0,0,0,0.28)",
      }}
    >
      <svg width="32" height="32" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
        <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 2.1.55 4.15 1.6 5.96L2 22l4.25-1.11c1.74.95 3.7 1.45 5.79 1.45 5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zm0 18.13c-1.86 0-3.68-.5-5.27-1.45l-.38-.22-2.52.66.67-2.46-.25-.4a8.1 8.1 0 0 1-1.24-4.35c0-4.54 3.7-8.23 8.25-8.23 2.2 0 4.27.86 5.83 2.42a8.18 8.18 0 0 1 2.41 5.82c0 4.54-3.7 8.24-8.23 8.24zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.24-1.48-1.38-1.73-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43-.14-.01-.31-.01-.48-.01-.17 0-.43.06-.66.31-.23.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.1-.22-.16-.47-.28z" />
      </svg>
    </a>
  );
}
