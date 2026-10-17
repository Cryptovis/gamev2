import { useEffect, useState } from 'react';
import {
  connectProject, createTransferCode, deleteCloudCopy, disconnectProject, joinWithTransferCode, pullCampaign, pushCampaign, refreshCloud, renameProfile,
  resolveCampaign, setAutoSync, setCloudPassphrase, syncAllNow, turnOffCloudSaves, turnOnCloudSaves, useCloudView, type CloudPhase, type CloudView,
} from '../../cloud/cloudControl';
import { readCloudConfig } from '../../cloud/cloudConfig';
import type { CampaignRow, CampaignSyncStatus } from '../../cloud/sync';
import { formatLive, LocaleText, translateLive } from '../../i18n/localeText';
import { useGameStore } from '../../store/gameStore';

const PHASE: Record<CloudPhase, string> = {
  unconfigured: 'Cloud saves are not set up',
  'no-key': 'Cloud saves are off',
  idle: 'Ready to sync',
  syncing: 'Syncing…',
  synced: 'Everything is in step',
  conflict: 'A campaign changed on two devices',
  error: 'The last sync failed',
  offline: 'Offline',
  locked: 'Locked: passphrase needed',
};
const PHASE_KIND: Record<CloudPhase, 'good' | 'warn' | 'busy' | 'plain'> = { unconfigured: 'plain', 'no-key': 'plain', idle: 'plain', syncing: 'busy', synced: 'good', conflict: 'warn', error: 'warn', offline: 'warn', locked: 'warn' };

const STATUS: Record<CampaignSyncStatus, string> = {
  'local-only': 'Not uploaded yet',
  'cloud-only': 'Only in the cloud',
  synced: 'In step',
  'local-ahead': 'Ahead of the cloud',
  'cloud-ahead': 'Behind the cloud',
  conflict: 'Changed on both sides',
};
const STATUS_KIND: Record<CampaignSyncStatus, 'good' | 'warn' | 'plain'> = { 'local-only': 'plain', 'cloud-only': 'plain', synced: 'good', 'local-ahead': 'plain', 'cloud-ahead': 'plain', conflict: 'warn' };

const ERRORS: Record<NonNullable<CloudView['error']>, string> = {
  conflict: 'The cloud copy changed. Choose which version to keep.',
  offline: 'No connection. Your saves stay on this device and sync when you are back online.',
  unavailable: 'The cloud did not respond. Try again in a moment.',
  denied: 'The cloud refused the request. Check the project key and the sync code.',
  setup: 'The cloud project has no save table yet. Apply the migration from the supabase folder.',
  locked: 'This cloud save is encrypted. Enter the passphrase to open it.',
  'wrong-passphrase': 'That passphrase does not open this save.',
  corrupt: 'The cloud copy is damaged and was not loaded. Your save on this device is unchanged.',
  'newer-game': 'The cloud copy was saved by a newer version of the game.',
  incompatible: 'This version of the game cannot load the cloud copy.',
  nothing: 'There is nothing to sync for this campaign.',
  'setup-config': 'Enter a project address that starts with https:// and a project key.',
};

const JOIN_ERRORS = {
  format: 'That is not a transfer code.',
  checksum: 'The code has a typing mistake. Check it and try again.',
  locked: 'This code is protected. Enter the code passphrase.',
  decrypt: 'That passphrase does not open this code.',
  key: 'The code does not hold a valid sync key.',
} as const;

function Badge({ kind }: { kind: 'good' | 'warn' | 'busy' | 'plain' }) { return <span className="sys-badge" data-kind={kind} aria-hidden="true"/>; }

function CampaignItem({ row, busy }: { row: CampaignRow; busy: string | null }) {
  const [resolving, setResolving] = useState(false), [removing, setRemoving] = useState(false);
  const summary = row.local?.summary ?? row.remote!.summary;
  const disabled = busy !== null;
  const id = row.campaignId;
  return <li className="cloud-campaign" data-testid={`cloud-row-${id}`} data-status={row.status}>
    <div className="cloud-campaign-head">
      <strong>{formatLive('{0} · Day {1}', [translateLive(summary.countryName), String(Math.max(row.local?.summary.day ?? 0, row.remote?.day ?? 0))])}</strong>
      <span className="sys-chip" data-kind={STATUS_KIND[row.status]}><Badge kind={STATUS_KIND[row.status]}/><LocaleText value={STATUS[row.status]}/></span>
    </div>
    <small>
      {row.local ? formatLive('This device: Day {0}', [String(row.local.summary.day)]) : translateLive('Not on this device')}
      {' · '}
      {row.remote ? formatLive('Cloud: Day {0}, revision {1}', [String(row.remote.day), String(row.remote.revision)]) : translateLive('Not in the cloud')}
    </small>
    <div className="cloud-campaign-actions">
      {(row.status === 'local-only' || row.status === 'local-ahead') && <button type="button" disabled={disabled} data-testid={`cloud-push-${id}`} onClick={() => void pushCampaign(id)}><LocaleText value="Upload"/></button>}
      {(row.status === 'cloud-only' || row.status === 'cloud-ahead') && <button type="button" disabled={disabled} data-testid={`cloud-pull-${id}`} onClick={() => void pullCampaign(id)}><LocaleText value="Download"/></button>}
      {row.status === 'conflict' && <button type="button" aria-expanded={resolving} disabled={disabled} data-testid={`cloud-resolve-${id}`} onClick={() => setResolving(v => !v)}><LocaleText value="Choose a version"/></button>}
      {row.remote && !removing && <button type="button" className="quiet" disabled={disabled} data-testid={`cloud-remove-${id}`} onClick={() => setRemoving(true)}><LocaleText value="Remove cloud copy"/></button>}
      {row.remote && removing && <>
        <button type="button" className="danger" disabled={disabled} data-testid={`cloud-remove-confirm-${id}`} onClick={() => { setRemoving(false); void deleteCloudCopy(id); }}><LocaleText value="Remove it from the cloud"/></button>
        <button type="button" className="quiet" onClick={() => setRemoving(false)}><LocaleText value="Keep it"/></button>
      </>}
    </div>
    {resolving && row.status === 'conflict' && <div className="cloud-resolve" role="group" aria-label={translateLive('Choose a version')}>
      {([['local', 'Keep this device', 'Replace the cloud copy with the save on this device.'], ['cloud', 'Keep the cloud copy', 'Replace the save on this device with the cloud copy.'], ['both', 'Keep both', 'Keep the cloud copy here as a separate campaign, and upload the save on this device.']] as const).map(([choice, label, text]) =>
        <button type="button" key={choice} disabled={disabled} data-testid={`cloud-resolve-${choice}-${id}`} onClick={() => { setResolving(false); void resolveCampaign(id, choice); }}><strong><LocaleText value={label}/></strong><span><LocaleText value={text}/></span></button>)}
    </div>}
  </li>;
}

/** Options: cloud saves for this guest profile. Everything is off until the player turns it on; nothing leaves the device before then. */
export function CloudOptions() {
  const phase = useCloudView(s => s.phase), configured = useCloudView(s => s.configured), hasKey = useCloudView(s => s.hasKey);
  const rows = useCloudView(s => s.rows), busy = useCloudView(s => s.busy), error = useCloudView(s => s.error), last = useCloudView(s => s.last);
  const lastSyncAt = useCloudView(s => s.lastSyncAt), autoSync = useCloudView(s => s.autoSync), encrypted = useCloudView(s => s.encrypted);
  const label = useCloudView(s => s.label), deviceId = useCloudView(s => s.deviceId);
  const language = useGameStore(s => s.playerProfile.language);
  const loadLatest = useGameStore(s => s.loadLatest);

  const [url, setUrl] = useState(''), [key, setKey] = useState(''), [pass, setPass] = useState(''), [name, setName] = useState(label);
  const [codePass, setCodePass] = useState(''), [code, setCode] = useState(''), [joinCode, setJoinCode] = useState(''), [joinPass, setJoinPass] = useState('');
  const [joinError, setJoinError] = useState<keyof typeof JOIN_ERRORS | null>(null), [joined, setJoined] = useState(false), [copied, setCopied] = useState(false);

  useEffect(() => { if (configured && hasKey) void refreshCloud(); }, [configured, hasKey]);
  useEffect(() => setName(label), [label]);

  const host = (() => { try { return new URL(readCloudConfig()?.url ?? '').host; } catch { return ''; } })();
  const message = error ? translateLive(ERRORS[error]) : last && last.ok
    ? last.action === 'push' ? formatLive('Uploaded as revision {0}.', [String(last.revision ?? '')])
      : last.action === 'pull' ? formatLive('Downloaded revision {0}. Load the latest save to continue from it.', [String(last.revision ?? '')])
      : last.action === 'copy' ? translateLive('Saved the cloud copy here as a separate campaign.')
      : translateLive('Already in step.')
    : null;
  const pulled = !error && last?.ok === true && (last.action === 'pull' || last.action === 'copy');

  return <fieldset className="appearance-options system-options cloud-options" data-testid="cloud-options" aria-busy={busy !== null}>
    <legend><LocaleText value="Cloud saves"/></legend>
    <p className="sys-status" role="status" aria-live="polite" data-testid="cloud-status" data-phase={phase}>
      <Badge kind={PHASE_KIND[phase]}/><span><LocaleText value={PHASE[phase]}/></span>
      {lastSyncAt !== null && hasKey && <small>{formatLive('Last checked {0}', [new Date(lastSyncAt).toLocaleTimeString(language)])}</small>}
    </p>
    {message && <p className="sys-message" data-testid="cloud-message" data-kind={error ? 'error' : 'ok'}>{message}</p>}
    {pulled && <button type="button" data-testid="cloud-load-latest" onClick={() => void loadLatest()}><LocaleText value="Load the latest save"/></button>}

    <details className="cloud-project" open={!configured}>
      <summary><LocaleText value="Cloud project"/>{configured && host && <span className="sys-host"> · {host}</span>}</summary>
      <p><small><LocaleText value="Saves go to a Supabase project you control. Apply the migration in the supabase folder, then enter its address and public key."/></small></p>
      <form className="cloud-form" onSubmit={event => { event.preventDefault(); if (connectProject(url, key)) { setKey(''); } }}>
        <label><span><LocaleText value="Project address"/></span><input type="url" inputMode="url" autoComplete="off" spellCheck={false} placeholder="https://your-project.supabase.co" value={url} onChange={e => setUrl(e.target.value)} data-testid="cloud-url"/></label>
        <label><span><LocaleText value="Project key (anon)"/></span><input type="password" autoComplete="off" spellCheck={false} value={key} onChange={e => setKey(e.target.value)} data-testid="cloud-key"/></label>
        <div className="sys-row">
          <button type="submit" disabled={!url || !key} data-testid="cloud-connect"><LocaleText value="Connect project"/></button>
          {configured && <button type="button" className="quiet" onClick={() => disconnectProject()} data-testid="cloud-disconnect"><LocaleText value="Disconnect project"/></button>}
        </div>
      </form>
    </details>

    {configured && !hasKey && <div className="cloud-intro">
      <p><LocaleText value="Cloud saves keep your campaigns on your devices and in your project. A guest profile on this device holds the key, so no account is needed."/></p>
      <button type="button" onClick={() => turnOnCloudSaves()} data-testid="cloud-enable"><LocaleText value="Turn on cloud saves"/></button>
    </div>}

    {configured && hasKey && <>
      <div className="sys-row">
        <button type="button" disabled={busy !== null} onClick={() => void syncAllNow()} data-testid="cloud-sync-now"><LocaleText value="Sync now"/></button>
        <button type="button" className="quiet" disabled={busy !== null} onClick={() => void refreshCloud()} data-testid="cloud-refresh"><LocaleText value="Check the cloud"/></button>
      </div>

      {rows.length === 0 && busy === null
        ? <p className="cloud-empty" data-testid="cloud-empty"><LocaleText value="No campaigns yet. Play a few days and they appear here."/></p>
        : <ul className="cloud-campaigns" data-testid="cloud-campaigns">{rows.map(row => <CampaignItem key={row.campaignId} row={row} busy={busy}/>)}</ul>}

      <label className="cloud-check"><input type="checkbox" checked={autoSync} onChange={e => setAutoSync(e.target.checked)} data-testid="cloud-auto"/><span><LocaleText value="Upload automatically after each autosave"/></span></label>

      <label className="cloud-field">
        <span><LocaleText value="Encryption passphrase"/></span>
        <input type="password" autoComplete="off" value={pass} onChange={e => { setPass(e.target.value); setCloudPassphrase(e.target.value); }} data-testid="cloud-passphrase"/>
        <small><LocaleText value={encrypted ? 'New uploads are encrypted on this device before they leave it. The passphrase is kept in memory only.' : 'Without a passphrase, saves are uploaded readable by your project. The passphrase is kept in memory only.'}/></small>
      </label>

      <label className="cloud-field">
        <span><LocaleText value="Profile name"/></span>
        <input type="text" maxLength={40} value={name} onChange={e => setName(e.target.value)} onBlur={() => renameProfile(name)} data-testid="cloud-label"/>
        <small>{formatLive('This device: {0}', [deviceId])}</small>
      </label>

      <section className="cloud-transfer" aria-label={translateLive('Use another device')}>
        <h4><LocaleText value="Use another device"/></h4>
        <p><small><LocaleText value="Anyone with this code can read and replace your cloud saves. Share it only with your own devices."/></small></p>
        <div className="sys-row">
          <input type="password" autoComplete="off" placeholder={translateLive('Code passphrase (optional)')} aria-label={translateLive('Code passphrase (optional)')} value={codePass} onChange={e => setCodePass(e.target.value)} data-testid="cloud-code-pass"/>
          <button type="button" onClick={async () => { setCopied(false); setCode(await createTransferCode(codePass || undefined)); }} data-testid="cloud-code-create"><LocaleText value="Create transfer code"/></button>
        </div>
        {code && <div className="cloud-code">
          <textarea readOnly rows={3} value={code} aria-label={translateLive('Transfer code')} data-testid="cloud-code-output" onFocus={e => e.currentTarget.select()}/>
          <button type="button" className="quiet" onClick={async () => { try { await navigator.clipboard.writeText(code); setCopied(true); } catch { /* the code is selectable */ } }} data-testid="cloud-code-copy"><LocaleText value={copied ? 'Copied.' : 'Copy code'}/></button>
        </div>}
        <label className="cloud-field"><span><LocaleText value="Join with a code"/></span>
          <textarea rows={2} spellCheck={false} value={joinCode} onChange={e => { setJoinCode(e.target.value); setJoinError(null); setJoined(false); }} data-testid="cloud-join-input"/></label>
        <div className="sys-row">
          <input type="password" autoComplete="off" placeholder={translateLive('Code passphrase (optional)')} aria-label={translateLive('Code passphrase (optional)')} value={joinPass} onChange={e => setJoinPass(e.target.value)} data-testid="cloud-join-pass"/>
          <button type="button" disabled={!joinCode.trim()} data-testid="cloud-join" onClick={async () => {
            const result = await joinWithTransferCode(joinCode, joinPass || undefined);
            if (result.ok) { setJoined(true); setJoinError(null); setJoinCode(''); setJoinPass(''); } else { setJoined(false); setJoinError(result.reason); }
          }}><LocaleText value="Join"/></button>
        </div>
        {joinError && <p className="sys-message" data-kind="error" data-testid="cloud-join-error">{translateLive(JOIN_ERRORS[joinError])}</p>}
        {joined && <p className="sys-message" data-kind="ok" data-testid="cloud-join-ok"><LocaleText value="This device now shares that profile."/></p>}
      </section>

      <button type="button" className="quiet" onClick={() => turnOffCloudSaves()} data-testid="cloud-leave"><LocaleText value="Turn off cloud saves on this device"/></button>
    </>}
  </fieldset>;
}
