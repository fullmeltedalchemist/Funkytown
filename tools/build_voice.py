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
    text = Path(temp) / "line.txt"
    for cue, line in lines.items():
        text.write_text(line["text"], encoding="utf-8")
        subprocess.run([
            "ffmpeg", "-nostdin", "-hide_banner", "-loglevel", "error", "-y",
            "-f", "lavfi", "-i", f"flite=voice={line['voice']}:textfile=line.txt",
            "-af", "highpass=f=260,lowpass=f=3500,acompressor=threshold=0.1:ratio=3,alimiter=limit=0.6",
            "-ac", "1", "-ar", "24000", "-codec:a", "libmp3lame", "-b:a", "48k",
            str(output / f"{cue}.mp3"),
        ], cwd=temp, check=True)
