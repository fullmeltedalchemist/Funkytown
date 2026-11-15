"""Render dialogue clips offline with FFmpeg built with libflite and libmp3lame."""
import json
from pathlib import Path
import subprocess
from tempfile import TemporaryDirectory

ROOT = Path(__file__).resolve().parents[1]
lines = json.loads((ROOT / "tools/voice-lines.json").read_text())
output = ROOT / "assets/voice"
output.mkdir(parents=True, exist_ok=True)
with TemporaryDirectory() as temp:
    work = Path(temp)
    for cue, line in lines.items():
        clips = []
        for index, segment in enumerate(line.get("segments", [line])):
            (work / "line.txt").write_text(segment["text"], encoding="utf-8")
            filename = f"take-{index}.wav"
            band = "highpass=f=260,lowpass=f=3500," if segment.get("radio") else "highpass=f=90,"
            subprocess.run([
                "ffmpeg", "-nostdin", "-hide_banner", "-loglevel", "error", "-y",
                "-f", "lavfi", "-i", f"flite=voice={segment['voice']}:textfile=line.txt",
                "-af", band + "acompressor=threshold=0.1:ratio=3,alimiter=limit=0.6,apad=pad_dur=0.2",
                "-ac", "1", "-ar", "24000", filename,
            ], cwd=temp, check=True)
            clips.append(f"file {filename}")
        (work / "takes.txt").write_text("\n".join(clips) + "\n")
        subprocess.run([
            "ffmpeg", "-nostdin", "-hide_banner", "-loglevel", "error", "-y",
            "-f", "concat", "-safe", "1", "-i", "takes.txt",
            "-codec:a", "libmp3lame", "-b:a", "48k", str(output / f"{cue}.mp3"),
        ], cwd=temp, check=True)
