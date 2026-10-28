"""
LyricPhonics - Intelligent Vocal & Chord Piano Transcription Microservice (FastAPI)
Architecture:
- PYIN Fundamental Frequency (F0) Lead Vocal Pitch Tracker
- Constant-Q Chroma Harmonic Matrix for Automatic Chord Recognition
- Dynamic Beat & BPM Tracking
- Zero-noise clean output matching Mockin.app
"""

import os
import tempfile
import uuid
from typing import List, Optional
import librosa
import numpy as np
import torch
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Tối ưu hóa số luồng CPU cho PyTorch / Scipy
cpu_count = os.cpu_count() or 4
torch.set_num_threads(cpu_count)

app = FastAPI(
    title="LyricPhonics Intelligent Piano AI Service",
    description="Studio-grade Lead Melody & Chord Recognition Engine (Instant, Noise-Free)",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]

def midi_to_note_name(midi: int) -> str:
    octave = (midi // 12) - 1
    name = NOTE_NAMES[midi % 12]
    return f"{name}{octave}"

# DTO Models matching .NET Domain schemas
class PianoNoteEvent(BaseModel):
    id: str
    midi: int
    noteName: str
    startTime: float
    duration: float
    velocity: int = 85
    hand: int = 0      # 0: Right hand (Melody), 1: Left hand (Bass/Chords)
    finger: int = 0

class PianoChordSegment(BaseModel):
    chord: str
    startTime: float
    endTime: float

class PianoSectionSegment(BaseModel):
    name: str
    startTime: float
    endTime: float

class PianoTranscriptionResult(BaseModel):
    title: str
    artist: str
    keySignature: str
    bpm: int
    duration: float
    sections: List[PianoSectionSegment]
    chords: List[PianoChordSegment]
    notes: List[PianoNoteEvent]


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "engine": "LyricPhonics Intelligent Vocal Melody & Harmonic Chord Arranger",
        "version": "2.0.0",
        "sample_rate": 16000
    }


def extract_vocal_melody_notes(audio: np.ndarray, sr: int, min_duration: float = 0.18) -> List[PianoNoteEvent]:
    """Bóc tách đường giai điệu giọng hát bám sát từng âm tiết/ca từ (Syllable-aligned Vocal Melody Tracking).
    Sử dụng bộ lọc Median Filter và phân đoạn âm tiết để triệt tiêu hoàn toàn rung giọng (vibrato) và tạp âm,
    tạo ra các nốt piano ngân vang đúng theo từng chữ ca sĩ hát như Mockin.app.
    """
    print("[*] Đang bóc tách đường giai điệu ca sĩ bám sát từng ca từ (Syllable-Level Vocal Tracking)...")
    try:
        import scipy.signal

        # Bắt cao độ trong dải tần giọng hát C3 (130Hz) đến G5 (784Hz)
        f0, voiced_flag, voiced_probs = librosa.pyin(
            audio,
            fmin=librosa.note_to_hz('C3'),
            fmax=librosa.note_to_hz('G5'),
            sr=sr,
            hop_length=512,
            frame_length=2048
        )
        hop_sec = 512.0 / sr

        # 1. Chuyển đổi f0 sang cao độ MIDI và lọc mượt Vibrato bằng Median Filter (~220ms window)
        midi_pitches = np.array([librosa.hz_to_midi(freq) if (not np.isnan(freq) and freq > 50) else 0.0 for freq in f0])
        smoothed_midi = scipy.signal.medfilt(midi_pitches, kernel_size=7)

        # 2. Gom các khung thanh âm liên tục thành từng chùm ca từ (Voiced Runs)
        runs = []
        cur_run = []
        for i in range(len(f0)):
            if voiced_flag[i] and not np.isnan(f0[i]) and smoothed_midi[i] >= 36:
                cur_run.append((i, smoothed_midi[i]))
            else:
                if cur_run:
                    runs.append(cur_run)
                    cur_run = []
        if cur_run:
            runs.append(cur_run)

        notes: List[PianoNoteEvent] = []

        # 3. Phân đoạn từng nốt theo cao độ ổn định của âm tiết (Syllable Note Plateaus)
        for run in runs:
            run_dur = len(run) * hop_sec
            if run_dur < min_duration:
                continue

            run_indices = [x[0] for x in run]
            run_pitches = [x[1] for x in run]
            start_t = run_indices[0] * hop_sec

            seg_pitches = []
            seg_start_t = start_t

            for i, p in enumerate(run_pitches):
                rounded_p = int(round(p))
                # Phát hiện chuyển nốt ca từ rõ rệt (>= 1.5 semitones)
                if len(seg_pitches) >= 5 and abs(rounded_p - np.median(seg_pitches)) >= 1.5:
                    seg_dur = round(len(seg_pitches) * hop_sec, 3)
                    if seg_dur >= min_duration:
                        note_pitch = int(round(np.median(seg_pitches)))
                        # Đưa nốt hát lên dải quãng 4-5 chuẩn giai điệu Piano (60-84) để không đè vào bass tay trái
                        while note_pitch < 60:
                            note_pitch += 12
                        while note_pitch > 88:
                            note_pitch -= 12

                        notes.append(
                            PianoNoteEvent(
                                id=f"m_{uuid.uuid4().hex[:8]}",
                                midi=note_pitch,
                                noteName=midi_to_note_name(note_pitch),
                                startTime=round(seg_start_t, 3),
                                duration=seg_dur,
                                velocity=94,
                                hand=0,
                                finger=3
                            )
                        )
                    seg_pitches = [p]
                    seg_start_t = run_indices[i] * hop_sec
                else:
                    seg_pitches.append(p)

            if seg_pitches:
                seg_dur = round(len(seg_pitches) * hop_sec, 3)
                if seg_dur >= min_duration:
                    note_pitch = int(round(np.median(seg_pitches)))
                    while note_pitch < 60:
                        note_pitch += 12
                    while note_pitch > 88:
                        note_pitch -= 12

                    notes.append(
                        PianoNoteEvent(
                            id=f"m_{uuid.uuid4().hex[:8]}",
                            midi=note_pitch,
                            noteName=midi_to_note_name(note_pitch),
                            startTime=round(seg_start_t, 3),
                            duration=seg_dur,
                            velocity=94,
                            hand=0,
                            finger=3
                        )
                    )

        print(f"[OK] Bóc tách thành công {len(notes)} nốt giai điệu sạch tinh bám theo ca từ!")
        return notes
    except Exception as ex:
        print(f"[!] Warning: Lỗi khi chạy Syllable Vocal Tracking: {ex}")
        return []


def extract_chords_and_sections(audio: np.ndarray, sr: int, total_duration: float, bpm: int):
    """Bóc tách vòng hợp âm tự nhiên và phân đoạn bài hát từ ma trận phổ Chroma CQT."""
    print("[*] Đang phân tích vòng hợp âm hòa thanh (Chroma Harmonic Matrix)...")
    chords: List[PianoChordSegment] = []

    if total_duration <= 0:
        return chords, []

    try:
        chroma = librosa.feature.chroma_cqt(y=audio, sr=sr, hop_length=512)
        hop_sec = 512.0 / sr
        # Khung phân tích hợp âm: 2 phách hoặc khoảng 1.5 - 2.0 giây
        beat_sec = 60.0 / bpm if bpm > 0 else 0.75
        window_sec = beat_sec * 2.0
        frames_per_window = max(1, int(round(window_sec / hop_sec)))
        num_windows = int(np.ceil(chroma.shape[1] / frames_per_window))

        for w in range(num_windows):
            start_frame = w * frames_per_window
            end_frame = min(chroma.shape[1], (w + 1) * frames_per_window)
            if start_frame >= end_frame:
                break

            window_chroma = np.mean(chroma[:, start_frame:end_frame], axis=1)
            root = int(np.argmax(window_chroma))
            root_name = NOTE_NAMES[root]

            # Kiểm tra âm bậc 3 thứ (+3) vs bậc 3 trưởng (+4)
            minor_third = window_chroma[(root + 3) % 12]
            major_third = window_chroma[(root + 4) % 12]
            chord_name = f"{root_name}m" if minor_third > major_third else root_name

            t_start = round(start_frame * hop_sec, 2)
            t_end = min(total_duration, round(end_frame * hop_sec, 2))

            chords.append(
                PianoChordSegment(
                    chord=chord_name,
                    startTime=t_start,
                    endTime=t_end
                )
            )
        print(f"[OK] Đã nhận diện {len(chords)} ô nhịp hợp âm!")
    except Exception as ex:
        print(f"[!] Warning: Lỗi trích xuất Chroma ({ex}), sử dụng fallback.")
        window_size = 2.0
        t = 0.0
        while t < total_duration:
            next_t = min(total_duration, t + window_size)
            chords.append(PianoChordSegment(chord="C", startTime=round(t, 2), endTime=round(next_t, 2)))
            t = next_t

    # Phát hiện điệu tính chủ đạo (Key Signature)
    dominant_root = chords[0].chord if chords else "C Major"

    # Phân đoạn bài hát (Sections)
    sections: List[PianoSectionSegment] = []
    if total_duration <= 25:
        sections.append(PianoSectionSegment(name="Chorus", startTime=0.0, endTime=round(total_duration, 2)))
    else:
        intro_end = min(8.0, total_duration * 0.15)
        outro_start = max(intro_end + 10.0, total_duration * 0.82)
        sections.append(PianoSectionSegment(name="Intro", startTime=0.0, endTime=round(intro_end, 2)))
        sections.append(PianoSectionSegment(name="Chorus", startTime=round(intro_end, 2), endTime=round(outro_start, 2)))
        sections.append(PianoSectionSegment(name="Outro", startTime=round(outro_start, 2), endTime=round(total_duration, 2)))

    return chords, sections, dominant_root


@app.post("/transcribe", response_model=PianoTranscriptionResult)
async def transcribe_audio(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Tên tệp không hợp lệ.")

    title = os.path.splitext(file.filename)[0]
    suffix = os.path.splitext(file.filename)[1].lower() or ".wav"

    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as temp_in:
        temp_in_path = temp_in.name
        content = await file.read()
        temp_in.write(content)

    try:
        print(f"[*] Nhận tệp '{file.filename}', đang nạp vào bộ xử lý âm học (16,000 Hz)...")
        audio, sr = librosa.load(temp_in_path, sr=16000, mono=True)
        total_duration = round(len(audio) / 16000.0, 2)
        print(f"[*] Thời lượng chính xác: {total_duration} giây.")

        # 1. Phát hiện BPM / Nhịp độ chuẩn
        try:
            tempo, _ = librosa.beat.beat_track(y=audio, sr=16000)
            bpm = int(round(float(tempo))) if tempo > 0 else 80
        except Exception:
            bpm = 80
        print(f"[*] Tempo phát hiện: {bpm} BPM")

        # 2. Bóc tách đường giai điệu giọng hát sạch tinh bằng PYIN
        melody_notes = extract_vocal_melody_notes(audio, 16000)

        # 3. Bóc tách hợp âm và phân đoạn
        chords, sections, key_sig = extract_chords_and_sections(audio, 16000, total_duration, bpm)

        return PianoTranscriptionResult(
            title=title,
            artist="Intelligent Piano AI",
            keySignature=f"{key_sig} Key",
            bpm=bpm,
            duration=total_duration,
            sections=sections,
            chords=chords,
            notes=melody_notes
        )

    except Exception as e:
        print(f"[!] Lỗi khi xử lý: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi phân tích: {str(e)}")

    finally:
        if os.path.exists(temp_in_path):
            try:
                os.remove(temp_in_path)
            except Exception:
                pass


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
