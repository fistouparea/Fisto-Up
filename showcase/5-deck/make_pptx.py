"""deck.pdf → deck.pptx: one full-slide picture per slide (looks exactly like the PDF on any PC, Hindi included)
plus the speaker notes from deck.html. Needs pdftoppm and python-pptx. Edit the deck in build_deck.py, not in PowerPoint.
   python3 make_pptx.py"""
import glob, html, os, re, subprocess, tempfile
from pptx import Presentation
from pptx.util import Emu

here = os.path.dirname(os.path.abspath(__file__))
notes = [html.unescape(n) for n in re.findall(r'data-notes="([^"]*)"', open(os.path.join(here, 'deck.html'), encoding='utf-8').read())]
with tempfile.TemporaryDirectory() as tmp:
    subprocess.run(['pdftoppm', '-png', '-scale-to-x', '1920', '-scale-to-y', '1080', os.path.join(here, 'deck.pdf'), os.path.join(tmp, 's')], check=True)
    images = sorted(glob.glob(os.path.join(tmp, 's-*.png')))
    prs = Presentation()
    prs.slide_width, prs.slide_height = Emu(12192000), Emu(6858000)  # 16:9
    for i, image in enumerate(images):
        slide = prs.slides.add_slide(prs.slide_layouts[6])
        slide.shapes.add_picture(image, 0, 0, width=prs.slide_width, height=prs.slide_height)
        if i < len(notes) and notes[i]:
            slide.notes_slide.notes_text_frame.text = notes[i]
    prs.save(os.path.join(here, 'deck.pptx'))
print(len(images), 'slides → deck.pptx')
