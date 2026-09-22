/* ============================================================
   REALITY PRINT STUDIO — the starter templates
   ------------------------------------------------------------
   The shipped layouts (grouped by TEMPLATE_GROUPS) and
   buildTemplate, which expands a terse {type,x,y,w,h,p} entry
   into full elements through makeElement. The studio test suite
   builds every one of these (window.TEMPLATES / buildTemplate —
   main.jsx) to learn what each QR on the PDF should decode to.
   (Split out of print-data.jsx, Phase 3.)
   ============================================================ */
import { ACCENTS } from '../studio-shared/brand.js';
import { makeElement } from './print-data.jsx';


/* ============================================================
   TEMPLATES — starting layouts, one per material category, each
   authored at its natural size. Pick one to fill the artboard.
   els entries are terse {type,x,y,w,h,p}; coords in pt.
   ============================================================ */
const TEMPLATE_GROUPS = ['Stickers', 'QR standee', 'Wayfinding', 'Menus'];
/* Rebuilt 24.08.26 against current canon. The previous set was 79 layouts
   across seven groups, much of it speculative — tip jars, Zalo, VietQR,
   loyalty punch cards, room-capacity signs — none of which we print. This is
   the core: fifteen pieces we actually put on a wall, a table or a laptop.
   Specials, Merch and Tags & coupons are retired; a one-off promo is a
   My-template, not a shipped default.

   Everything here is on the current system:
     · the mark rides the footer (full 9x2 strip bare, or the square flush
       against the footer QR) — no piece places a second one;
     · Montserrat NAMES, Grotesk STATES facts, so every price, time and
       address is Grotesk with tabular figures;
     · tracking comes off the print ladder via the components, never inline;
     · REGISTER follows canon M2. Signage and standees are FAR, so they keep
       caps. Menus and table cards are NEAR — M2 names a printed menu
       explicitly — so their headings and item names are sentence case and
       `upper:false`. That is the one visible break with the old set.
     · purple fills take cream text and everything else takes ink, straight
       out of contrastInk;
     · QR targets are the real ones: app.realitydn.com for check-in, menu and
       the hub; the printed site string stays realitydn.com.
   Prices stay in the short 85k form — that is the printed-menu register here,
   and 45.000d is the app and web form. */
const TEMPLATES = [
  /* ---- STICKERS · square die-cut stock, the visible shape drawn inside ---- */
  { id:"stk-stamp-round", name:"Round stamp", group:"Stickers", size:"st100", orient:"portrait", accent:"red", els:[
    {"type":"sticker","x":8,"y":8,"w":267,"h":267,"p":{"shape":"circle","fill":"white","ring":"red","ringW":8}},
    {"type":"arctext","x":30,"y":30,"w":223,"h":223,"p":{"text":"REALITY · BAR · CAFÉ","fill":"red","fontSize":21}},
    {"type":"arctext","x":30,"y":30,"w":223,"h":223,"p":{"text":"ĐÀ NẴNG · SINCE 2024","fill":"red","fontSize":17,"flip":true}},
    {"type":"inkmark","x":110,"y":110,"w":64,"h":64,"p":{"form":"square-anchored","mode":"full"}}
  ]},
  { id:"stk-mark-square", name:"The mark", group:"Stickers", size:"st75", orient:"portrait", accent:"blue", els:[
    {"type":"sticker","x":6,"y":6,"w":201,"h":201,"p":{"shape":"squircle","fill":"white","ring":"ink","ringW":5,"radius":0.28}},
    {"type":"inkmark","x":47,"y":40,"w":120,"h":120,"p":{"form":"square-anchored","mode":"full"}},
    {"type":"wordmark","x":57,"y":172,"w":100,"h":17,"p":{"ink":"ink"}}
  ]},
  { id:"stk-qr-scan", name:"Scan sticker", group:"Stickers", size:"st75", orient:"portrait", accent:"pink", els:[
    {"type":"sticker","x":6,"y":6,"w":201,"h":201,"p":{"shape":"circle","fill":"white","ring":"pink","ringW":5}},
    {"type":"qr","x":57,"y":40,"w":99,"h":124,"p":{"data":"https://app.realitydn.com","caption":"WHAT'S ON","quiet":true}},
    {"type":"kicker","x":34,"y":170,"w":145,"h":18,"p":{"text":"REALITY · ĐÀ NẴNG","ink":"pink","align":"center","fontSize":8}}
  ]},

  /* ---- QR STANDEE · far register, caps. The code is the whole point, so the
     footer runs without one and carries the full strip instead.

     Rebuilt 12.09.26, A6-FIRST. The old set put a thin colour band across the
     top of an otherwise white card and floated a small code in the middle of
     it — legible, but it whispered on a loud table. These flood the field,
     slam the headline and let the QR's own white quiet zone read as a WINDOW
     punched through the colour. Four rules hold the set together:

       · EVERY FLOOD BLEEDS. Elements are drawn into a page of trim + 3mm, and
         nothing clips them to the artboard, so a "full-bleed" block at x:0
         w:297.6 leaves the bleed white and a cut 0.5mm off shows it. Flood
         geometry is therefore -12 / +12 past the trim on each bled edge.
       · the colour stops short of the foot. The ink mark's stock cells are
         UNPRINTED paper (the exporter skips them), so a footer over a flood
         would render its mark in the flood colour on press while the screen
         showed white. Every footer here sits on bare stock.
       · the QR element's `ink` IS the module colour — tinting it to sit on a
         dark ground would erase the code — so it stays `ink` and the caption
         moves out to its own kicker, free to go white.
       · eyeStyle STAYS SQUARE. Verified by decoding the exported PDFs with
         OpenCV: rounded/dot MODULES decode fine, but a rounded or dot finder
         eye fails every time — the 1.9-module corner radius in qrGeometry
         distorts the 1:1:3:1:1 run the detector locks onto. (qrGeometry now
         draws square eyes whatever eyeStyle says, and the inspector no longer
         offers the others.) moduleStyle:'rounded' + the star centre mark
         (which forces ECL H) both decode; the eyes must not.

     Six A6 cards, one structure each so the picker doesn't read as six copies
     — flood · halftone · angled seam · marquee · inset ticket · sunburst —
     plus the two A5s that genuinely get read across a room. ---- */
  { id:"qr-checkin-a6", name:"Check in — A6", group:"QR standee", size:"a6", orient:"portrait", accent:"green", els:[
    {"type":"block","x":-12,"y":-12,"w":322,"h":364,"p":{"fill":"green"}},
    {"type":"kicker","x":24,"y":24,"w":252,"h":16,"p":{"text":"MỖI TỐI · EVERY NIGHT","ink":"ink","align":"left","fontSize":9}},
    {"type":"headline","x":24,"y":44,"w":252,"h":116,"p":{"text":"CHECK\nIN","fontSize":62,"align":"left","weight":800,"ink":"ink","leading":0.88,"echo":true,"echoAccent":"purple","echoDx":5,"echoDy":5}},
    {"type":"qr","x":74,"y":178,"w":150,"h":150,"p":{"data":"https://app.realitydn.com/here","caption":"","quiet":true,"moduleStyle":"rounded","eyeStyle":"square","logo":"star","ink":"ink"}},
    {"type":"kicker","x":24,"y":332,"w":252,"h":16,"p":{"text":"QUÉT KHI ĐẾN · SCAN ON ARRIVAL","ink":"ink","align":"center","fontSize":9}},
    {"type":"footer","x":24,"y":360,"w":250,"h":48,"p":{"showQR":false}}
  ]},
  { id:"qr-hub-a6", name:"What’s on — A6", group:"QR standee", size:"a6", orient:"portrait", accent:"purple", els:[
    {"type":"block","x":-12,"y":-12,"w":322,"h":364,"p":{"fill":"purple"}},
    {"type":"dotfield","x":-12,"y":166,"w":322,"h":162,"p":{"fill":"pink","bg":"none","dot":11,"gap":9,"shape":"circle","grad":"down","ramp":0.8}},
    {"type":"kicker","x":24,"y":24,"w":252,"h":16,"p":{"text":"30+ SỰ KIỆN MỖI TUẦN","ink":"white","align":"left","fontSize":9}},
    {"type":"headline","x":24,"y":44,"w":252,"h":116,"p":{"text":"WHAT’S\nON","fontSize":54,"align":"left","weight":800,"ink":"white","leading":0.9,"echo":true,"echoAccent":"amber","echoDx":5,"echoDy":5}},
    {"type":"qr","x":74,"y":178,"w":150,"h":150,"p":{"data":"https://app.realitydn.com","caption":"","quiet":true,"moduleStyle":"rounded","eyeStyle":"square","logo":"star","ink":"ink"}},
    {"type":"kicker","x":24,"y":332,"w":252,"h":16,"p":{"text":"LỊCH TRỰC TIẾP · THE LIVE LIST","ink":"white","align":"center","fontSize":9}},
    {"type":"footer","x":24,"y":360,"w":250,"h":48,"p":{"showQR":false}}
  ]},
  { id:"qr-app-a6", name:"The app — A6", group:"QR standee", size:"a6", orient:"portrait", accent:"blue", els:[
    {"type":"block","x":-12,"y":-12,"w":322,"h":364,"p":{"fill":"blue"}},
    {"type":"block","x":-30,"y":-80,"w":360,"h":250,"p":{"fill":"pink","rot":-7}},
    {"type":"kicker","x":24,"y":22,"w":252,"h":16,"p":{"text":"MỌI THỨ Ở MỘT NƠI · ALL IN ONE","ink":"white","align":"left","fontSize":9}},
    {"type":"headline","x":24,"y":44,"w":252,"h":112,"p":{"text":"THE\nAPP","fontSize":64,"align":"left","weight":800,"ink":"white","leading":0.86}},
    {"type":"qr","x":74,"y":192,"w":150,"h":150,"p":{"data":"https://app.realitydn.com","caption":"","quiet":true,"moduleStyle":"rounded","eyeStyle":"square","logo":"star","ink":"ink"}},
    {"type":"footer","x":24,"y":360,"w":250,"h":48,"p":{"showQR":false}}
  ]},
  { id:"qr-tonight-a6", name:"Tonight — A6", group:"QR standee", size:"a6", orient:"portrait", accent:"red", els:[
    {"type":"block","x":-12,"y":-12,"w":322,"h":360,"p":{"fill":"red"}},
    {"type":"block","x":-12,"y":-12,"w":322,"h":38,"p":{"fill":"ink"}},
    {"type":"marquee","x":-12,"y":0,"w":322,"h":26,"p":{"text":"MỖI TỐI · EVERY NIGHT","sep":"★","surface":"none","ink":"white","fontSize":11}},
    {"type":"headline","x":24,"y":44,"w":252,"h":100,"p":{"text":"TỐI NAY\nTONIGHT","fontSize":44,"align":"left","weight":800,"ink":"white","leading":0.94}},
    {"type":"kicker","x":24,"y":152,"w":252,"h":16,"p":{"text":"CẢ LỊCH TỐI NAY · THE WHOLE NIGHT","ink":"white","align":"left","fontSize":9}},
    {"type":"qr","x":79,"y":176,"w":140,"h":140,"p":{"data":"https://app.realitydn.com","caption":"","quiet":true,"moduleStyle":"rounded","eyeStyle":"square","logo":"star","ink":"ink"}},
    {"type":"marquee","x":-12,"y":322,"w":322,"h":26,"p":{"text":"QUÉT · SCAN","sep":"★","surface":"solid","fontSize":11}},
    {"type":"footer","x":24,"y":358,"w":250,"h":48,"p":{"showQR":false}}
  ]},
  { id:"qr-menu-a6", name:"Menu — table card", group:"QR standee", size:"a6", orient:"portrait", accent:"pink", els:[
    {"type":"block","x":-12,"y":-12,"w":322,"h":444,"p":{"fill":"pink"}},
    {"type":"kicker","x":18,"y":26,"w":264,"h":16,"p":{"text":"THỰC ĐƠN · DRINKS + FOOD","ink":"white","align":"center","fontSize":9}},
    {"type":"headline","x":18,"y":46,"w":264,"h":78,"p":{"text":"MENU","fontSize":72,"align":"center","weight":800,"ink":"white"}},
    {"type":"block","x":18,"y":134,"w":264,"h":268,"p":{"fill":"white"}},
    {"type":"qr","x":79,"y":154,"w":140,"h":140,"p":{"data":"https://app.realitydn.com/menu","caption":"","quiet":true,"moduleStyle":"rounded","eyeStyle":"square","logo":"star","ink":"ink"}},
    {"type":"kicker","x":36,"y":302,"w":228,"h":16,"p":{"text":"QUÉT ĐỂ XEM · SCAN THE LIST","ink":"pink","align":"center","fontSize":9}},
    {"type":"footer","x":36,"y":334,"w":228,"h":46,"p":{"showQR":false}}
  ]},
  { id:"qr-review-a6", name:"Leave a review", group:"QR standee", size:"a6", orient:"portrait", accent:"amber", els:[
    {"type":"block","x":-12,"y":-12,"w":322,"h":364,"p":{"fill":"amber"}},
    {"type":"kicker","x":24,"y":22,"w":252,"h":16,"p":{"text":"CẢM ƠN · THANK YOU","ink":"ink","align":"left","fontSize":9}},
    {"type":"headline","x":24,"y":42,"w":252,"h":98,"p":{"text":"LEAVE\nA ★","fontSize":52,"align":"left","weight":800,"ink":"ink","leading":0.9}},
    {"type":"kicker","x":24,"y":148,"w":252,"h":16,"p":{"text":"30 GIÂY THÔI · THIRTY SECONDS","ink":"ink","align":"left","fontSize":9}},
    {"type":"burst","x":61,"y":170,"w":176,"h":176,"p":{"fill":"red","rays":20,"hub":0}},
    {"type":"qr","x":93,"y":202,"w":112,"h":112,"p":{"data":"https://maps.app.goo.gl/mRQfWUwx3nXT5vsn7","caption":"","quiet":true,"moduleStyle":"rounded","eyeStyle":"square","logo":"star","ink":"ink"}},
    {"type":"footer","x":24,"y":360,"w":250,"h":48,"p":{"showQR":false}}
  ]},
  { id:"qr-checkin-a5", name:"Check in — A5 standee", group:"QR standee", size:"a5", orient:"portrait", accent:"green", els:[
    {"type":"block","x":-12,"y":-12,"w":444,"h":512,"p":{"fill":"green"}},
    {"type":"kicker","x":36,"y":40,"w":348,"h":20,"p":{"text":"MỖI TỐI · EVERY NIGHT","ink":"ink","align":"left"}},
    {"type":"headline","x":36,"y":68,"w":348,"h":162,"p":{"text":"CHECK\nIN","fontSize":86,"align":"left","weight":800,"ink":"ink","leading":0.88,"echo":true,"echoAccent":"purple","echoDx":7,"echoDy":7}},
    {"type":"qr","x":110,"y":252,"w":200,"h":200,"p":{"data":"https://app.realitydn.com/here","caption":"","quiet":true,"moduleStyle":"rounded","eyeStyle":"square","logo":"star","ink":"ink"}},
    {"type":"kicker","x":36,"y":466,"w":348,"h":20,"p":{"text":"QUÉT KHI ĐẾN · SCAN ON ARRIVAL","ink":"ink","align":"center"}},
    {"type":"footer","x":36,"y":512,"w":348,"h":60,"p":{"showQR":false}}
  ]},
  { id:"qr-hub-a5", name:"What’s on — A5 standee", group:"QR standee", size:"a5", orient:"portrait", accent:"purple", els:[
    {"type":"block","x":-12,"y":-12,"w":444,"h":512,"p":{"fill":"purple"}},
    {"type":"dotfield","x":-12,"y":236,"w":444,"h":226,"p":{"fill":"pink","bg":"none","dot":13,"gap":11,"shape":"circle","grad":"down","ramp":0.8}},
    {"type":"kicker","x":36,"y":40,"w":348,"h":20,"p":{"text":"30+ SỰ KIỆN MỖI TUẦN","ink":"white","align":"left"}},
    {"type":"headline","x":36,"y":68,"w":348,"h":162,"p":{"text":"WHAT’S\nON","fontSize":74,"align":"left","weight":800,"ink":"white","leading":0.9,"echo":true,"echoAccent":"amber","echoDx":7,"echoDy":7}},
    {"type":"qr","x":110,"y":252,"w":200,"h":200,"p":{"data":"https://app.realitydn.com","caption":"","quiet":true,"moduleStyle":"rounded","eyeStyle":"square","logo":"star","ink":"ink"}},
    {"type":"kicker","x":36,"y":466,"w":348,"h":20,"p":{"text":"LỊCH TRỰC TIẾP · THE LIVE LIST","ink":"white","align":"center"}},
    {"type":"footer","x":36,"y":512,"w":348,"h":60,"p":{"showQR":false}}
  ]},

  /* ---- WAYFINDING · far register. Read across a room, so caps throughout and
     the arrow label sits on the signage rung. The header bands here (and the
     happy-hour board's, and the drinks board's marquee) used to stop exactly
     ON the trim at x:0 — a flood that doesn't bleed, which the preflight now
     flags. They run -12 / +12 past it like the standees'. ---- */
  { id:"way-toilets-a5", name:"Toilets", group:"Wayfinding", size:"a5", orient:"portrait", accent:"amber", els:[
    {"type":"block","x":-12,"y":-12,"w":444,"h":162,"p":{"fill":"amber"}},
    {"type":"kicker","x":36,"y":40,"w":348,"h":20,"p":{"text":"NHÀ VỆ SINH","ink":"ink","align":"center"}},
    {"type":"headline","x":30,"y":64,"w":360,"h":72,"p":{"text":"TOILETS","weight":800,"fontSize":54,"ink":"ink","align":"center"}},
    {"type":"arrow","x":110,"y":200,"w":200,"h":180,"p":{"dir":"down","label":"","ink":"amber"}},
    {"type":"body","x":44,"y":404,"w":332,"h":48,"p":{"text":"Down the stairs, second door on the left. Shared, all genders.","align":"center","fontSize":13,"leading":1.34}},
    {"type":"footer","x":36,"y":505,"w":348,"h":64,"p":{"showQR":false}}
  ]},
  { id:"way-rooftop-a4", name:"Rooftop upstairs", group:"Wayfinding", size:"a4", orient:"portrait", accent:"red", els:[
    {"type":"block","x":-12,"y":-12,"w":619,"h":242,"p":{"fill":"red"}},
    {"type":"kicker","x":44,"y":62,"w":507,"h":22,"p":{"text":"TẦNG THƯỢNG","ink":"ink","align":"center"}},
    {"type":"headline","x":44,"y":92,"w":507,"h":118,"p":{"text":"ROOFTOP\nUPSTAIRS","weight":800,"fontSize":60,"ink":"ink","align":"center","leading":0.92}},
    {"type":"arrow","x":198,"y":290,"w":200,"h":210,"p":{"dir":"up","label":"","ink":"red"}},
    {"type":"body","x":74,"y":528,"w":447,"h":54,"p":{"text":"Third floor — the bar, the patio and most of the live music.\nTầng 3 — quầy bar, sân thượng và nhạc sống.","align":"center","fontSize":15,"leading":1.34}},
    {"type":"footer","x":44,"y":740,"w":507,"h":66,"p":{"showQR":false}}
  ]},
  { id:"way-hours-a5", name:"Opening hours", group:"Wayfinding", size:"a5", orient:"portrait", accent:"green", els:[
    {"type":"kicker","x":34,"y":48,"w":352,"h":22,"p":{"text":"REALITY · ĐÀ NẴNG","align":"center","ink":"green"}},
    {"type":"headline","x":30,"y":78,"w":360,"h":66,"p":{"text":"GIỜ MỞ CỬA","fontSize":38,"align":"center","weight":800}},
    {"type":"rule","x":150,"y":158,"w":120,"h":4,"p":{"fill":"green","weight":4}},
    {"type":"pricelist","x":64,"y":200,"w":292,"h":230,"p":{"heading":"","upper":false,"rowSize":"l","dotLeader":true,"items":[
      {"l":"Thứ 2 – Thứ 5","p":"08:00 – 24:00"},
      {"l":"Thứ 6 – Thứ 7","p":"08:00 – muộn"},
      {"l":"Chủ nhật","p":"09:00 – 23:00"},
      {"l":"Bếp đóng","p":"22:00"}]}},
    {"type":"body","x":44,"y":444,"w":332,"h":40,"p":{"text":"Last call 30 minutes before close.","align":"center","fontSize":13}},
    {"type":"footer","x":36,"y":505,"w":348,"h":64,"p":{"showQR":false}}
  ]},
  { id:"way-house-rules-a4", name:"House rules", group:"Wayfinding", size:"a4", orient:"portrait", accent:"blue", els:[
    {"type":"kicker","x":44,"y":62,"w":507,"h":22,"p":{"text":"REALITY · HOUSE RULES","align":"center","ink":"blue"}},
    {"type":"headline","x":44,"y":92,"w":507,"h":112,"p":{"text":"BE GOOD TO\nEACH OTHER","fontSize":54,"align":"center","weight":800,"leading":0.92}},
    {"type":"rule","x":248,"y":222,"w":100,"h":4,"p":{"fill":"blue","weight":4}},
    {"type":"pricelist","x":88,"y":268,"w":419,"h":195,"p":{"heading":"","listStyle":"bulleted","upper":false,"rowSize":"l","marker":"—","markerColor":"blue","items":[
      {"l":"Everyone is welcome here. Behave like it.","p":""},
      {"l":"Ask before you photograph anyone.","p":""},
      {"l":"Order something if you're using the space.","p":""},
      {"l":"Keep the rooftop quiet after 22:00.","p":""},
      {"l":"Tell a staff member if anything is off.","p":""}]}},
    {"type":"body","x":88,"y":496,"w":419,"h":76,"p":{"text":"Mọi người đều được chào đón. Hãy hỏi trước khi chụp ảnh người khác, gọi món nếu bạn dùng không gian, và giữ yên tĩnh trên sân thượng sau 22:00.","align":"center","fontSize":13,"leading":1.4}},
    {"type":"footer","x":44,"y":740,"w":507,"h":66,"p":{"showQR":true,"qrData":"https://app.realitydn.com"}}
  ]},

  /* ---- MENUS · NEAR register (canon M2 names a printed menu). Headings and
     item names are sentence case; prices are Grotesk facts with tabular
     figures, so a dot-leader column lines up. ---- */
  { id:"menu-drinks-a4", name:"Drinks — A4 board", group:"Menus", size:"a4", orient:"portrait", accent:"pink", els:[
    {"type":"kicker","x":44,"y":44,"w":507,"h":20,"p":{"text":"REALITY · BAR · CAFÉ · ĐÀ NẴNG","ink":"pink","align":"center"}},
    {"type":"headline","x":44,"y":70,"w":507,"h":72,"p":{"text":"Drinks","weight":800,"fontSize":56,"align":"center","upper":false}},
    {"type":"rule","x":44,"y":152,"w":507,"h":10,"p":{"weight":3,"fill":"ink","pattern":"solid"}},
    {"type":"pricelist","x":44,"y":186,"w":507,"h":152,"p":{"heading":"Cocktails","upper":false,"cols":2,"rowSize":"m","dotLeader":true,"items":[
      {"l":"Gin tonic","p":"85k"},{"l":"Negroni","p":"110k"},{"l":"Whisky sour","p":"105k"},
      {"l":"Yuzu gimlet","p":"95k"},{"l":"Espresso martini","p":"110k"},{"l":"Long Island","p":"120k"}]}},
    {"type":"pricelist","x":44,"y":352,"w":507,"h":124,"p":{"heading":"Beer & cider","upper":false,"cols":2,"rowSize":"m","dotLeader":true,"items":[
      {"l":"Draft lager","p":"45k"},{"l":"Draft IPA","p":"55k"},
      {"l":"Cider bottle","p":"60k"},{"l":"Stout can","p":"65k"}]}},
    {"type":"pricelist","x":44,"y":490,"w":507,"h":124,"p":{"heading":"No & low","upper":false,"cols":2,"rowSize":"m","dotLeader":true,"items":[
      {"l":"Soda chanh","p":"40k"},{"l":"Cold brew tonic","p":"50k"},
      {"l":"Kombucha","p":"55k"},{"l":"Juice of the day","p":"45k"}]}},
    {"type":"marquee","x":-12,"y":636,"w":619,"h":36,"p":{"text":"HAPPY HOUR 16–19","sep":"★","surface":"solid","fill":"pink","fontSize":14}},
    {"type":"body","x":44,"y":690,"w":507,"h":30,"p":{"text":"Prices in nghìn đồng. Ask the bar what's fresh — hỏi quầy bar món hôm nay.","align":"center","fontSize":12}},
    {"type":"footer","x":44,"y":748,"w":507,"h":66,"p":{"showQR":true,"qrData":"https://app.realitydn.com/menu"}}
  ]},
  { id:"menu-coffee-a5", name:"Cà phê — coffee card", group:"Menus", size:"a5", orient:"portrait", accent:"amber", els:[
    {"type":"icon","x":186,"y":40,"w":48,"h":48,"p":{"kind":"coffee","ink":"amber"}},
    {"type":"headline","x":34,"y":100,"w":352,"h":52,"p":{"text":"Cà phê","weight":800,"fontSize":40,"align":"center","upper":false}},
    {"type":"kicker","x":34,"y":156,"w":352,"h":20,"p":{"text":"RANG TẠI ĐÀ NẴNG · ROASTED HERE","ink":"amber","align":"center","fontSize":9}},
    {"type":"pricelist","x":58,"y":204,"w":304,"h":180,"p":{"heading":"Đen & sữa","upper":false,"rowSize":"m","dotLeader":true,"items":[
      {"l":"Cà phê đen","p":"25k"},{"l":"Cà phê sữa","p":"30k"},
      {"l":"Bạc xỉu","p":"35k"},{"l":"Cà phê muối","p":"40k"}]}},
    {"type":"pricelist","x":58,"y":396,"w":304,"h":140,"p":{"heading":"Espresso bar","upper":false,"rowSize":"m","dotLeader":true,"items":[
      {"l":"Espresso","p":"35k"},{"l":"Flat white","p":"50k"},
      {"l":"Cold brew","p":"55k"}]}},
    {"type":"footer","x":34,"y":520,"w":352,"h":62,"p":{"showQR":false}}
  ]},
  { id:"menu-happyhour-a3", name:"Happy hour — big board", group:"Menus", size:"a3", orient:"portrait", accent:"red", els:[
    {"type":"block","x":-12,"y":-12,"w":866,"h":312,"p":{"fill":"red"}},
    {"type":"kicker","x":62,"y":92,"w":718,"h":26,"p":{"text":"MỖI NGÀY · EVERY DAY","ink":"ink","align":"center"}},
    {"type":"headline","x":62,"y":128,"w":718,"h":148,"p":{"text":"HAPPY\nHOUR","weight":800,"fontSize":92,"ink":"ink","align":"center","leading":0.9}},
    {"type":"bignum","x":221,"y":350,"w":400,"h":130,"p":{"text":"16–19","fontSize":96,"align":"center","weight":800}},
    {"type":"pricelist","x":141,"y":540,"w":560,"h":340,"p":{"heading":"Half price all night","upper":false,"rowSize":"xxl","dotLeader":true,"items":[
      {"l":"House pour","p":"50k"},{"l":"Draft beer","p":"45k"},
      {"l":"Highball","p":"65k"},{"l":"Glass of wine","p":"70k"}]}},
    {"type":"body","x":141,"y":930,"w":560,"h":50,"p":{"text":"Every day from four until seven. Giá đã bao gồm thuế.","align":"center","fontSize":18,"leading":1.34}},
    {"type":"footer","x":62,"y":1062,"w":718,"h":80,"p":{"showQR":true,"qrData":"https://app.realitydn.com/menu"}}
  ]},
  { id:"menu-table-a6", name:"Table card — tonight", group:"Menus", size:"a6", orient:"portrait", accent:"green", els:[
    {"type":"kicker","x":24,"y":28,"w":250,"h":18,"p":{"text":"TỐI NAY · TONIGHT","ink":"green","align":"center","fontSize":9}},
    {"type":"headline","x":24,"y":50,"w":250,"h":36,"p":{"text":"On the bar","fontSize":26,"align":"center","weight":800,"upper":false}},
    {"type":"rule","x":114,"y":94,"w":70,"h":4,"p":{"fill":"green","weight":3}},
    {"type":"pricelist","x":34,"y":116,"w":230,"h":180,"p":{"heading":"","upper":false,"rowSize":"m","dotLeader":true,"items":[
      {"l":"House pour","p":"50k"},{"l":"Draft beer","p":"45k"},
      {"l":"Cà phê muối","p":"40k"},{"l":"Soda chanh","p":"40k"}]}},
    {"type":"body","x":30,"y":300,"w":238,"h":32,"p":{"text":"Full menu on the card by the till, or scan below.","align":"center","fontSize":10,"leading":1.3}},
    {"type":"footer","x":24,"y":344,"w":250,"h":52,"p":{"showQR":true,"qrData":"https://app.realitydn.com/menu"}}
  ]},
];

function buildTemplate(tpl){
  const elements = (tpl.els||[]).map(s=>{
    const el = makeElement(s.type, s.x|0, s.y|0);
    if(s.w!=null) el.w=s.w; if(s.h!=null) el.h=s.h;
    if(s.p) Object.assign(el, JSON.parse(JSON.stringify(s.p)));
    return el;
  });
  return { elements, size: tpl.size||'a5', orient: tpl.orient||'portrait', accent: (tpl.accent && ACCENTS.indexOf(tpl.accent)>=0)?tpl.accent:'pink' };
}

export { TEMPLATE_GROUPS, TEMPLATES, buildTemplate };
