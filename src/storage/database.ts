"use client";

import Dexie, { type EntityTable } from "dexie";

import type {
  AppSettings,
  PairState,
  ReviewAttempt,
  SkillState
} from "@/types/learning";

import { defaultSchedulingPreferences } from "@/domain/scheduler";

export const DATABASE_NAME = "brunanki";
export const SINGLETON_KEY = "current";

export interface SettingsRecord {
  id: typeof SINGLETON_KEY;
  settings: AppSettings;
}

/**
 * O fuso é lido do dispositivo na primeira vez que as preferências são
 * necessárias, e não fixado no módulo, para que o valor gravado seja o de
 * quem está estudando. As Américas são o continente inicial porque são o
 * único liberado no piloto.
 */
export function defaultAppSettings(): AppSettings {
  return { ...defaultSchedulingPreferences(), activeContinent: "americas" };
}

/**
 * Completa preferências gravadas antes de existir o continente ativo. A
 * versão 3 do banco preserva as preferências de quem já usava o app, e elas
 * chegam sem o campo; ler assim evita uma segunda migração só para isso.
 */
export function completeAppSettings(
  stored: Partial<AppSettings> | undefined
): AppSettings {
  return { ...defaultAppSettings(), ...stored };
}

export class BrunankiDatabase extends Dexie {
  skillStates!: EntityTable<SkillState, "id">;
  attempts!: EntityTable<ReviewAttempt, "id">;
  pairStates!: EntityTable<PairState, "id">;
  appSettings!: EntityTable<SettingsRecord, "id">;

  constructor(name: string = DATABASE_NAME) {
    super(name);
    this.version(1).stores({
      skillStates: "id, entityId, skill, phase, updatedAt, [entityId+skill]",
      attempts:
        "id, entityId, skill, exercise, outcome, createdAt, [entityId+skill]",
      diagnostics: "id",
      appSettings: "id"
    });
    // O catálogo encolheu de 220 para 195 entidades, e o progresso guardado
    // referencia entidades por ID. Nada aqui filtrava esse estado contra o
    // catálogo — `readLearningSnapshot` devolve o que o Dexie tem, cru —,
    // então as linhas órfãs vazariam para o domínio: a fila de estudo
    // entregaria um item cuja entidade não existe, e `StudySession` o leria
    // como fim de sessão; pior, o diagnóstico pararia num cartão em branco,
    // sem botão de avançar e sem saída pela interface.
    //
    // O reset é a correção certa aqui, e não uma poda seletiva, porque o
    // progresso já vai ser zerado quando o backend entrar. Reconciliar item a
    // item seria construir uma máquina para descartá-la em seguida.
    //
    // `appSettings` sobrevive de propósito: retenção desejada e fuso não
    // referenciam entidade nenhuma, e perdê-los seria dano sem motivo.
    this.version(2)
      .stores({})
      .upgrade((transaction) =>
        Promise.all([
          transaction.table("skillStates").clear(),
          transaction.table("attempts").clear(),
          transaction.table("diagnostics").clear()
        ])
      );
    // Versão do piloto: o diagnóstico sai (a tabela é apagada, com o que
    // tiver) e entram os estados de par. O progresso inteiro recomeça, sem
    // migração, porque as tentativas antigas não têm modalidade nem XP, e
    // inventar esses campos para elas poria no histórico um dado que ninguém
    // mediu. As preferências sobrevivem pelo mesmo motivo da versão 2: não
    // referenciam entidade, e perdê-las seria dano sem motivo.
    this.version(3)
      .stores({ diagnostics: null, pairStates: "id, updatedAt" })
      .upgrade((transaction) =>
        Promise.all([
          transaction.table("skillStates").clear(),
          transaction.table("attempts").clear()
        ])
      );
  }
}

let database: BrunankiDatabase | undefined;

export function getDatabase(): BrunankiDatabase {
  database ??= new BrunankiDatabase();
  return database;
}

export async function getAppSettings(
  db: BrunankiDatabase = getDatabase()
): Promise<AppSettings> {
  return completeAppSettings(
    (await db.appSettings.get(SINGLETON_KEY))?.settings
  );
}

export async function saveAppSettings(
  settings: AppSettings,
  db: BrunankiDatabase = getDatabase()
): Promise<void> {
  if (
    !Number.isFinite(settings.desiredRetention) ||
    settings.desiredRetention <= 0 ||
    settings.desiredRetention > 1
  ) {
    throw new RangeError("desiredRetention deve estar no intervalo (0, 1]");
  }
  await db.appSettings.put({ id: SINGLETON_KEY, settings });
}

export async function saveReview(
  state: SkillState,
  attempt: ReviewAttempt,
  db: BrunankiDatabase = getDatabase()
): Promise<void> {
  if (state.entityId !== attempt.entityId || state.skill !== attempt.skill) {
    throw new Error("Tentativa e estado de habilidade não correspondem");
  }
  await db.transaction("rw", db.skillStates, db.attempts, async () => {
    await db.skillStates.put(state);
    await db.attempts.add(attempt);
  });
}

/**
 * Reescreve uma tentativa já gravada e o estado que ela produziu, como faz
 * "Foi chute". A tentativa precisa existir: um `put` sem essa conferência
 * gravaria como nova uma tentativa que nunca aconteceu, e o XP e o histórico
 * a contariam duas vezes se o ID viesse trocado.
 */
export async function amendReview(
  state: SkillState,
  attempt: ReviewAttempt,
  db: BrunankiDatabase = getDatabase()
): Promise<void> {
  if (state.entityId !== attempt.entityId || state.skill !== attempt.skill) {
    throw new Error("Tentativa e estado de habilidade não correspondem");
  }
  await db.transaction("rw", db.skillStates, db.attempts, async () => {
    const stored = await db.attempts.get(attempt.id);
    if (stored === undefined) {
      throw new Error("Só uma tentativa já gravada pode ser reescrita");
    }
    // A reescrita muda a marca e o XP, e nunca de qual bandeira, direção ou
    // exercício a tentativa é: um ID trocado por engano sobrescreveria outra.
    if (
      stored.entityId !== attempt.entityId ||
      stored.skill !== attempt.skill ||
      stored.exercise !== attempt.exercise
    ) {
      throw new Error(
        "A reescrita não pode levar a tentativa para outra bandeira, direção ou exercício"
      );
    }
    await db.skillStates.put(state);
    await db.attempts.put(attempt);
  });
}
