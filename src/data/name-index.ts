import { CountryNameResolver } from "@/domain/name-resolution";

import { entities } from "./runtime-catalog";

let resolver: CountryNameResolver | undefined;

/**
 * Instância única do resolvedor de nomes, construída sob demanda.
 *
 * O índice cobre os nomes e apelidos das 220 entidades, e era construído duas
 * vezes — uma no escopo de módulo do StudySession e outra no do
 * DiagnosticSession —, no momento do import de cada um. Memoizar aqui garante
 * um índice só, montado apenas quando alguma tela de fato classifica um nome.
 */
export function getNameResolver(): CountryNameResolver {
  resolver ??= new CountryNameResolver(entities);
  return resolver;
}
