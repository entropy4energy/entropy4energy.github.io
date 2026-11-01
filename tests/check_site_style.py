"""Check the shared site format and scientific typography after a build."""
import argparse
from html.parser import HTMLParser
from pathlib import Path
import re

DEFINITIONS = {
    'DFT': r'(?P<a>d)ensity\s+(?P<b>f)unctional\s+(?P<c>t)heory\s*\(DFT\)',
    'PAW': r'(?P<a>p)rojector[-\s]+(?P<b>a)ugmented[-\s]+(?P<c>w)ave\s*\(PAW\)',
    'PBE': r'(?P<a>P)erdew[-–\s]+(?P<b>B)urke[-–\s]+(?P<c>E)rnzerhof\s*\(PBE\)',
}

class Text(HTMLParser):
    def __init__(self,html):
        super().__init__(convert_charrefs=True)
        self.stack=[];self.text='';self.underlined=[];self.headings=0
        self.feed(re.sub(r'{[%#].*?[%#]}|{{.*?}}','',html,flags=re.S))
    def handle_starttag(self,tag,attrs):
        if tag=='h1':self.headings+=1
        if tag not in {'input','img','link','meta','br','hr','source','area','base','wbr'}:self.stack.append(tag)
    def handle_endtag(self,tag):
        if tag in self.stack:del self.stack[len(self.stack)-1-self.stack[::-1].index(tag):]
        if tag in {'p','div','section','label','h1','h2','h3','li','option'}:
            self.text+=' ';self.underlined.append(False)
    def handle_data(self,data):
        if any(t in self.stack for t in ['head','header','nav','footer','script','style','option']):return
        self.text+=data;self.underlined.extend(['u' in self.stack]*len(data))

def typography_errors(html,require_definitions=False):
    parsed=Text(html);errors=[]
    for acronym,pattern in DEFINITIONS.items():
        uses=list(re.finditer(r'\b'+acronym+r'\b',parsed.text))
        if not uses:continue
        definition=re.search(pattern,parsed.text,re.I)
        if definition is None:
            if require_definitions:errors.append(acronym+': missing first-use definition')
            continue
        if any(not parsed.underlined[definition.start(key)] for key in ['a','b','c']):
            errors.append(acronym+': defining letters must be underlined')
        if require_definitions and uses[0].start()<definition.start():
            errors.append(acronym+': used before its definition')
    return errors

def audit(root,dist):
    errors=[];pages=sorted(dist.glob('*.html'))
    for page in pages:
        html=page.read_text()
        if Text(html).headings!=1:errors.append(page.name+': expected one page title')
        if 'data-s4e-product=' in html or page.stem=='tools':
            errors.extend(page.name+': '+error for error in typography_errors(html,True))
    css=(root/'src/css/main.scss').read_text()
    if not re.search(r'h2\s*\{[^}]*border-bottom:\s*1px solid \$color-line-2',css):
        errors.append('shared section-heading rule changed')
    app=(root/'src/css/fusion-mirrors.scss').read_text()
    if 'font-family:' in app:errors.append('Fusion Mirrors overrides the shared font family')
    if not re.search(r"@use ['\"]tokens['\"]",app):errors.append('Fusion Mirrors must use shared tokens')
    for block in re.findall(r'[^{}]*h[12][^{}]*\{([^{}]*)\}',app):
        if re.search(r'border-bottom\s*:',block):errors.append('Fusion Mirrors overrides a shared heading rule')
    return pages,errors

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--dist',type=Path,required=True)
    args=parser.parse_args();root=Path(__file__).resolve().parents[1]
    pages,errors=audit(root,args.dist)
    for error in errors:print(error)
    print('Audited',len(pages),'pages;',len(errors),'format errors.')
    return bool(errors)

if __name__=='__main__':raise SystemExit(main())
