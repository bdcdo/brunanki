import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combina classes condicionais e resolve conflitos entre utilitários.
 *
 * O `clsx` aceita as formas condicionais (string, objeto, arranjo) e o
 * `twMerge` decide quem ganha quando dois utilitários disputam a mesma
 * propriedade — sem ele, `cn("p-6", "p-0")` deixaria as duas classes no
 * elemento e o vencedor seria quem aparecesse por último no CSS gerado, que
 * não é a ordem em que foram escritas aqui.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
