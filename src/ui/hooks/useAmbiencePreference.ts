import {useCallback,useState} from 'react';
import {audio,type AudioService,type AudioState} from '../../audio/audioService';
import {useAudioSettings} from '../../audio/audioSettings';

export interface AmbiencePreference {
  /** The game's sound mute setting, shared with the in-game options. */
  muted:boolean;
  /** False once the audio backend reports it cannot play, so the dock never promises sound that cannot start. */
  audioAvailable:boolean;
  toggleMuted():void;
}

/**
 * Binds the landing dock's sound button to the existing audio settings (trp-audio-v1) and audio service. There is no
 * separate landing preference: muting here mutes the game, and the other way round. Pressing the button is a user
 * gesture, so it also lets the audio service unlock, which browsers require before any sound.
 * Presentation only: nothing here reads or writes game state.
 */
export function useAmbiencePreference(service:Pick<AudioService,'state'|'unlock'|'applySettings'>=audio):AmbiencePreference {
  const muted=useAudioSettings(settings=>settings.muted);
  const setMuted=useAudioSettings(settings=>settings.setMuted);
  const [state,setState]=useState<AudioState>(()=>service.state());
  const toggleMuted=useCallback(()=>{
    setMuted(!useAudioSettings.getState().muted);
    // The settings change is already stored; unlocking only decides whether sound can start.
    void service.unlock().catch(()=>undefined).then(()=>{service.applySettings();setState(service.state());});
  },[service,setMuted]);
  return {muted,audioAvailable:state!=='unavailable',toggleMuted};
}
