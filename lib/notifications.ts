// Default wallet notification templates + token interpolation.
// Tokens: {sellos} = current stamp count, {total} = stamps needed for the reward.
// Owners can override these per card (paid plans). The welcome message is
// editable on every plan and lives on LoyaltyCard.welcomeMessage.
export const NOTIF_DEFAULTS = {
  stamp: "¡Nuevo sello! Llevas {sellos}/{total}.",
  complete: "¡Tarjeta completa ({sellos}/{total})! Ya puedes canjear tu recompensa 🎁",
  redeem: "🎁 ¡Recompensa canjeada! Tu tarjeta se reinició.",
};

export function renderNotif(template: string, sellos: number, total: number): string {
  return template.replace(/\{sellos\}/g, String(sellos)).replace(/\{total\}/g, String(total));
}
