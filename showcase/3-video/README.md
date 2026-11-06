# Backup demo video

`agriai-demo.mp4` (1920×1080, ~2 min 20 s, Hindi captions burned in) + `agriai-demo.srt` (same captions as a file).
Play this if anything fails live. It shows the 4 strongest flows on the **offline demo**: demo data, and AI answers that
the real model (Gemini) gave earlier for openly licensed disease photos (`backend/demo/recordings.json`).

1. Photo check (सरसों: सफेद रोली) → answer → follow-up question → "not a plant" photo refused
2. Voice "मौसम बताओ" → weather → water advice
3. Sell by photo + words → buyer orders → delivery person link → buyer timeline
4. SHG coordinator panel → pilot dashboard → complaints → mandi trips

Honest notes (also on the last card): a headless browser has no microphone, so the voice step uses a stand-in for the
browser's speech recognition that "hears" the fixed sentence "मौसम बताओ". Logins and the seller's accept / the
coordinator's link creation happen off camera.

Rebuild (≈ 5 min):
```bash
cd frontend && npx playwright test -c playwright.showcase.config.ts video   # records clips/*.webm + captions (*.json)
FFMPEG=/path/to/ffmpeg node ../showcase/3-video/make-video.mjs                # → agriai-demo.mp4 + .srt
```
No system ffmpeg here? `pip install --target /tmp/ff imageio-ffmpeg` gives one
(`/tmp/ff/imageio_ffmpeg/binaries/ffmpeg-*`). The clips (`clips/*.webm`) are not in git (large); the captions are.
