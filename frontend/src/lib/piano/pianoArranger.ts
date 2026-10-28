/**
 * src/lib/piano/pianoArranger.ts
 *
 * Virtual Piano Arranger Engine (Nhạc Công Hòa Âm Ảo Đa Điệu).
 * Generates virtuoso 2-hand piano arrangements with authentic accompaniment styles:
 * - Ballad (Arpeggio 1-5-8-10 lush waves)
 * - Canon (Flowing classical counterpoint)
 * - Pop (Modern syncopated groove)
 * - 12/8 Slow Rock (Romantic triplets)
 * - Waltz (3/4 dance Bum-Chát-Chát)
 * - Bolero (Soulful acoustic strumming)
 *
 * Supports Hands mode:
 * - 'both': Right Hand Melody + Left Hand Accompaniment
 * - 'backing': Accompaniment only (for singing along or solo instrumental)
 * - 'tune': Melody only
 */

import type {
  PianoNoteEvent,
  PianoChordSegment,
  PianoSectionSegment,
  PianoTranscriptionResult,
  PianoArrangerStyle,
  PianoArrangerHands,
} from '@/types/piano';

interface ChordToneInfo {
  rootPitch: number;       // Base MIDI (e.g. 36 for C2)
  thirdPitch: number;      // Major (root + 4) or Minor (root + 3)
  fifthPitch: number;      // root + 7
  octavePitch: number;     // root + 12
  ninthPitch: number;      // root + 14 (add9 color)
  tenthPitch: number;      // root + 16 (Maj) or 15 (Min)
  seventhPitch?: number;   // root + 10 (m7) or 11 (maj7)
  isMinor: boolean;
}

const ROOT_MIDI_MAP: Record<string, number> = {
  C: 36, 'C#': 37, DB: 37,
  D: 38, 'D#': 39, EB: 39,
  E: 40,
  F: 41, 'F#': 42, GB: 42,
  G: 43, 'G#': 44, AB: 44,
  A: 45, 'A#': 46, BB: 46,
  B: 47,
};

const NOTE_NAME_TABLE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function getNoteName(pitch: number): string {
  const octave = Math.floor(pitch / 12) - 1;
  const name = NOTE_NAME_TABLE[pitch % 12];
  return `${name}${octave}`;
}

export function parseChordTones(chordStr: string): ChordToneInfo {
  const clean = (chordStr || 'C').trim();
  const match = clean.match(/^([A-G][#b]?)(.*)$/i);
  const rootStr = match ? match[1].toUpperCase() : 'C';
  const suffix = match ? match[2].toLowerCase() : '';

  let rootPitch = ROOT_MIDI_MAP[rootStr] ?? 36;
  // Giữ nốt gốc trong quãng quãng 2 (36 đến 47)
  while (rootPitch < 36) rootPitch += 12;
  while (rootPitch > 47) rootPitch -= 12;

  const isMinor = suffix.includes('m') && !suffix.includes('maj');
  const isMajor7 = suffix.includes('maj7');
  const isDominant7 = suffix.includes('7') && !isMajor7;

  const thirdInterval = isMinor ? 3 : 4;
  const thirdPitch = rootPitch + thirdInterval;
  const fifthPitch = rootPitch + 7;
  const octavePitch = rootPitch + 12;
  const ninthPitch = rootPitch + 14;
  const tenthPitch = rootPitch + 12 + thirdInterval;

  let seventhPitch: number | undefined;
  if (isMajor7) seventhPitch = rootPitch + 11;
  else if (isDominant7 || isMinor) seventhPitch = rootPitch + 10;

  return {
    rootPitch,
    thirdPitch,
    fifthPitch,
    octavePitch,
    ninthPitch,
    tenthPitch,
    seventhPitch,
    isMinor,
  };
}

/**
 * Tạo bản hòa âm nghệ sĩ Piano từ danh sách hợp âm và giai điệu
 */
export function generatePianoArrangement(
  baseResult: PianoTranscriptionResult,
  style: PianoArrangerStyle = 'ballad',
  hands: PianoArrangerHands = 'both'
): PianoTranscriptionResult {
  const bpm = Math.max(50, Math.min(200, baseResult.metadata.bpm || 80));
  const beatSec = 60 / bpm;
  const totalDuration = baseResult.metadata.duration && baseResult.metadata.duration > 0
    ? baseResult.metadata.duration
    : (baseResult.chords.length > 0 ? baseResult.chords[baseResult.chords.length - 1].endTime : 45);

  const notes: PianoNoteEvent[] = [];

  // Lọc lấy melody gốc nếu có (Right hand)
  const originalMelody = baseResult.notes.filter((n) => n.hand === 'right' || n.pitch >= 60);

  // 1. DUYỆT TỪNG ĐOẠN HỢP ÂM ĐỂ TẠO ACCOMPANIMENT (TAY TRÁI)
  if (hands === 'both' || hands === 'backing') {
    const chords = baseResult.chords.length > 0
      ? baseResult.chords
      : [{ chord: 'C', startTime: 0, endTime: totalDuration, root: 'C', quality: 'Major' }];

    for (let cIdx = 0; cIdx < chords.length; cIdx++) {
      const chordSeg = chords[cIdx];
      const startT = Math.max(0, chordSeg.startTime);
      const endT = Math.min(totalDuration, chordSeg.endTime > startT ? chordSeg.endTime : startT + beatSec * 4);
      const duration = endT - startT;
      const tones = parseChordTones(chordSeg.chord);

      switch (style) {
        case 'ballad':
          generateBalladPattern(notes, startT, duration, beatSec, tones);
          break;
        case 'canon':
          generateCanonPattern(notes, startT, duration, beatSec, tones);
          break;
        case 'pop':
          generatePopPattern(notes, startT, duration, beatSec, tones);
          break;
        case 'slow_12_8':
          generateSlow12_8Pattern(notes, startT, duration, beatSec, tones);
          break;
        case 'waltz':
          generateWaltzPattern(notes, startT, duration, beatSec, tones);
          break;
        case 'bolero':
          generateBoleroPattern(notes, startT, duration, beatSec, tones);
          break;
        default:
          generateBalladPattern(notes, startT, duration, beatSec, tones);
          break;
      }
    }
  }

  // 2. TẠO GIAI ĐIỆU MELODY (TAY PHẢI) - BÁM SÁT TỪNG CA TỪ & ÂM TIẾT
  if (hands === 'both' || hands === 'tune') {
    if (originalMelody.length > 0) {
      // Sắp xếp theo thứ tự thời gian xuất hiện
      const sortedMelody = [...originalMelody].sort((a, b) => a.startTime - b.startTime || b.pitch - a.pitch);
      let lastMelodyEnd = -1;
      let prevPitch = 64;
      let curFinger = 3;

      for (const m of sortedMelody) {
        if (m.startTime >= totalDuration) continue;

        let pitch = m.pitch;
        // Đưa cao độ vào quãng ngân vang đẹp nhất của Piano (C4 đến E6)
        while (pitch < 60) pitch += 12;
        while (pitch > 88) pitch -= 12;

        // Tránh tạp âm bị chồng chéo trong khoảng thời gian siêu ngắn (<60ms)
        if (m.startTime < lastMelodyEnd - 0.06) continue;

        // Tính thế tay ngón đàn tự nhiên cho Right Hand (1: Ngón cái đến 5: Ngón út)
        if (pitch > prevPitch) {
          curFinger = Math.min(5, curFinger + 1);
        } else if (pitch < prevPitch) {
          curFinger = Math.max(1, curFinger - 1);
        }
        prevPitch = pitch;

        // Căn chỉnh legato mượt mà: thu ngắn nốt trước nếu kéo dài chạm nốt sau
        const lastRightNoteIdx = notes.findLastIndex((n) => n.hand === 'right');
        if (lastRightNoteIdx !== -1) {
          const prevRightNote = notes[lastRightNoteIdx];
          if (prevRightNote.startTime + prevRightNote.duration > m.startTime) {
            const adjustedDur = Math.max(0.12, m.startTime - prevRightNote.startTime - 0.02);
            notes[lastRightNoteIdx] = {
              ...prevRightNote,
              duration: Math.round(adjustedDur * 1000) / 1000,
            };
          }
        }

        const dur = Math.max(0.15, Math.min(2.5, m.duration));
        notes.push({
          ...m,
          hand: 'right',
          pitch,
          noteName: getNoteName(pitch),
          startTime: Math.round(m.startTime * 1000) / 1000,
          duration: Math.round(dur * 1000) / 1000,
          velocity: Math.max(82, Math.min(112, m.velocity || 94)),
          finger: curFinger,
        });
        lastMelodyEnd = m.startTime + dur;
      }
    } else {
      // Nếu chưa có melody, tự động dệt đường giai điệu cantabile bay bổng theo vòng hợp âm
      generateCantabileMelody(notes, baseResult.chords, totalDuration, beatSec);
    }
  }

  // Sắp xếp lại toàn bộ nốt theo thứ tự thời gian
  notes.sort((a, b) => a.startTime - b.startTime || a.pitch - b.pitch);

  return {
    ...baseResult,
    metadata: {
      ...baseResult.metadata,
      duration: totalDuration,
    },
    notes,
  };
}

// -------------------------------------------------------------
// STYLE PATTERN IMPLEMENTATIONS
// -------------------------------------------------------------

function addNote(
  list: PianoNoteEvent[],
  pitch: number,
  startTime: number,
  duration: number,
  velocity: number,
  hand: 'left' | 'right' = 'left',
  finger?: number
) {
  list.push({
    pitch,
    noteName: getNoteName(pitch),
    startTime: Math.round(startTime * 1000) / 1000,
    duration: Math.max(0.08, Math.round(duration * 1000) / 1000),
    velocity: Math.round(Math.max(30, Math.min(127, velocity))),
    hand,
    finger,
  });
}

/**
 * BALLAD: Chuẩn Mockin.app (Phách 1: Bass ngón 5, Phách 2: Chùm hợp âm 4 ngón 4-3-2-1, Phách 3: Bass lướt, Phách 4: Chùm hợp âm)
 */
function generateBalladPattern(
  notes: PianoNoteEvent[],
  startT: number,
  dur: number,
  beatSec: number,
  t: ChordToneInfo
) {
  let cur = startT;
  const end = startT + dur;

  while (cur < end - 0.05) {
    // Phách 1: Bass gốc trầm ngân sâu (Ngón 5 - Út)
    addNote(notes, t.rootPitch, cur, beatSec * 1.5, 92, 'left', 5);

    // Phách 2: Chùm hợp âm Ballad 4 ngón (Ngón 4, 3, 2, 1) - Chuẩn Mockin.app
    if (cur + beatSec < end) {
      addNote(notes, t.fifthPitch, cur + beatSec, beatSec * 0.85, 74, 'left', 4);
      addNote(notes, t.seventhPitch ?? t.octavePitch, cur + beatSec, beatSec * 0.85, 76, 'left', 3);
      addNote(notes, t.ninthPitch, cur + beatSec, beatSec * 0.85, 78, 'left', 2);
      addNote(notes, t.tenthPitch, cur + beatSec, beatSec * 0.85, 82, 'left', 1);
    }

    // Phách 3: Nốt đệm trầm lướt (Bậc 5 hoặc Bass phụ)
    if (cur + beatSec * 2 < end) {
      addNote(notes, t.fifthPitch - 12, cur + beatSec * 2, beatSec * 0.9, 85, 'left', 5);
    }

    // Phách 4: Chùm hợp âm ngân nhẹ
    if (cur + beatSec * 3 < end) {
      addNote(notes, t.fifthPitch, cur + beatSec * 3, beatSec * 0.75, 68, 'left', 4);
      addNote(notes, t.octavePitch, cur + beatSec * 3, beatSec * 0.75, 70, 'left', 2);
      addNote(notes, t.tenthPitch, cur + beatSec * 3, beatSec * 0.75, 74, 'left', 1);
    }

    cur += beatSec * 4;
  }
}

/**
 * CANON: Phong cách đệm Canon Mockin.app (Phách 1: Bass trầm ngón 5, Phách 2 & 4: Chùm hợp âm 4 ngón chuẩn xác)
 */
function generateCanonPattern(
  notes: PianoNoteEvent[],
  startT: number,
  dur: number,
  beatSec: number,
  t: ChordToneInfo
) {
  let cur = startT;
  const end = startT + dur;

  while (cur < end - 0.05) {
    // Phách 1: Bass gốc trầm ngân sâu (Ngón 5 - Út)
    addNote(notes, t.rootPitch, cur, beatSec * 1.5, 92, 'left', 5);

    // Phách 2: Chùm hợp âm 4 ngón (Ngón 4, 3, 2, 1) - Chuẩn Mockin.app
    if (cur + beatSec < end) {
      addNote(notes, t.fifthPitch, cur + beatSec, beatSec * 0.85, 76, 'left', 4);
      addNote(notes, t.seventhPitch ?? t.octavePitch, cur + beatSec, beatSec * 0.85, 78, 'left', 3);
      addNote(notes, t.ninthPitch, cur + beatSec, beatSec * 0.85, 80, 'left', 2);
      addNote(notes, t.tenthPitch, cur + beatSec, beatSec * 0.85, 84, 'left', 1);
    }

    // Phách 3: Bass lướt
    if (cur + beatSec * 2 < end) {
      addNote(notes, t.rootPitch + 12, cur + beatSec * 2, beatSec * 0.9, 86, 'left', 5);
    }

    // Phách 4: Chùm hợp âm 4 ngón
    if (cur + beatSec * 3 < end) {
      addNote(notes, t.fifthPitch, cur + beatSec * 3, beatSec * 0.85, 74, 'left', 4);
      addNote(notes, t.seventhPitch ?? t.octavePitch, cur + beatSec * 3, beatSec * 0.85, 76, 'left', 3);
      addNote(notes, t.ninthPitch, cur + beatSec * 3, beatSec * 0.85, 78, 'left', 2);
      addNote(notes, t.tenthPitch, cur + beatSec * 3, beatSec * 0.85, 82, 'left', 1);
    }

    cur += beatSec * 4;
  }
}

/**
 * POP: Dập hợp âm hiện đại theo phách đảo (Syncopation)
 */
function generatePopPattern(
  notes: PianoNoteEvent[],
  startT: number,
  dur: number,
  beatSec: number,
  t: ChordToneInfo
) {
  let cur = startT;
  const end = startT + dur;

  while (cur < end - 0.05) {
    // Phách 1: Bass trầm dứt khoát
    addNote(notes, t.rootPitch, cur, beatSec * 0.8, 95, 'left', 5);
    addNote(notes, t.rootPitch + 12, cur, beatSec * 0.8, 85, 'left', 1);

    // Phách 1.5: Dập chùm hợp âm giữa
    if (cur + beatSec * 0.5 < end) {
      addNote(notes, t.fifthPitch, cur + beatSec * 0.5, beatSec * 0.4, 76, 'left', 3);
      addNote(notes, t.thirdPitch + 12, cur + beatSec * 0.5, beatSec * 0.4, 78, 'left', 1);
    }

    // Phách 2.5: Đảo phách Pop (Push)
    if (cur + beatSec * 1.5 < end) {
      addNote(notes, t.fifthPitch, cur + beatSec * 1.5, beatSec * 0.45, 82, 'left', 3);
      addNote(notes, t.tenthPitch, cur + beatSec * 1.5, beatSec * 0.45, 84, 'left', 1);
    }

    cur += beatSec * 2;
  }
}

/**
 * SLOW 12/8: Tiết tấu tam âm du dương (Triplets 6/8 - 12/8)
 */
function generateSlow12_8Pattern(
  notes: PianoNoteEvent[],
  startT: number,
  dur: number,
  beatSec: number,
  t: ChordToneInfo
) {
  const tripletStep = beatSec / 3;
  let cur = startT;
  const end = startT + dur;

  const pattern = [
    { p: t.rootPitch, v: 90, d: beatSec, f: 5 },
    { p: t.fifthPitch, v: 66, d: tripletStep * 1.5, f: 3 },
    { p: t.octavePitch, v: 72, d: tripletStep * 1.5, f: 1 },
    { p: t.tenthPitch, v: 78, d: tripletStep * 1.5, f: 1 },
    { p: t.octavePitch, v: 68, d: tripletStep * 1.5, f: 2 },
    { p: t.fifthPitch, v: 64, d: tripletStep * 1.5, f: 3 },
  ];

  let pIdx = 0;
  while (cur < end - 0.05) {
    const item = pattern[pIdx % pattern.length];
    addNote(notes, item.p, cur, Math.min(item.d, end - cur), item.v, 'left', item.f);
    cur += tripletStep;
    pIdx++;
  }
}

/**
 * WALTZ: Nhịp 3/4 (Bùm - Chát - Chát)
 */
function generateWaltzPattern(
  notes: PianoNoteEvent[],
  startT: number,
  dur: number,
  beatSec: number,
  t: ChordToneInfo
) {
  let cur = startT;
  const end = startT + dur;

  while (cur < end - 0.05) {
    // Phách 1: "Bùm" - Nốt Bass trầm nặng
    addNote(notes, t.rootPitch, cur, beatSec * 0.9, 95, 'left', 5);

    // Phách 2: "Chát" - Hợp âm dập nhẹ
    if (cur + beatSec < end) {
      addNote(notes, t.fifthPitch, cur + beatSec, beatSec * 0.6, 72, 'left', 3);
      addNote(notes, t.thirdPitch + 12, cur + beatSec, beatSec * 0.6, 74, 'left', 1);
    }

    // Phách 3: "Chát" - Hợp âm nảy
    if (cur + beatSec * 2 < end) {
      addNote(notes, t.fifthPitch, cur + beatSec * 2, beatSec * 0.5, 68, 'left', 3);
      addNote(notes, t.thirdPitch + 12, cur + beatSec * 2, beatSec * 0.5, 70, 'left', 1);
    }

    cur += beatSec * 3;
  }
}

/**
 * BOLERO: Rải ngón trữ tình Việt Nam
 */
function generateBoleroPattern(
  notes: PianoNoteEvent[],
  startT: number,
  dur: number,
  beatSec: number,
  t: ChordToneInfo
) {
  let cur = startT;
  const end = startT + dur;

  while (cur < end - 0.05) {
    // 1: Bass
    addNote(notes, t.rootPitch, cur, beatSec * 0.7, 92, 'left', 5);

    // 1.5: Chùm hợp âm lướt
    if (cur + beatSec * 0.5 < end) {
      addNote(notes, t.fifthPitch, cur + beatSec * 0.5, beatSec * 0.35, 70, 'left', 3);
      addNote(notes, t.octavePitch, cur + beatSec * 0.5, beatSec * 0.35, 72, 'left', 1);
    }

    // 2: Bass phụ (Bậc 5)
    if (cur + beatSec < end) {
      addNote(notes, t.fifthPitch - 12, cur + beatSec, beatSec * 0.7, 85, 'left', 4);
    }

    // 2.5: Chùm nốt nảy
    if (cur + beatSec * 1.5 < end) {
      addNote(notes, t.tenthPitch, cur + beatSec * 1.5, beatSec * 0.4, 75, 'left', 1);
    }

    cur += beatSec * 2;
  }
}

/**
 * Giai điệu Cantabile du dương tự động nếu bài hát chưa có melody
 */
function generateCantabileMelody(
  notes: PianoNoteEvent[],
  chords: readonly PianoChordSegment[],
  totalDuration: number,
  beatSec: number
) {
  if (chords.length === 0) return;

  for (const c of chords) {
    const startT = c.startTime;
    const dur = c.endTime - c.startTime;
    const tones = parseChordTones(c.chord);
    const midLead = tones.rootPitch + 24; // Quãng 5 (C5 ~ 72)

    // Tạo các nốt hát chính với thế ngón tự nhiên
    const melodySeq = [
      { p: midLead + (tones.isMinor ? 3 : 4), offset: 0, d: beatSec * 1.2, v: 88, f: 1 },
      { p: midLead + 7, offset: beatSec * 1.0, d: beatSec * 0.8, v: 82, f: 2 },
      { p: midLead + 12, offset: beatSec * 2.0, d: beatSec * 1.5, v: 92, f: 4 },
      { p: midLead + (tones.isMinor ? 10 : 11), offset: beatSec * 3.2, d: beatSec * 0.7, v: 78, f: 3 },
    ];

    for (const m of melodySeq) {
      if (startT + m.offset < totalDuration) {
        addNote(notes, m.p, startT + m.offset, m.d, m.v, 'right', m.f);
      }
    }
  }
}
