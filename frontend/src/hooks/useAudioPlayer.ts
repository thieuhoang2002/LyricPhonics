'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

export type PlaybackRate = 0.5 | 0.75 | 1.0 | 1.25 | 1.5 | 2.0;

export interface AudioPlayerState {
  readonly isPlaying: boolean;
  readonly currentTime: number;
  readonly duration: number;
  readonly playbackRate: PlaybackRate;
  readonly volume: number;
  readonly isMuted: boolean;
  readonly isLooping: boolean;
  readonly isLoaded: boolean;
  readonly error: string | null;
}

export interface AudioPlayerControls {
  readonly play: () => Promise<void>;
  readonly pause: () => void;
  readonly togglePlay: () => void;
  readonly seek: (seconds: number) => void;
  readonly setPlaybackRate: (rate: PlaybackRate) => void;
  readonly setVolume: (volume: number) => void;
  readonly toggleMute: () => void;
  readonly toggleLoop: () => void;
  readonly loadAudio: (urlOrBlob: string | Blob) => void;
  readonly reset: () => void;
}

export type UseAudioPlayerReturn = AudioPlayerState & AudioPlayerControls;

/**
 * Custom React hook for controlling native HTML5 Audio playback.
 * Integrates requestAnimationFrame for smooth 60fps time interpolation.
 * Strictly adheres to AGENTS.md (Strict TypeScript, zero 'any').
 */
export function useAudioPlayer(initialUrl?: string | null): UseAudioPlayerReturn {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [playbackRate, setPlaybackRateState] = useState<PlaybackRate>(1.0);
  const [volume, setVolumeState] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isLooping, setIsLooping] = useState<boolean>(false);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // References to keep setupAudio pure and prevent reloading audio when settings change
  const playbackRateRef = useRef<PlaybackRate>(1.0);
  const volumeRef = useRef<number>(1.0);
  const isMutedRef = useRef<boolean>(false);
  const isLoopingRef = useRef<boolean>(false);

  // Sync animation frame loop for 60fps smooth playback time tracking
  const startRafLoop = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    const updateTime = (): void => {
      const audio = audioRef.current;
      if (audio && !audio.paused && !audio.ended) {
        setCurrentTime(audio.currentTime);
        animationFrameRef.current = requestAnimationFrame(updateTime);
      }
    };

    animationFrameRef.current = requestAnimationFrame(updateTime);
  }, []);

  const stopRafLoop = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  // Initialize or update audio instance
  const setupAudio = useCallback((url: string) => {
    stopRafLoop();

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }

    const audio = new Audio(url);
    audio.preload = 'auto';
    audio.playbackRate = playbackRateRef.current;
    audio.loop = isLoopingRef.current;
    audio.volume = isMutedRef.current ? 0 : volumeRef.current;
    audioRef.current = audio;

    setIsLoaded(false);
    setError(null);
    setCurrentTime(0);

    const onLoadedMetadata = (): void => {
      setDuration(audio.duration || 0);
      setIsLoaded(true);
    };

    const onPlay = (): void => {
      setIsPlaying(true);
      startRafLoop();
    };

    const onPause = (): void => {
      setIsPlaying(false);
      stopRafLoop();
      if (audioRef.current) {
        setCurrentTime(audioRef.current.currentTime);
      }
    };

    const onEnded = (): void => {
      if (!isLoopingRef.current) {
        setIsPlaying(false);
        stopRafLoop();
        if (audioRef.current) {
          setCurrentTime(audioRef.current.duration || 0);
        }
      }
    };

    const onError = (): void => {
      setIsPlaying(false);
      stopRafLoop();
      setError('Lỗi phát âm thanh. Vui lòng kiểm tra định dạng hoặc thử lại.');
    };

    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
    };
  }, [startRafLoop, stopRafLoop]);

  // Load from initialUrl if provided
  useEffect(() => {
    if (initialUrl && initialUrl.trim() !== '') {
      const cleanup = setupAudio(initialUrl);
      return () => {
        cleanup();
        stopRafLoop();
      };
    }

    return () => {
      stopRafLoop();
    };
  }, [initialUrl, setupAudio, stopRafLoop]);

  const loadAudio = useCallback((urlOrBlob: string | Blob): void => {
    const url = typeof urlOrBlob === 'string' ? urlOrBlob : URL.createObjectURL(urlOrBlob);
    setupAudio(url);
  }, [setupAudio]);

  const play = useCallback(async (): Promise<void> => {
    const audio = audioRef.current;
    if (!audio) return;
    try {
      setError(null);
      await audio.play();
    } catch (err) {
      console.error('Audio play error:', err);
      setError('Không thể tự động phát. Vui lòng nhấn nút phát để nghe nhạc.');
      setIsPlaying(false);
      stopRafLoop();
    }
  }, [stopRafLoop]);

  const pause = useCallback((): void => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
    }
  }, []);

  const togglePlay = useCallback((): void => {
    if (isPlaying) {
      pause();
    } else {
      void play();
    }
  }, [isPlaying, play, pause]);

  const seek = useCallback((seconds: number): void => {
    const audio = audioRef.current;
    if (!audio) return;

    const clampedTime = Math.max(0, Math.min(seconds, audio.duration || seconds));
    audio.currentTime = clampedTime;
    setCurrentTime(clampedTime);
  }, []);

  const setPlaybackRate = useCallback((rate: PlaybackRate): void => {
    playbackRateRef.current = rate;
    setPlaybackRateState(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  }, []);

  const setVolume = useCallback((vol: number): void => {
    const clampedVol = Math.max(0, Math.min(1, vol));
    volumeRef.current = clampedVol;
    setVolumeState(clampedVol);
    if (audioRef.current) {
      audioRef.current.volume = isMutedRef.current ? 0 : clampedVol;
    }
  }, []);

  const toggleMute = useCallback((): void => {
    setIsMuted((prev) => {
      const nextMuted = !prev;
      isMutedRef.current = nextMuted;
      if (audioRef.current) {
        audioRef.current.volume = nextMuted ? 0 : volumeRef.current;
      }
      return nextMuted;
    });
  }, []);

  const toggleLoop = useCallback((): void => {
    setIsLooping((prev) => {
      const nextLooping = !prev;
      isLoopingRef.current = nextLooping;
      if (audioRef.current) {
        audioRef.current.loop = nextLooping;
      }
      return nextLooping;
    });
  }, []);

  const reset = useCallback((): void => {
    stopRafLoop();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setIsLoaded(false);
    setError(null);
  }, [stopRafLoop]);

  return {
    isPlaying,
    currentTime,
    duration,
    playbackRate,
    volume,
    isMuted,
    isLooping,
    isLoaded,
    error,
    play,
    pause,
    togglePlay,
    seek,
    setPlaybackRate,
    setVolume,
    toggleMute,
    toggleLoop,
    loadAudio,
    reset,
  };
}
