import { describe, it, expect, afterEach } from 'vitest';
import { setAudioSessionType } from './audio-session';

describe('setAudioSessionType', () => {
  afterEach(() => {
    Reflect.deleteProperty(navigator, 'audioSession');
  });

  it('sets the category where WebKit exposes navigator.audioSession', () => {
    const session = { type: 'auto' };
    Object.defineProperty(navigator, 'audioSession', { value: session, configurable: true });
    setAudioSessionType('playback');
    expect(session.type).toBe('playback');
    setAudioSessionType('play-and-record');
    expect(session.type).toBe('play-and-record');
  });

  it('is a no-op where the API is missing', () => {
    expect('audioSession' in navigator).toBe(false);
    expect(() => setAudioSessionType('playback')).not.toThrow();
  });

  it('swallows a setter that rejects the category', () => {
    const session = {
      get type() {
        return 'auto';
      },
      set type(_: string) {
        throw new TypeError('unsupported');
      },
    };
    Object.defineProperty(navigator, 'audioSession', { value: session, configurable: true });
    expect(() => setAudioSessionType('playback')).not.toThrow();
  });
});
