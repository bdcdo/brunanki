import type { LearningEntity, Membership } from "../src/types/catalog";

/**
 * Quem entra no catálogo, definido uma vez só.
 *
 * A regra mora aqui, e não no gerador, porque três lugares precisam concordar
 * sobre ela: `refresh-catalog.ts`, que produz o artefato; `validate-catalog.ts`,
 * que o confere no gate de CI; e `src/data/catalog.test.ts`, que a exercita
 * contra o artefato commitado. Um critério reescrito em cada um deles
 * divergiria em silêncio — foi assim que o eixo FIFA acabou decidindo, por
 * acidente, a presença de uma entidade da ONU (ver `UN_OBSERVER_ISO3`).
 */

/**
 * Os Estados observadores permanentes da ONU, em ISO 3166-1 alfa-3.
 *
 * A lista é explícita e não derivada porque a fonte upstream não a expõe:
 * `restcountries` só tem o booleano `unMember`, e para ambos ele é `false`.
 * Antes disso, a Palestina entrava no catálogo por ser associação da FIFA, e
 * só depois recebia o status de observadora — de modo que remover o eixo FIFA
 * a teria feito desaparecer sem que nenhum assert acusasse.
 */
export const UN_OBSERVER_ISO3 = ["PSE", "VAT"] as const;

/**
 * Os mesmos observadores como IDs de entidade.
 *
 * O ID é o ISO3 em minúsculas (`entityIdForCountry`, em `refresh-catalog.ts`);
 * derivar em vez de repetir a lista mantém as duas formas impossíveis de
 * dessincronizar.
 */
export const UN_OBSERVER_ENTITY_IDS: readonly string[] = UN_OBSERVER_ISO3.map(
  (iso3) => iso3.toLocaleLowerCase("en-US")
);

/**
 * A filiação à ONU de uma entidade, ou `undefined` se ela não tiver nenhuma.
 *
 * É a primitiva da qual todo o resto se deriva: pertencer ao catálogo é ter
 * esta filiação, e ser membro ou observador é o `status` dela. Uma função só,
 * em vez de um trio `belongs`/`isMember`/`isObserver`, porque as três
 * responderiam à mesma pergunta e poderiam responder diferente.
 */
export function unMembership(entity: LearningEntity): Membership | undefined {
  return entity.memberships.find(({ organization }) => organization === "UN");
}

/**
 * O critério de pertencimento ao catálogo: membros e observadores da ONU.
 *
 * Os observadores entram porque o corte é "reconhecido pela ONU", não "membro
 * pleno" — a Santa Sé e a Palestina têm bandeira hasteada na sede e assento
 * permanente, e quem estuda o mundo as encontra.
 */
export function belongsToCatalog(entity: LearningEntity): boolean {
  return unMembership(entity) !== undefined;
}
