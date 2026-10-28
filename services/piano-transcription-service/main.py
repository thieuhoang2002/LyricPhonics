"""
ByteDance High-Resolution Piano Transcription Microservice (FastAPI)
Model: CRNN with Onsets, Offsets, Velocity, and Sustain Pedal
Native Sample Rate: 16,000 Hz
Paper: "High-resolution Piano Transcription with Pedals by Regressing Onsets and Offsets Times"
Author: ByteDance AI Lab
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

# Tối ưu hóa số luồng CPU cho PyTorch
cpu_count = os.cpu_count() or 4
torch.set_num_threads(cpu_count)

app = FastAPI(
    title="ByteDance Piano Transcription AI Service",
    description="Studio-grade Automatic Piano Transcription (Notes, Velocity 0-127, Sustain Pedal)",
    version="1.0.0",
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

# Lazy initialized model
transcriptor = None
device_name = "cuda" if torch.cuda.is_available() else "cpu"

def get_transcriptor():
    global transcriptor
    if transcriptor is None:
        from piano_transcription_inference import PianoTranscription
        print(f"[*] Đang tải ByteDance Piano Transcription Model trên {device_name.upper()}...")
        transcriptor = PianoTranscription(device=device_name)
        print("[OK] Đã tải ByteDance Model thành công!")
    return transcriptor

# DTO Models matching .NET Domain schemas
class PianoNoteEvent(BaseModel):
    id: str
    midi: int
    noteName: str
    startTime: float
    duration: float
    velocity: int = 80
    hand: int = 0      # 0: Right hand (Midi >= 60), 1: Left hand (Midi < 60)
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
        "device": device_name,
        "model": "ByteDance CRNN (High-Resolution Onset/Offset with Sustain Pedal)",
        "sample_rate": 16000,
        "cuda_available": torch.cuda.is_available()
    }


def extract_chords_and_sections(audio: np.ndarray, sr: int, total_duration: float, bpm: int):
    """Bóc tách vòng hợp âm và phân đoạn bài hát từ đặc trưng phổ âm tần (Chroma)"""
    chords: List[PianoChordSegment] = []
    
    if total_duration <= 0:
        return chords, []

    # Tính phổ Chroma Constant-Q
    try:
        chroma = librosa.feature.chroma_cqt(y=audio, sr=sr, hop_length=512)
        # Khung thời gian trung bình 2 giây
        hop_sec = 512 / sr
        frames_per_window = int(round(2.0 / hop_sec))
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
    except Exception as ex:
        print(f"[!] Warning: Lỗi trích xuất Chroma ({ex}), sử dụng fallback.")
        window_size = 2.5
        t = 0.0
        while t < total_duration:
            next_t = min(total_duration, t + window_size)
            chords.append(PianoChordSegment(chord="C", startTime=round(t, 2), endTime=round(next_t, 2)))
            t = next_t

    # Sections
    sections: List[PianoSectionSegment] = []
    if total_duration <= 25:
        sections.append(PianoSectionSegment(name="Main Theme", startTime=0.0, endTime=round(total_duration, 2)))
    else:
        intro_end = min(8.0, total_duration * 0.15)
        outro_start = max(intro_end + 10.0, total_duration * 0.82)
        sections.append(PianoSectionSegment(name="Intro", startTime=0.0, endTime=round(intro_end, 2)))
        sections.append(PianoSectionSegment(name="Chorus", startTime=round(intro_end, 2), endTime=round(outro_start, 2)))
        sections.append(PianoSectionSegment(name="Outro", startTime=round(outro_start, 2), endTime=round(total_duration, 2)))

    return chords, sections


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

    temp_out_midi = temp_in_path + ".mid"

    try:
        model = get_transcriptor()

        # QUAN TRỌNG: Model ByteDance yêu cầu đúng sample_rate = 16000 Hz!
        print(f"[*] Đang tải tệp '{file.filename}' tại 16000Hz (Native ByteDance SR)...")
        audio, sr = librosa.load(temp_in_path, sr=16000, mono=True)
        total_duration = round(len(audio) / 16000.0, 2)
        print(f"[*] Thời lượng thực tế: {total_duration}s ({len(audio)} samples)")

        # Tính toán Tempo / BPM chuẩn xác từ nhịp bài hát
        try:
            tempo, _ = librosa.beat.beat_track(y=audio, sr=16000)
            bpm = int(round(float(tempo))) if tempo > 0 else 85
        except Exception:
            bpm = 85

        # Phiên âm nốt nhạc bằng mô hình ByteDance High-Resolution CRNN
        print(f"[*] Đang phiên âm tệp '{file.filename}' bằng ByteDance CRNN...")
        transcribed_dict = model.transcribe(audio, temp_out_midi)
        print(f"[OK] Phiên âm hoàn tất! Xuất MIDI sang: {temp_out_midi}")

        # Trích xuất note events trực tiếp từ model (chuẩn mili-giây, không bị lỗi delta-tick)
        est_notes = transcribed_dict.get('est_note_events', [])
        notes: List[PianoNoteEvent] = []

        for n in est_notes:
            onset = float(n['onset_time'])
            offset = float(n['offset_time'])
            dur = max(0.08, offset - onset)
            pitch = int(n['midi_note'])
            vel = int(n.get('velocity', 80))

            notes.append(
                PianoNoteEvent(
                    id=f"n_{uuid.uuid4().hex[:8]}",
                    midi=pitch,
                    noteName=midi_to_note_name(pitch),
                    startTime=round(onset, 3),
                    duration=round(dur, 3),
                    velocity=vel,
                    hand=0 if pitch >= 60 else 1,
                    finger=0
                )
            )

        # Sắp xếp nốt theo thời gian
        notes.sort(key=lambda x: (x.startTime, x.midi))

        # Trích xuất hợp âm và phân đoạn
        chords, sections = extract_chords_and_sections(audio, 16000, total_duration, bpm)

        return PianoTranscriptionResult(
            title=title,
            artist="ByteDance AI Piano Cover",
            keySignature="C Major",
            bpm=bpm,
            duration=total_duration,
            sections=sections,
            chords=chords,
            notes=notes
        )

    except Exception as e:
        print(f"[!] Lỗi khi phiên âm: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi phiên âm Piano: {str(e)}")

    finally:
        # Cleanup temp files
        for path in [temp_in_path, temp_out_midi]:
            if os.path.exists(path):
                try:
                    os.remove(path)
                except Exception:
                    pass


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
