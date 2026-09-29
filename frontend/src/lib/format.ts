export function formatCurrency(value: string | number): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return num.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}

export function formatPercent(value: number | null): string {
  if (value === null) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

/** API manda decimal em formato "10000.00" (ponto decimal). Usar pra
 * preencher um input de valor editável no padrão brasileiro ("10.000,00")
 * — sem isso, reabrir um form de edição sem BR-formatar o valor faz o
 * parse de volta (que espera ponto = separador de milhar) ler o ponto
 * decimal como milhar e multiplicar o valor por 100. */
export function toDecimalInput(value: string): string {
  const n = parseFloat(value);
  if (Number.isNaN(n)) return "";
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Inverso de `toDecimalInput`: do que o usuário digita ("10.000,00") pro
 * formato que a API espera ("10000.00"). */
export function parseDecimalInput(value: string): string {
  return value.replace(/\./g, "").replace(",", ".");
}
