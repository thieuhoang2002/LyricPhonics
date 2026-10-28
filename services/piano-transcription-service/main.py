"""
ByteDance High-Resolution Piano Transcription Microservice (FastAPI)
Model: CRNN with Onsets, Offsets, Velocity, and Sustain Pedal
Paper: "High-resolution Piano Transcription with Pedals by Regressing Onsets and Offsets Times"
Author: ByteDance AI Lab
"""

import os
import tempfile
import uuid
from typing import List, Optional
import mido
import numpy as np
import torch
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

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
        "cuda_available": torch.cuda.is_available()
    }


def parse_midi_to_result(midi_path: str, default_title: str) -> PianoTranscriptionResult:
    mid = mido.MidiFile(midi_path)
    
    ticks_per_beat = mid.ticks_per_beat
    tempo = 500000  # Default 120 BPM (500000 microseconds per beat)
    bpm = 120

    # Search for tempo in tracks
    for track in mid.tracks:
        for msg in track:
            if msg.type == 'set_tempo':
                tempo = msg.tempo
                bpm = int(round(mido.tempo2bpm(tempo)))
                break

    # Parse notes from MIDI tracks
    notes: List[PianoNoteEvent] = []
    active_notes = {}  # midi -> (start_time, velocity)
    current_time_sec = 0.0

    for track in mid.tracks:
        track_time_sec = 0.0
        for msg in track:
            track_time_sec += mido.tick2second(msg.time, ticks_per_beat, tempo)
            
            if msg.type == 'note_on' and msg.velocity > 0:
                active_notes[msg.note] = (track_time_sec, msg.velocity)
            elif (msg.type == 'note_off') or (msg.type == 'note_on' and msg.velocity == 0):
                if msg.note in active_notes:
                    start_sec, vel = active_notes.pop(msg.note)
                    dur_sec = max(0.05, track_time_sec - start_sec)
                    
                    notes.append(
                        PianoNoteEvent(
                            id=f"n_{uuid.uuid4().hex[:8]}",
                            midi=msg.note,
                            noteName=midi_to_note_name(msg.note),
                            startTime=round(start_sec, 3),
                            duration=round(dur_sec, 3),
                            velocity=int(vel),
                            hand=0 if msg.note >= 60 else 1,
                            finger=0
                        )
                    )

    # Sort notes strictly by startTime
    notes.sort(key=lambda n: (n.startTime, n.midi))

    total_duration = notes[-1].startTime + notes[-1].duration if notes else 0.0

    # Estimate Chord Segments from Notes (group by 2.0s windows)
    chords: List[PianoChordSegment] = []
    if total_duration > 0:
        window_size = 2.0
        cur_t = 0.0
        while cur_t < total_duration:
            next_t = min(total_duration, cur_t + window_size)
            # Find notes in this window
            window_notes = [n.midi % 12 for n in notes if cur_t <= n.startTime < next_t]
            if window_notes:
                # Find most frequent pitch class
                counts = np.bincount(window_notes, minlength=12)
                root = int(np.argmax(counts))
                root_name = NOTE_NAMES[root]
                # Check for minor third (root + 3) vs major third (root + 4)
                has_minor = counts[(root + 3) % 12] > 0
                has_major = counts[(root + 4) % 12] > 0
                chord_name = f"{root_name}m" if has_minor and not has_major else root_name
            else:
                chord_name = "C"

            chords.append(
                PianoChordSegment(
                    chord=chord_name,
                    startTime=round(cur_t, 2),
                    endTime=round(next_t, 2)
                )
            )
            cur_t = next_t

    # Sections
    sections: List[PianoSectionSegment] = []
    if total_duration > 0:
        if total_duration <= 30:
            sections.append(PianoSectionSegment(name="Main Theme", startTime=0.0, endTime=round(total_duration, 2)))
        else:
            intro_end = min(15.0, total_duration * 0.2)
            outro_start = max(intro_end + 10.0, total_duration * 0.8)
            sections.append(PianoSectionSegment(name="Intro", startTime=0.0, endTime=round(intro_end, 2)))
            sections.append(PianoSectionSegment(name="Theme", startTime=round(intro_end, 2), endTime=round(outro_start, 2)))
            sections.append(PianoSectionSegment(name="Outro", startTime=round(outro_start, 2), endTime=round(total_duration, 2)))

    return PianoTranscriptionResult(
        title=default_title,
        artist="ByteDance AI Piano Cover",
        keySignature="C Major",
        bpm=bpm,
        duration=round(total_duration, 2),
        sections=sections,
        chords=chords,
        notes=notes
    )


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
        import librosa
        model = get_transcriptor()

        # Load audio at 32000Hz using standard librosa.load
        audio, _ = librosa.load(temp_in_path, sr=32000, mono=True)

        # Transcribe audio to MIDI file
        print(f"[*] Đang phiên âm tệp '{file.filename}' bằng ByteDance CRNN...")
        model.transcribe(audio, temp_out_midi)
        print(f"[OK] Phiên âm hoàn tất! Xuất MIDI sang: {temp_out_midi}")

        # Parse MIDI into PianoTranscriptionResult
        result = parse_midi_to_result(temp_out_midi, default_title=title)
        return result

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
