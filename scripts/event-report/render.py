"""Renders the public event report as one self-contained HTML page per language.

Everything a reader or a crawler needs is real text: the figures, the series, the grid
counts. The one chart (the 30-day line) is SVG with its numbers also stated in a
sentence beside it. JavaScript only runs the Day/Night toggle; with it off the page
reads in full.

Styling: the REALITY Year 2 tokens (assets/reality-tokens.css, rev 6.10.26, from the
reality-brand skill). Reading surfaces are cream tickets in both themes; the page,
headings and navigation are the theme's ink or paper.
"""

import html
import json
import re
from datetime import date
from pathlib import Path

from report import BUCKETS, DOW
from strings import STRINGS, t

HERE = Path(__file__).parent
SITE = 'https://realitydn.com'

DAY_CLASS = {'Monday': 'd-mon', 'Tuesday': 'd-tue', 'Wednesday': 'd-wed', 'Thursday': 'd-thu',
             'Friday': 'd-fri', 'Saturday': 'd-sat', 'Sunday': 'd-sun'}


def _asset(name):
    return (HERE / 'assets' / name).read_text(encoding='utf-8')


def tokens_css():
    css = re.sub(r'/\*.*?\*/', '', _asset('reality-tokens.css'), flags=re.S)
    return re.sub(r'\n\s*\n+', '\n', css).strip()


def wordmark():
    svg = re.sub(r'<!--.*?-->', '', _asset('reality-wordmark.svg'), flags=re.S)
    svg = re.sub(r'\s*\n\s*', '\n', svg).strip()
    svg = svg.replace('#0d0905', 'currentColor').replace('#0D0905', 'currentColor')
    return svg.replace('role="img" aria-label="REALITY"', 'aria-hidden="true" focusable="false"', 1)


def esc(s):
    return html.escape(str(s), quote=True)


class Page:
    def __init__(self, p, loc, urls):
        self.p, self.loc, self.urls = p, loc, urls
        self.S = STRINGS[loc]

    def _(self, key, **kw):
        return t(self.loc, key, **kw)

    # formatting -------------------------------------------------------
    def n(self, v):
        s = f'{v:,}'
        return s.replace(',', '.') if self.loc == 'vi' else s

    @staticmethod
    def dmy(iso):
        d = date.fromisoformat(iso)
        return f'{d.day}.{d.month}.{str(d.year)[2:]}'

    def month(self, d):
        return f"{self.S['months_short'][d.month - 1]} ’{str(d.year)[2:]}"

    def name(self, c):
        return c['name'][self.loc]

    def group(self, key):
        g = next(x for x in self.p['mix'] if x['key'] == key)['group']
        if self.loc == 'vi':
            return g.get('nameViLong', g['nameVi'])
        return g.get('nameLong', g['name'])

    # pieces -----------------------------------------------------------
    def section(self, ident, title, note, body):
        note_html = f'<p class="s-note">{note}</p>' if note else ''
        return (f'<section class="section" id="{ident}" aria-labelledby="{ident}-h">\n'
                f'<h2 id="{ident}-h">{esc(title)}</h2>\n<div class="s-rule"></div>\n'
                f'{note_html}\n{body}\n</section>')

    def series_ticket(self, c, facts, size='tk-sm'):
        tag, href = ('a', f' href="{esc(c["url"])}"') if c.get('url') else ('div', '')
        lines = ''.join(f'<span class="st-fact">{f}</span>' for f in facts if f)
        return (f'<{tag} class="tk {size} st" data-cat="{c["group"]}"{href}>'
                f'<span class="st-cat"><i class="mk"></i>{esc(self.group(c["group"]))}</span>'
                f'<span class="st-name">{esc(self.name(c))}</span>{lines}</{tag}>')

    # sections ---------------------------------------------------------
    def hero(self):
        p = self.p
        total = self.n(p['total'])
        return f'''<div class="hero">
  <p class="big-line"><span class="big" data-val="{total}">{total}</span>
  <span class="big-unit">{self._('big_unit')}</span></p>
  <p class="span">{esc(self._('span', opened=self.dmy(p['opened']), asof=self.dmy(p['cutoff'])))}</p>
  <p class="lead">{esc(self._('lead_every' if p['active_days'] >= 30 else 'lead', opened=self.dmy(p['opened']), total=total, last30=self.n(p['last30']),
                              active_days=p['active_days'], series=self.n(p['series']), running=p['running']))}</p>
</div>'''

    def stats(self):
        p = self.p
        rows = [
            (self.n(p['last30']), self._('stat_last30'), ''),
            (self.n(round(p['per_week90'])), self._('stat_week'), ''),
            (self.n(p['series']), self._('stat_series'), self._('stat_series_sub', n=self.n(p['repeated']))),
            (self.n(p['running']), self._('stat_running'), ''),
            (self.n(len(p['debuts'])), self._('stat_new'), ''),
        ]
        cells = ''.join(
            f'<div class="tk tk-sm stat"><dt class="stat-l">{esc(l)}</dt><dd class="stat-n">{v}</dd>'
            + (f'<dd class="stat-sub">{esc(sub)}</dd>' if sub else '') + '</div>'
            for v, l, sub in rows)
        return f'<dl class="stats" aria-label="{esc(self._("kicker"))}">{cells}</dl>'

    def growth(self):
        roll = self.p['rolling']
        xs = [date.fromisoformat(d) for d, _v in roll]
        ys = [v for _d, v in roll]
        top = max(ys)
        step = 50 if top > 120 else 25
        hi = (top // step + 1) * step
        t0, t1 = xs[0], xs[-1]
        span = max((t1 - t0).days, 1)
        W, H = 1000, 300

        def px(d):
            return (d - t0).days / span * W

        def py(v):
            return H - v / hi * H

        pts = ' '.join(f'{px(d):.1f},{py(v):.1f}' for d, v in zip(xs, ys))
        grid = ''.join(f'<line x1="0" y1="{py(v):.1f}" x2="{W}" y2="{py(v):.1f}" class="gl"/>'
                       for v in range(step, hi + 1, step))
        ylab = ''.join(f'<span class="ylab" style="top:{py(v) / H * 100:.2f}%">{self.n(v)}</span>'
                       for v in range(step, hi, step))
        months, cur = [], date(t0.year, t0.month, 1)
        while cur <= t1:
            if cur > t0 and cur.month in (1, 4, 7, 10):
                months.append(f'<span class="xlab" style="left:{px(cur) / W * 100:.2f}%">'
                              f'{esc(self.month(cur))}</span>')
            cur = date(cur.year + (cur.month == 12), cur.month % 12 + 1, 1)
        d0, d1 = roll[0][0], roll[-1][0]
        alt = self._('growth_alt', n0=ys[0], d0=self.dmy(d0), n1=ys[-1], d1=self.dmy(d1))
        svg = (f'<svg class="line" viewBox="0 0 {W} {H}" preserveAspectRatio="none" aria-hidden="true">'
               f'{grid}<polygon class="area" points="0,{H} {pts} {W},{H}"/>'
               f'<polyline class="ln" points="{pts}"/></svg>')
        now = (f'<span class="now" style="left:{px(xs[-1]) / W * 100:.2f}%;top:{py(ys[-1]) / H * 100:.2f}%">'
               f'<span class="now-n">{self.n(ys[-1])}</span></span>')
        body = f'''<figure class="tk tk-lg chart" role="img" aria-label="{esc(alt)}">
  <div class="plot">{svg}{ylab}{now}</div>
  <div class="xaxis">{''.join(months)}</div>
</figure>
<p class="s-read">{esc(self._('growth_read', d0=self.dmy(d0), n0=self.n(ys[0]), d1=self.dmy(d1), n1=self.n(ys[-1])))}</p>'''
        return self.section('growth', self._('growth_title'), self._('growth_note'), body)

    def mix(self):
        p = self.p
        total = p['total'] or 1
        live = [m for m in p['mix'] if m['events']]
        bar = ''.join(f'<span class="seg" data-cat="{m["key"]}" style="flex:{m["events"]} 1 0"></span>'
                      for m in live)
        cards = ''
        for m in live:
            share = round(m['events'] / total * 100)
            share_s = f'{share}' if share else '<1'
            tops = ''.join(f'<li><span>{esc(self.name(c))}</span><span class="cm-n">{self.n(c["runs"])}</span></li>'
                           for c in m['top'])
            cards += f'''<article class="tk tk-sm cm" data-cat="{m['key']}">
  <h3 class="tk-top"><span>{esc(self.group(m['key']))}</span><span>{esc(self._('mix_share', p=share_s))}</span></h3>
  <div class="cm-body"><p class="cm-count">{self.n(m['events'])}</p><ul class="cm-top">{tops}</ul></div>
</article>'''
        body = (f'<div class="tk tk-sm mixbar" role="img" aria-label="{esc(self._("mix_alt", total=self.n(p["total"])))}">{bar}</div>'
                f'<div class="cm-grid">{cards}</div>')
        return self.section('mix', self._('mix_title'), self._('mix_note'), body)

    def regulars(self):
        regs = self.p['regulars']
        out = ''
        for d in DOW:
            day = [r for r in regs if r['dow'] == d]
            if not day:
                continue
            cards = ''.join(self.series_ticket(r, [
                ' · '.join(x for x in (self._('cadence_' + r['cadence']), r['time']) if x),
                ' · '.join((self._('since', d=self.dmy(r['first'])),
                            self._('times', n=self.n(r['runs'])))),
            ]) for r in day)
            out += (f'<div class="day {DAY_CLASS[d]}"><h3 class="day-h"><i class="dot"></i>'
                    f'{esc(self.S["days"][d])}</h3><div class="st-grid">{cards}</div></div>')
        return self.section('regulars', self._('regulars_title'),
                            esc(self._('regulars_note', n=len(regs))), out)

    def debuts(self):
        deb = self.p['debuts']
        if not deb:
            note, body = esc(self._('new_empty')), ''
        else:
            note = esc(self._('new_note_one') if len(deb) == 1 else self._('new_note', n=len(deb)))
            body = '<div class="st-grid">' + ''.join(self.series_ticket(c, [
                ' · '.join((self._('new_first', d=self.dmy(c['first'])),
                            self._('times_one') if c['runs'] == 1 else self._('times', n=c['runs']))),
            ]) for c in deb) + '</div>'
        return self.section('new', self._('new_title'), note, body)

    def when(self):
        p = self.p
        grid, top = p['grid'], p['grid_top']
        peak = max(max(v.values()) for v in grid.values()) or 1
        head = ''.join(f'<th scope="col" class="{DAY_CLASS[d]}"><i class="dot"></i>'
                       f'<abbr title="{esc(self.S["days"][d])}">{esc(self.S["days_short"][d])}</abbr></th>'
                       for d in DOW)
        rows = ''
        for b in BUCKETS:
            cells = ''
            for d in DOW:
                n = grid[d][b]
                if not n:
                    cells += (f'<td class="{DAY_CLASS[d]} open"><span class="g-open">'
                              f'{esc(self._("open_label"))}</span></td>')
                    continue
                shade = 14 + n / peak * 46
                lead = top[d][b]
                lead_html = (f'<span class="g-top">{esc(self.name(lead))}</span>'
                             if lead and n >= 3 else '')
                cells += (f'<td class="{DAY_CLASS[d]}" style="--shade:{shade:.0f}%">'
                          f'<span class="g-n">{n}</span>{lead_html}</td>')
            rows += (f'<tr><th scope="row" class="band">{esc(self._("band_" + b))}'
                     f'<span class="band-h">{esc(self._("band_hours_" + b))}</span></th>{cells}</tr>')
        table = (f'<div class="tk tk-lg grid-wrap"><table class="slots">'
                 f'<caption class="vh">{esc(self._("when_caption"))}</caption>'
                 f'<thead><tr><td></td>{head}</tr></thead><tbody>{rows}</tbody></table></div>')

        home = '/vn/' if self.loc == 'vi' else '/'
        slots = p['open_slots']
        if slots:
            chips = ''.join(f'<li class="{DAY_CLASS[d]}"><i class="dot"></i>{esc(self.S["days_short"][d])} · '
                            f'{esc(self._("band_" + b).lower())}</li>' for d, b in slots)
            inner = f'<p>{esc(self._("open_body"))}</p><ul class="chips">{chips}</ul>'
        else:
            inner = f'<p>{esc(self._("open_none"))}</p>'
        call = f'''<aside class="tk tk-lg opencall" aria-labelledby="open-h">
  <h3 id="open-h">{esc(self._('open_title'))}</h3>
  {inner}
  <a class="btn action" href="{home}#proposal">{esc(self._('open_cta'))}</a>
</aside>'''
        return self.section('when', self._('when_title'), esc(self._('when_note')), table + call)

    def week(self):
        days = self.p['week']
        n = sum(len(d['events']) for d in days)
        cols = ''
        for d in days:
            dd = date.fromisoformat(d['date'])
            items = ''.join(
                f'<li data-cat="{c["group"]}"><span class="ag-t">{esc(c["time"] or "—")}</span>'
                f'<i class="mk"></i><span>{esc(self.name(c))}</span></li>' for c in d['events'])
            cols += (f'<div class="tk tk-sm ag {DAY_CLASS[d["dow"]]}"><h3 class="ag-h"><i class="dot"></i>'
                     f'{esc(self.S["days_short"][d["dow"]])} {dd.day}.{dd.month}'
                     f'<span class="ag-n">{len(d["events"])}</span></h3><ul>{items}</ul></div>')
        return (f'<details class="fold section" id="week"><summary>'
                f'{esc(self._("week_summary", n=n))}</summary><div class="agenda">{cols}</div></details>')

    # page -------------------------------------------------------------
    def jsonld(self, title, desc):
        p, url = self.p, self.urls[self.loc]
        data = {'@context': 'https://schema.org', '@graph': [
            {'@type': 'WebPage', '@id': url + '#page', 'url': url, 'name': title,
             'description': desc, 'inLanguage': self.S['html_lang'], 'dateModified': p['cutoff'],
             'isPartOf': {'@id': SITE + '/#website'}, 'about': {'@id': SITE + '/#business'},
             'mainEntity': {'@id': self.urls['stats'] + '#dataset'}},
            {'@type': 'Dataset', '@id': self.urls['stats'] + '#dataset',
             'name': self._('dataset_name'), 'description': self._('dataset_description'),
             'url': url, 'inLanguage': self.S['html_lang'], 'isAccessibleForFree': True,
             'creator': {'@id': SITE + '/#business'}, 'dateModified': p['cutoff'],
             'temporalCoverage': f"{p['opened']}/{p['cutoff']}",
             'spatialCoverage': {'@type': 'Place', 'name': 'REALITY, 86 Mai Thúc Lân, Đà Nẵng'},
             'variableMeasured': ['events held', 'events in the last 30 days', 'series running',
                                  'events by category'],
             'distribution': [{'@type': 'DataDownload', 'encodingFormat': 'application/json',
                               'contentUrl': self.urls['stats']}]},
        ]}
        return json.dumps(data, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')

    def render(self):
        p, loc = self.p, self.loc
        total = self.n(p['total'])
        title = self._('doc_title', total=total, opened=self.dmy(p['opened']))
        desc = self._('meta_description', total=total, opened=self.dmy(p['opened']),
                      last30=self.n(p['last30']), series=self.n(p['series']))
        url = self.urls[loc]
        home = '/vn/' if loc == 'vi' else '/'
        other = 'en' if loc == 'vi' else 'vi'
        names = {'en': 'English', 'vi': 'Tiếng Việt'}
        paths = {'en': '/event-report/', 'vi': '/event-report/vn/'}
        langs = ''.join(
            f'<span class="lang is-on" aria-current="page">{names[c]}</span>' if c == loc else
            f'<a class="lang" href="{paths[c]}" hreflang="{c}" lang="{c}">{names[c]}</a>'
            for c in ('en', 'vi'))
        body = '\n'.join([
            self.stats(), self.growth(), self.mix(), self.regulars(), self.debuts(), self.when(),
            self.week()])
        return f'''<!DOCTYPE html>
<html lang="{self.S['html_lang']}" data-theme="light">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{esc(title)}</title>
<meta name="description" content="{esc(desc)}">
<link rel="canonical" href="{url}">
<link rel="alternate" hreflang="en" href="{self.urls['en']}">
<link rel="alternate" hreflang="vi" href="{self.urls['vi']}">
<link rel="alternate" hreflang="x-default" href="{self.urls['en']}">
<link rel="alternate" type="application/json" href="{self.urls['stats']}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="REALITY">
<meta property="og:url" content="{url}">
<meta property="og:title" content="{esc(self._('og_title'))}">
<meta property="og:description" content="{esc(desc)}">
<meta property="og:image" content="{SITE}/images/og-card.png">
<meta property="og:locale" content="{'vi_VN' if loc == 'vi' else 'en_US'}">
<link rel="icon" href="/favicon.svg?v=ink-square" type="image/svg+xml">
<link rel="icon" href="/favicon.ico?v=ink-square" sizes="any">
<meta name="theme-color" content="#fffbf1">
<script>
(function(){{try{{var t=localStorage.getItem('reality-theme');
if(!t&&window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches)t='dark';
if(t==='dark'){{document.documentElement.setAttribute('data-theme','dark');
var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content','#0a0703');}}}}catch(e){{}}}})();
</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@100;200;500;600;700;800&family=Montserrat+Alternates:wght@600&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
{tokens_css()}
{CSS}
</style>
<script type="application/ld+json">{self.jsonld(title, desc)}</script>
</head>
<body>
<button class="theme-toggle" id="theme-toggle" type="button"
 data-to-dark="{esc(self._('to_dark'))}" data-to-light="{esc(self._('to_light'))}"
 aria-label="{esc(self._('to_dark'))}" title="{esc(self._('to_dark'))}">{ICON_MOON}{ICON_SUN}</button>
<div class="wrap">
<header class="masthead">
  <div class="top-row">
    <a class="wordmark-box" href="{home}" aria-label="{esc(self._('home_label'))}">{wordmark()}</a>
    <nav class="langs" aria-label="{esc(self._('lang_label'))}">{langs}</nav>
  </div>
  <p class="kicker">{esc(self._('kicker'))}</p>
  <h1 class="vh">{esc(title)}</h1>
  {self.hero()}
</header>
<main>
{body}
</main>
<footer class="footer">
  <p class="f-addr">86 Mai Thúc Lân, Đà Nẵng · <a href="{home}">realitydn.com</a></p>
  <p class="f-meta">{esc(self._('footer_method'))}</p>
  <p class="f-meta">{esc(self._('footer_updated', d=self.dmy(p['cutoff'])))}
  <a href="/event-report/stats.json" type="application/json">{esc(self._('footer_data'))}</a></p>
</footer>
</div>
<script>{JS}</script>
</body>
</html>
'''


def page(p, loc, urls):
    return Page(p, loc, urls).render()


ICON_MOON = ('<svg class="ti ti-moon" width="18" height="18" viewBox="0 0 24 24" fill="none" '
             'stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter" '
             'aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/></svg>')
ICON_SUN = ('<svg class="ti ti-sun" width="18" height="18" viewBox="0 0 24 24" fill="none" '
            'stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter" '
            'aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 '
            '11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4m11.4-11.4 1.4-1.4"/></svg>')

JS = """
(function(){
  var root=document.documentElement,btn=document.getElementById('theme-toggle');
  var meta=document.querySelector('meta[name="theme-color"]');
  function set(mode,animate){
    if(animate){root.classList.add('theme-settling');
      setTimeout(function(){root.classList.remove('theme-settling');},700);}
    root.setAttribute('data-theme',mode);
    if(meta)meta.setAttribute('content',mode==='dark'?'#0a0703':'#fffbf1');
    var label=mode==='dark'?btn.dataset.toLight:btn.dataset.toDark;
    btn.setAttribute('aria-label',label);btn.setAttribute('title',label);
  }
  // Same key as realitydn.com, so a choice made on the site carries over.
  set(root.getAttribute('data-theme')==='dark'?'dark':'light',false);
  btn.addEventListener('click',function(){
    var mode=root.getAttribute('data-theme')==='dark'?'light':'dark';
    set(mode,true);
    try{localStorage.setItem('reality-theme',mode);}catch(e){}
  });
})();
""".strip()

CSS = r"""
*{margin:0;padding:0;box-sizing:border-box;border-radius:0}
html{background:var(--bg)}
body{background:var(--bg);color:var(--fg);font-family:var(--grotesk);font-size:17px;line-height:1.65;
  -webkit-text-size-adjust:100%}
.wrap{max-width:1120px;margin:0 auto;padding:0 var(--screen-pad)}
a{color:inherit}
.vh{position:absolute!important;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.dot,.mk{display:inline-block;width:10px;height:10px;flex:none;border:1.5px solid currentColor}
.dot{background:var(--day)}
.mk{background:var(--cat,var(--fg))}

/* theme toggle (shares the site's reality-theme preference) */
.theme-toggle{position:fixed;top:14px;right:14px;z-index:60;display:flex;align-items:center;
  justify-content:center;width:48px;height:48px;padding:0;border:2px solid var(--fg);
  background:var(--bg);color:var(--fg);box-shadow:var(--sh-light);cursor:pointer;
  transition:transform var(--dur-tap) var(--ease-stamp),box-shadow var(--dur-tap) var(--ease-snap)}
.theme-toggle:hover{transform:translateY(-3px);box-shadow:var(--sh-default)}
.theme-toggle:active{transform:translateY(2px);box-shadow:var(--sh-light)}
.theme-toggle .ti-sun,[data-theme="dark"] .theme-toggle .ti-moon{display:none}
[data-theme="dark"] .theme-toggle .ti-sun{display:block}

/* masthead + hero */
.masthead{padding:var(--space-9) 0 var(--space-6);isolation:isolate}
.top-row{display:flex;align-items:center;gap:var(--space-4);flex-wrap:wrap;margin-bottom:var(--space-8);
  padding-right:64px}
.wordmark-box{display:inline-block;border:2px solid var(--fg);background:var(--bg);color:var(--fg);
  padding:13px 20px;box-shadow:var(--sh-default)}
.wordmark-box svg{display:block;height:18px;width:auto}
.langs{display:flex;border:2px solid var(--fg);box-shadow:var(--sh-light);background:var(--bg)}
.lang{font-family:var(--mont);font-weight:700;font-size:12px;letter-spacing:var(--tr-button);
  text-transform:uppercase;padding:12px 14px;color:var(--fg);text-decoration:none;
  border-right:2px solid var(--fg);display:flex;align-items:center;min-height:var(--tap-min)}
.lang:last-child{border-right:0}
/* --fg fill takes --bg text: after dark --fg is cream, and --on-ink would paint cream on cream */
.lang.is-on{background:var(--fg);color:var(--bg)}
.kicker{font-family:var(--mont);font-weight:700;font-size:13px;letter-spacing:var(--tr-label);
  text-transform:uppercase;color:var(--fg);margin-bottom:var(--space-5)}
.kicker::before{content:"";display:inline-block;width:.62em;height:.62em;margin-right:.6em;
  background:var(--accent);vertical-align:.04em}
.big-line{display:flex;align-items:flex-end;gap:var(--space-5);flex-wrap:wrap}
.big{position:relative;display:inline-block;font-family:var(--mont);font-weight:700;
  font-size:clamp(84px,16vw,190px);line-height:.86;letter-spacing:var(--tr-display);
  font-variant-numeric:tabular-nums;animation:stamp 260ms var(--ease-stamp) both}
.big::before,.big::after{content:attr(data-val);position:absolute;left:0;top:0;z-index:-1}
.big::before{color:var(--accent);transform:translate(var(--misreg-hero-1),var(--misreg-hero-2))}
.big::after{color:var(--accent-2);transform:translate(calc(var(--misreg-hero-2) * -1),0)}
.big-unit{font-family:var(--mont);font-weight:700;font-size:15px;letter-spacing:.06em;
  text-transform:uppercase;line-height:1.4;padding-bottom:14px}
.span{font-size:14px;color:var(--fg-faint);margin-top:var(--space-5)}
.lead{max-width:62ch;margin-top:var(--space-4);font-size:18px;line-height:1.6}

/* the numbers */
.stats{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:var(--space-4);
  margin-top:var(--space-7)}
.stat{display:flex;flex-direction:column;padding:var(--space-4)}
.stat-n{order:-1;font-family:var(--mont);font-weight:700;font-size:40px;line-height:1;
  font-variant-numeric:tabular-nums}
.stat-l{font-size:14px;line-height:1.35;margin-top:var(--space-2)}
.stat-sub{font-size:13px;color:var(--fg-faint);margin-top:var(--space-1);line-height:1.35}

/* sections */
.section{padding-top:var(--space-10)}
h2{font-family:var(--mont);font-weight:600;font-size:24px;letter-spacing:var(--tr-h2);
  text-transform:uppercase;line-height:1.15}
.s-rule{border-top:1.5px solid var(--fg);margin:var(--space-3) 0 var(--space-5)}
.s-note{max-width:64ch;color:var(--fg-dim);font-size:16px;margin-bottom:var(--space-6)}
.s-read{margin-top:var(--space-6);font-size:16px;max-width:72ch;
  border-left:6px solid var(--accent);padding-left:var(--space-4)}
h3{font-family:var(--mont);font-weight:700;font-size:13px;letter-spacing:var(--tr-label);text-transform:uppercase}

/* the line */
.chart{padding:var(--space-5) var(--space-5) var(--space-3)}
.plot{position:relative;height:260px}
.line{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.gl{stroke:var(--hairline);stroke-width:1;vector-effect:non-scaling-stroke}
.area{fill:color-mix(in srgb,var(--blue) 22%,transparent)}
.ln{fill:none;stroke:var(--fg);stroke-width:2.5;stroke-linejoin:round;vector-effect:non-scaling-stroke}
.ylab{position:absolute;left:0;transform:translateY(-120%);font-family:var(--grotesk);font-weight:500;
  font-size:12px;color:var(--fg-faint);font-variant-numeric:tabular-nums}
.now{position:absolute;width:14px;height:14px;margin:-7px 0 0 -7px;background:var(--red);
  border:2px solid var(--fg)}
.now-n{position:absolute;right:18px;top:-30px;font-family:var(--mont);font-weight:700;font-size:20px;
  background:var(--bg);padding:0 4px}
.xaxis{position:relative;height:28px;border-top:2px solid var(--fg);margin-top:2px}
.xlab{position:absolute;top:6px;font-size:12px;color:var(--fg-faint);white-space:nowrap;
  padding-left:5px;border-left:1.5px solid var(--fg)}

/* a bit of everything */
.mixbar{display:flex;height:44px;padding:0;overflow:hidden}
.seg{display:block;min-width:4px;background:var(--cat);border-right:2px solid var(--fg)}
.seg:last-child{border-right:0}
.cm-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:var(--space-5);margin-top:var(--space-6)}
.cm .tk-top{font-size:12px}
.cm .tk-top span:last-child{font-family:var(--grotesk);font-weight:600;letter-spacing:0;text-transform:none;white-space:nowrap}
.cm-body{padding:var(--space-4) var(--space-4) var(--space-3)}
.cm-count{font-family:var(--mont);font-weight:700;font-size:36px;line-height:1;font-variant-numeric:tabular-nums}
.cm-top{list-style:none;margin-top:var(--space-3);border-top:1.5px solid var(--fg);padding-top:var(--space-2)}
.cm-top li{display:flex;justify-content:space-between;gap:var(--space-3);padding:3px 0;font-size:14px;
  border-bottom:1px solid var(--hairline)}
.cm-top li:last-child{border-bottom:0}
.cm-n{font-weight:600;font-variant-numeric:tabular-nums}

/* series tickets: the regulars and the debuts */
.day{margin-top:var(--space-6)}
.day:first-of-type{margin-top:0}
.day-h{display:flex;align-items:center;gap:10px;margin-bottom:var(--space-3)}
.st-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:var(--space-4)}
.st{display:flex;flex-direction:column;gap:2px;padding:var(--space-3) var(--space-4);text-decoration:none}
.st-cat{display:flex;align-items:center;gap:7px;font-family:var(--mont);font-weight:700;font-size:11px;
  letter-spacing:.1em;text-transform:uppercase;color:var(--fg-dim);margin-bottom:4px}
.st-cat .mk{width:9px;height:9px}
.st-name{font-family:var(--mont);font-weight:600;font-size:15px;line-height:1.3;letter-spacing:var(--tr-name)}
a.st .st-name::after{content:"\00a0\2197";font-weight:500}
.st-fact{font-size:13px;color:var(--fg-dim);font-variant-numeric:tabular-nums;line-height:1.45}

/* when things happen */
.grid-wrap{overflow-x:auto;padding:0}
.slots{border-collapse:collapse;width:100%;min-width:720px;font-size:14px}
.slots thead th{font-family:var(--mont);font-weight:700;font-size:12px;letter-spacing:.1em;
  text-transform:uppercase;padding:12px 8px;border-bottom:2px solid var(--fg);text-align:left;white-space:nowrap}
.slots thead .dot{margin-right:7px;vertical-align:-1px}
.slots abbr{text-decoration:none}
.slots th.band{font-family:var(--mont);font-weight:700;font-size:12px;letter-spacing:.08em;
  text-transform:uppercase;text-align:left;padding:12px var(--space-4);border-bottom:1px solid var(--hairline);
  border-right:2px solid var(--fg);white-space:nowrap;vertical-align:top}
.band-h{display:block;font-family:var(--grotesk);font-weight:500;letter-spacing:0;font-size:12px;
  color:var(--fg-faint);text-transform:none}
.slots td{border-bottom:1px solid var(--hairline);border-right:1px solid var(--hairline);padding:10px;
  vertical-align:top;width:12.5%;background:color-mix(in srgb,var(--day) var(--shade,0%),transparent)}
.slots tr:last-child td,.slots tr:last-child th{border-bottom:0}
.slots td:last-child{border-right:0}
.g-n{display:block;font-family:var(--mont);font-weight:700;font-size:20px;line-height:1;font-variant-numeric:tabular-nums}
.g-top{display:block;font-size:12px;line-height:1.3;margin-top:5px;color:var(--fg-dim)}
.slots td.open{background:repeating-linear-gradient(45deg,var(--ticket-inset) 0 8px,transparent 8px 16px);
  outline:2px dashed var(--red);outline-offset:-5px}
.g-open{font-family:var(--mont);font-weight:700;font-size:11px;letter-spacing:.12em;text-transform:uppercase}

.opencall{margin-top:var(--space-6);padding:var(--space-5);--print:var(--red);max-width:760px}
.opencall p{margin-top:var(--space-2);max-width:60ch}
.chips{list-style:none;display:flex;flex-wrap:wrap;gap:var(--space-2);margin:var(--space-4) 0 var(--space-5)}
.chips li{display:flex;align-items:center;gap:7px;border:2px solid var(--fg);padding:6px 10px;
  font-size:13px;font-weight:500}
.btn{display:inline-flex;align-items:center;min-height:var(--tap-min);font-family:var(--mont);font-weight:700;
  font-size:14px;letter-spacing:.1em;text-transform:uppercase;text-decoration:none;padding:14px 26px;
  border:2px solid var(--fg);transition:transform var(--dur-tap) var(--ease-stamp),box-shadow var(--dur-tap) var(--ease-snap)}
.btn.action{background:var(--red);border-color:var(--red);color:var(--on-red);--accent:var(--yellow);
  box-shadow:0 4px 1px rgba(13,9,5,.10)}
.btn:hover{transform:translateY(-3px);box-shadow:0 8px 2px rgba(13,9,5,.16)}
.btn:active{transform:translateY(2px)}

/* the last seven days (a fold) */
.fold>summary{cursor:pointer;list-style:none;display:flex;align-items:center;gap:12px;
  font-family:var(--mont);font-weight:600;font-size:18px;letter-spacing:.04em;text-transform:uppercase;
  border-top:1.5px solid var(--fg);border-bottom:1.5px solid var(--fg);padding:16px 0;min-height:var(--tap-min)}
.fold>summary::-webkit-details-marker{display:none}
.fold>summary::before{content:"+";font-family:var(--mont);font-weight:700;font-size:22px;width:22px}
.fold[open]>summary::before{content:"\2212"}
.agenda{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:var(--space-4);
  margin-top:var(--space-6)}
.ag-h{display:flex;align-items:center;gap:8px;padding:10px var(--space-4);border-bottom:2px solid var(--fg)}
.ag-n{margin-left:auto;font-size:14px}
.ag ul{list-style:none;padding:var(--space-2) var(--space-4) var(--space-3)}
.ag li{display:flex;gap:8px;align-items:baseline;padding:4px 0;font-size:14px;line-height:1.35;
  border-bottom:1px solid var(--hairline)}
.ag li:last-child{border-bottom:0}
.ag li .mk{width:8px;height:8px;align-self:center}
.ag-t{font-weight:500;font-size:13px;color:var(--fg-faint);min-width:40px;font-variant-numeric:tabular-nums}

/* footer */
.footer{border-top:3px solid var(--fg);margin-top:var(--space-10);padding:var(--space-7) 0 var(--space-9)}
.f-addr{font-family:var(--mont);font-weight:700;font-size:12px;letter-spacing:.12em;text-transform:uppercase}
.f-meta{font-size:14px;color:var(--fg-dim);margin-top:var(--space-3);max-width:72ch}
.f-meta a,.f-addr a{text-underline-offset:3px}

/* Vietnamese: uppercase with diacritics needs the extra leading */
:lang(vi) h2,:lang(vi) h3,:lang(vi) .kicker,:lang(vi) .big-unit,:lang(vi) .lang,:lang(vi) .slots th,
:lang(vi) .st-cat,:lang(vi) .tk-top,:lang(vi) .fold>summary,:lang(vi) .btn,:lang(vi) .f-addr{line-height:1.3}

@keyframes stamp{from{transform:translateY(-14px) scale(.97)}to{transform:none}}

@media(max-width:960px){
  .stats{grid-template-columns:repeat(2,minmax(0,1fr))}
  .stats .stat:first-child{grid-column:1/-1}
  .cm-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
}
@media(max-width:600px){
  body{font-size:16px}
  .masthead{padding-top:var(--space-7)}
  .top-row{margin-bottom:var(--space-7);padding-right:0}
  .theme-toggle{top:auto;bottom:14px;right:14px}
  .lead{font-size:17px}
  .stat-n{font-size:32px}
  .cm-grid{grid-template-columns:1fr}
  .plot{height:200px}
  h2{font-size:21px}
  .section{padding-top:var(--space-9)}
  .btn{width:100%;justify-content:center}
}
"""
