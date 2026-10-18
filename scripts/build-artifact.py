# Converts the single-file build into the body-only format used for the hosted preview.
import re, pathlib
src = pathlib.Path(__file__).resolve().parent.parent.joinpath('dist-single/index.html').read_text()
head = re.search(r'<head>(.*)</head>', src, re.S).group(1)
body = re.search(r'<body>(.*)</body>', src, re.S).group(1)
head = re.sub(r'<meta charset[^>]*>\s*', '', head)
head = re.sub(r'<meta name="viewport"[^>]*>\s*', '', head)
title = re.search(r'<title>.*?</title>', head).group(0)
head = head.replace(title, '')
out = title + '\n' + head.strip() + '\n' + body.strip() + '\n'
OUT = pathlib.Path(__file__).resolve().parent.parent / 'dist-artifact'; OUT.mkdir(exist_ok=True)
(OUT / 'lamma.html').write_text(out)
print(len(out))
