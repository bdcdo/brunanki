/**
 * Identificador de tentativa.
 *
 * `crypto.randomUUID` só existe em contexto seguro (HTTPS ou localhost). A
 * ausência é sinalizada em vez de contornada com um gerador improvisado:
 * um ID fraco produziria colisões silenciosas no histórico, que é a única
 * cópia do progresso de quem estuda.
 */
export function newAttemptId(): string {
  if (typeof globalThis.crypto?.randomUUID !== "function") {
    throw new Error(
      "Este navegador não oferece crypto.randomUUID(); use uma conexão segura"
    );
  }
  return globalThis.crypto.randomUUID();
}
