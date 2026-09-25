import { CountryNameResolver } from "@/domain/name-resolution";

import { entities } from "./runtime-catalog";

let resolver: CountryNameResolver | undefined;

/**
 * Instância única do resolvedor de nomes, construída sob demanda.
 *
 * O índice cobre os nomes e apelidos de todas as entidades. Construído no
 * escopo de módulo de cada tela que classifica nomes, ele existia uma vez por
 * tela, no momento do import. Memoizar aqui garante um índice só, montado
 * apenas quando alguma tela de fato classifica um nome.
 */
export function getNameResolver(): CountryNameResolver {
  resolver ??= new CountryNameResolver(entities);
  return resolver;
}
