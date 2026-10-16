import type {SaveSummaryState} from '../../persistence/saveSummary';

export type SessionKind='none'|'guest'|'profile';
export type HeroAction='play_now'|'continue'|'new_campaign';
/** The part of the demo session the hero button depends on. null means no session has been started in this tab yet. */
export type HeroSession={kind:'guest'|'profile'}|null;

/**
 * Which action the primary hero button performs.
 *   a save that looks loadable (any session)   -> continue
 *   signed in, no loadable save                -> new_campaign
 *   no session or guest, no loadable save      -> play_now (starts as guest, no sign-in)
 * A save that is still loading, missing or unreadable does not offer Continue.
 */
export function resolveHeroAction(session:HeroSession,summary:SaveSummaryState):HeroAction {
  if(summary.status==='ready')return 'continue';
  return session?.kind==='profile'?'new_campaign':'play_now';
}

/** Flattens the demo session into the three kinds the landing UI distinguishes. */
export const sessionKindOf=(session:HeroSession):SessionKind=>session===null?'none':session.kind;
