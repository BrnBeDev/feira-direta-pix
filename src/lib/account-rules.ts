export function isProducerAccount(roles: readonly string[], ownsStall: boolean) {
  return roles.length > 0 ? roles.includes("produtor") : ownsStall;
}

export function validStock(value: string): number | null {
  if (!value.trim()) return null;
  const number = Number(value.replace(",", "."));
  return Number.isFinite(number) && number >= 0 ? number : null;
}