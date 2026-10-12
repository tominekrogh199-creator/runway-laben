#!/usr/bin/env python3
"""Bygger Runway-laben til én HTML-fil.

    python3 build.py                  -> runway-laben.html (fragment, slik artefakten publiseres)
    python3 build.py --standalone     -> runway-laben-standalone.html (komplett side for lokal åpning)
    python3 build.py -o sti.html      -> velg filnavn selv
"""
import argparse
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent
JS_ORDER = ['engine.js', 'meshdata.js', 'mannequin.js', 'lessons.js', 'app.js']
THREE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'
FONTS = ('https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,500;0,6..96,600;1,6..96,500'
         '&family=Instrument+Sans:wght@400;500;600&family=JetBrains+Mono:wght@500;600;700&display=swap')


def build(standalone: bool) -> str:
    css = (ROOT / 'style.css').read_text(encoding='utf-8')
    shell = (ROOT / 'shell.html').read_text(encoding='utf-8')
    js = '\n'.join((ROOT / f).read_text(encoding='utf-8') for f in JS_ORDER)
    body = f'''<title>Runway-laben</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="{FONTS}" rel="stylesheet">
<style>
{css}
</style>
{shell}
<script src="{THREE_URL}"></script>
<script>
{js}
</script>
'''
    if not standalone:
        return body
    return ('<!doctype html>\n<html lang="nb">\n<head>\n<meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
            '<style>body{margin:0;font:14px system-ui,sans-serif}[hidden]{display:none!important}img{max-width:100%}</style>\n'
            '</head>\n<body>\n' + body + '</body>\n</html>\n')


def main():
    ap = argparse.ArgumentParser(description='Bygg Runway-laben til én HTML-fil.')
    ap.add_argument('--standalone', action='store_true', help='lag en komplett HTML-side som kan åpnes direkte i nettleseren')
    ap.add_argument('-o', '--out', help='filnavn for resultatet')
    a = ap.parse_args()
    out = pathlib.Path(a.out) if a.out else ROOT / ('runway-laben-standalone.html' if a.standalone else 'runway-laben.html')
    html = build(a.standalone)
    out.write_text(html, encoding='utf-8')
    print(f'{out}  ({len(html.encode("utf-8")) / 1024:.0f} KB)')


if __name__ == '__main__':
    main()
