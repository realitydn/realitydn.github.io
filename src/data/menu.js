// REALITY menu — v1.7, Summer 2026.
// Source of truth for the on-site menu (rendered by components/MenuSection.jsx).
//
// Item shape: { nameEN, nameVI, tagEN, tagVI, descEN, descVI, price }
//   tagEN/tagVI — short voice line shown above the ingredients (cocktails +
//                 zero-proof). Rendered italic. Optional.
//   descEN/descVI — ingredients / factual line, rendered gray. Optional.
//   price        — number-as-string, rendered with a "k" suffix ("160" → "160k").
//
// VI ingredient lines are direct translations; VI taglines are translated from
// the English menu voice and are the most subjective part — tweak to taste.
export const MENU = [
  {
    key: 'cocktails',
    labelEN: 'Cocktails',
    labelVI: 'Cocktails',
    sections: [
      {
        labelEN: 'Classic',
        labelVI: 'Cổ điển',
        items: [
          { nameEN: 'Whiskey Sour', nameVI: 'Whiskey Sour', tagEN: "An important source of protein, and whiskey.", tagVI: "Một nguồn cung cấp protein quan trọng, và whiskey.", descEN: 'Jim Beam Black, Angostura, lemon, eggwhite.', descVI: 'Jim Beam Black, Angostura, chanh, lòng trắng trứng.', price: '160' },
          { nameEN: 'Cuba Libre', nameVI: 'Cuba Libre', tagEN: "The original Rum + Coke, done correct.", tagVI: "Rum + Coke nguyên bản, pha đúng điệu.", descEN: 'Havana 3y, Coca-Cola, lime.', descVI: 'Havana 3y, Coca-Cola, chanh.', price: '95' },
          { nameEN: 'Old-Fashioned', nameVI: 'Old-Fashioned', tagEN: "For when you're feeling too little or too much.", tagVI: "Cho những lúc bạn thấy thiếu thốn hay dư thừa.", descEN: 'Jim Beam Black, Angostura, citrus oil.', descVI: 'Jim Beam Black, Angostura, tinh dầu cam chanh.', price: '145' },
          { nameEN: 'Long Island Iced Tea', nameVI: 'Long Island Iced Tea', tagEN: "For getting real fucked up real quick.", tagVI: "Để say thật nhanh, thật tới.", descEN: 'All the alcohols + a splash of Coca-Cola.', descVI: 'Tất cả các loại rượu + chút Coca-Cola.', price: '180' },
          { nameEN: 'Mojito', nameVI: 'Mojito', tagEN: "Classic cocktail that also freshens breath.", tagVI: "Cocktail cổ điển mà còn thơm miệng.", descEN: 'Havana 3y, lime, mint, soda.', descVI: 'Havana 3y, chanh, bạc hà, soda.', price: '125' },
          { nameEN: 'Negroni', nameVI: 'Negroni', tagEN: "The anytime drink for every reason.", tagVI: "Ly cho mọi lúc, mọi lý do.", descEN: 'Tanqueray Dry, Campari, Dolin Rouge.', descVI: 'Tanqueray Dry, Campari, Dolin Rouge.', price: '165' },
          { nameEN: 'Espresso Martini', nameVI: 'Espresso Martini', tagEN: "Knock it back for a pick me up.", tagVI: "Làm một ngụm cho tỉnh táo.", descEN: 'Absolut, Kahlua, phin coffee.', descVI: 'Absolut, Kahlua, cà phê phin.', price: '140' },
        ]
      },
      {
        labelEN: 'Signature',
        labelVI: 'Đặc trưng',
        items: [
          { nameEN: 'Daydream', nameVI: 'Daydream', tagEN: "Sweet as you.", tagVI: "Ngọt như em.", descEN: 'Absolut, Galliano Vanilla, passion fruit, mango, lime, eggwhite.', descVI: 'Absolut, Galliano Vanilla, chanh dây, xoài, chanh, lòng trắng trứng.', price: '150' },
          { nameEN: 'Lavender Margarita', nameVI: 'Lavender Margarita', tagEN: "For floating through the party.", tagVI: "Để lửng lơ trôi giữa bữa tiệc.", descEN: 'Jose Cuervo Silver, Cointreau, lime, pepper, lavender.', descVI: 'Jose Cuervo Silver, Cointreau, chanh, tiêu, oải hương.', price: '140' },
          { nameEN: 'Virtual Reality', nameVI: 'Virtual Reality', tagEN: "The previously undiscovered heart of Central Việt Nam.", tagVI: "Trái tim chưa từng được khám phá của miền Trung Việt Nam.", descEN: 'Pandan-infused Havana 3y, coconut, tofu, lime.', descVI: 'Havana 3y ngâm lá dứa, dừa, đậu phụ, chanh.', price: '135' },
          { nameEN: 'Le Botanique', nameVI: 'Le Botanique', tagEN: "Extremely refined, inconceivably tasteful.", tagVI: "Cực kỳ tinh tế, sang trọng khó tả.", descEN: 'Jasmine-infused Tanqueray Dry, lavender, aloe vera, lime, whey.', descVI: 'Tanqueray Dry ngâm hoa nhài, oải hương, nha đam, chanh, whey.', price: '160' },
          { nameEN: 'Mỹan Colada', nameVI: 'Mỹan Colada', tagEN: "The tropical classic adapted to Đà Nẵng by Thiên.", tagVI: "Món nhiệt đới cổ điển được Thiên biến tấu cho Đà Nẵng.", descEN: 'Absolut, Cointreau, coconut, cream, lime.', descVI: 'Absolut, Cointreau, dừa, kem, chanh.', price: '140' },
          { nameEN: 'La Diablita', nameVI: 'La Diablita', tagEN: "Spicy + invigorating, created by Khoa.", tagVI: "Cay nồng + sảng khoái, sáng tạo bởi Khoa.", descEN: 'Lime-pepper Jose Silver, ginger, orgeat, lime, raw wild honey.', descVI: 'Jose Silver ngâm chanh-tiêu, gừng, orgeat, chanh, mật ong rừng.', price: '155' },
        ]
      },
      {
        labelEN: 'Reserve',
        labelVI: 'Cao cấp',
        items: [
          { nameEN: 'Surrealism', nameVI: 'Surrealism', tagEN: "Smoke your mind.", tagVI: "Hun khói tâm trí bạn.", descEN: 'Creyente mezcal, Palo Santo, aloe vera.', descVI: 'Creyente mezcal, Palo Santo, nha đam.', price: '250' },
          { nameEN: 'Penicillin', nameVI: 'Penicillin', tagEN: "The cure for the common life.", tagVI: "Liều thuốc chữa cuộc sống tẻ nhạt.", descEN: 'Monkey Shoulder, Laphroaig 10 single-malt, lime, ginger, Angostura.', descVI: 'Monkey Shoulder, Laphroaig 10 single-malt, chanh, gừng, Angostura.', price: '280' },
          { nameEN: 'Clockwork Orange', nameVI: 'Clockwork Orange', tagEN: "Dedicated to Generous Ben Nappez.", tagVI: "Dành tặng Generous Ben Nappez.", descEN: 'Havana 7y, Jim Beam Black, Cointreau, cinnamon, almond, ginger, lime.', descVI: 'Havana 7y, Jim Beam Black, Cointreau, quế, hạnh nhân, gừng, chanh.', price: '180' },
        ]
      },
      {
        labelEN: 'Gin + Tonic',
        labelVI: 'Gin + Tonic',
        items: [
          { nameEN: 'w/ TA Gin', nameVI: 'với TA Gin', price: '90' },
          { nameEN: 'w/ House-Infused TA Gin', nameVI: 'với TA Gin tự ngâm', price: '105' },
          { nameEN: 'w/ Tanqueray', nameVI: 'với Tanqueray', price: '120' },
          { nameEN: 'w/ Roku', nameVI: 'với Roku', price: '150' },
          { nameEN: "w/ Hendrick's", nameVI: "với Hendrick's", price: '180' },
        ]
      },
      {
        labelEN: 'Drops',
        labelVI: 'Drops',
        items: [
          { nameEN: 'Jaegerbomb', nameVI: 'Jaegerbomb', descEN: 'Shot of Jaegermeister + Red Bull.', descVI: 'Shot Jaegermeister + Red Bull.', price: '100' },
          { nameEN: 'Sojubomb', nameVI: 'Sojubomb', descEN: 'Shot of soju + Tiger Beer.', descVI: 'Shot soju + bia Tiger.', price: '70' },
          { nameEN: 'Danangbomb', nameVI: 'Danangbomb', descEN: 'Shot of FAR rượu mơ + Big Huda.', descVI: 'Shot FAR rượu mơ + Big Huda.', price: '95' },
          { nameEN: 'Parteabomb', nameVI: 'Parteabomb', descEN: 'Shot Jose Tequila + Mixtape Partea Green.', descVI: 'Shot Jose Tequila + Mixtape Partea Green.', price: '150' },
          { nameEN: 'Firebomb', nameVI: 'Firebomb', descEN: 'Cinnamon-infused Jim / Havana 7y / Cointreau + Red Bull.', descVI: 'Jim / Havana 7y / Cointreau ngâm quế + Red Bull.', price: '150' },
        ]
      },
    ]
  },
  {
    key: 'spirits',
    labelEN: 'Spirits',
    labelVI: 'Rượu mạnh',
    sections: [
      {
        labelEN: 'Shots (30ml)',
        labelVI: 'Shot (30ml)',
        items: [
          { nameEN: 'Far Rượu Mơ', nameVI: 'Far Rượu Mơ', price: '60' },
          { nameEN: 'Jose Cuervo Silver Tequila', nameVI: 'Jose Cuervo Silver Tequila', price: '75' },
          { nameEN: 'Lunazul Blanco Tequila', nameVI: 'Lunazul Blanco Tequila', price: '95' },
          { nameEN: 'Lunazul Añejo Tequila', nameVI: 'Lunazul Añejo Tequila', price: '125' },
          { nameEN: 'Creyente Mezcal', nameVI: 'Creyente Mezcal', price: '150' },
          { nameEN: "Bailey's Irish Cream", nameVI: "Bailey's Irish Cream", price: '70' },
          { nameEN: 'Jaegermeister', nameVI: 'Jaegermeister', price: '75' },
          { nameEN: 'St. Remy XO Brandy', nameVI: 'St. Remy XO Brandy', price: '85' },
          { nameEN: 'Fernet Branca', nameVI: 'Fernet Branca', price: '130' },
          { nameEN: "Bartender's Feelings", nameVI: "Bartender's Feelings", descEN: '4 shots.', descVI: '4 shot.', price: '220' },
        ]
      },
      {
        labelEN: 'Pours (45ml)',
        labelVI: 'Rượu rót (45ml)',
        items: [
          { nameEN: 'Havana 3y', nameVI: 'Havana 3y', descEN: 'Rum.', descVI: 'Rum.', price: '95' },
          { nameEN: 'Havana 7y', nameVI: 'Havana 7y', descEN: 'Rum.', descVI: 'Rum.', price: '135' },
          { nameEN: 'Absolut Original', nameVI: 'Absolut Original', descEN: 'Vodka.', descVI: 'Vodka.', price: '95' },
          { nameEN: 'Żubrówka', nameVI: 'Żubrówka', descEN: 'Vodka.', descVI: 'Vodka.', price: '105' },
          { nameEN: 'Grey Goose', nameVI: 'Grey Goose', descEN: 'Vodka.', descVI: 'Vodka.', price: '180' },
          { nameEN: 'Jose Cuervo Silver', nameVI: 'Jose Cuervo Silver', descEN: 'Tequila.', descVI: 'Tequila.', price: '105' },
          { nameEN: 'Lunazul Blanco', nameVI: 'Lunazul Blanco', descEN: 'Tequila.', descVI: 'Tequila.', price: '135' },
          { nameEN: 'Lunazul Añejo', nameVI: 'Lunazul Añejo', descEN: 'Tequila.', descVI: 'Tequila.', price: '175' },
          { nameEN: 'Creyente', nameVI: 'Creyente', descEN: 'Mezcal.', descVI: 'Mezcal.', price: '215' },
          { nameEN: 'St. Remy XO', nameVI: 'St. Remy XO', descEN: 'Brandy.', descVI: 'Brandy.', price: '125' },
          { nameEN: 'Jameson Whiskey', nameVI: 'Jameson Whiskey', descEN: 'Ireland.', descVI: 'Ai-len.', price: '105' },
          { nameEN: 'Jim Beam Black Bourbon', nameVI: 'Jim Beam Black Bourbon', descEN: 'USA.', descVI: 'Mỹ.', price: '105' },
          { nameEN: "Jack Daniel's Whiskey", nameVI: "Jack Daniel's Whiskey", descEN: 'USA.', descVI: 'Mỹ.', price: '125' },
          { nameEN: 'Monkey Shoulder Scotch', nameVI: 'Monkey Shoulder Scotch', descEN: 'Scotland.', descVI: 'Scotland.', price: '180' },
          { nameEN: 'Laphroaig 10 Single-Malt', nameVI: 'Laphroaig 10 Single-Malt', descEN: 'Scotland.', descVI: 'Scotland.', price: '250' },
        ]
      },
    ]
  },
  {
    key: 'beerwine',
    labelEN: 'Beer & Wine',
    labelVI: 'Bia & Rượu vang',
    sections: [
      {
        labelEN: 'Beer / Etc.',
        labelVI: 'Bia / v.v.',
        items: [
          { nameEN: 'Mixtape Peaches + Cream', nameVI: 'Mixtape Peaches + Cream', descEN: 'MixTape Beverage Co., HCMC. West-Coast IPA, 6.9% abv.', descVI: 'MixTape Beverage Co., TP.HCM. West-Coast IPA, 6.9% abv.', price: '130' },
          { nameEN: 'Mixtape Molly', nameVI: 'Mixtape Molly', descEN: 'MixTape Beverage Co., HCMC. Milk Stout, 4.4% abv.', descVI: 'MixTape Beverage Co., TP.HCM. Milk Stout, 4.4% abv.', price: '135' },
          { nameEN: "Kurtz's Insane IPA", nameVI: "Kurtz's Insane IPA", descEN: 'Heart of Darkness, HCMC. Hop-head IPA, 102 IBU, 7.1% abv.', descVI: 'Heart of Darkness, TP.HCM. IPA nhiều hoa bia, 102 IBU, 7.1% abv.', price: '125' },
          { nameEN: 'Tiger', nameVI: 'Tiger', descEN: 'International pale lager originally from Singapore. 5.0% abv.', descVI: 'Lager nhạt quốc tế, gốc từ Singapore. 5.0% abv.', price: '40' },
          { nameEN: 'Big Huda', nameVI: 'Big Huda', descEN: 'Pale lager from Carlsberg-owned Hue Brewery, Huế. 4.7% abv.', descVI: 'Lager nhạt từ Nhà máy bia Huế (thuộc Carlsberg), Huế. 4.7% abv.', price: '45' },
          { nameEN: 'Strongbow Golden Apple', nameVI: 'Strongbow Golden Apple', descEN: "UK's best-selling cider brand. Gluten-free. 4.5% abv.", descVI: 'Hãng cider bán chạy nhất nước Anh. Không gluten. 4.5% abv.', price: '75' },
          { nameEN: 'Soju Jinro Original', nameVI: 'Soju Jinro Original', descEN: 'A fixture of Korean drinking for over 100 years. 360 ml, ~18% abv.', descVI: 'Biểu tượng của văn hóa nhậu Hàn Quốc hơn 100 năm. 360 ml, ~18% abv.', price: '170' },
          { nameEN: 'Mixtape Partea Red', nameVI: 'Mixtape Partea Red', descEN: 'Black tea, raspberry, pure ethanol. 4.20% abv.', descVI: 'Trà đen, mâm xôi, cồn nguyên chất. 4.20% abv.', price: '95' },
          { nameEN: 'Mixtape Partea Green', nameVI: 'Mixtape Partea Green', descEN: 'Green tea, lotus, lemon, pure ethanol. 4.20% abv.', descVI: 'Trà xanh, sen, chanh, cồn nguyên chất. 4.20% abv.', price: '95' },
        ]
      },
      {
        labelEN: 'Wine',
        labelVI: 'Rượu vang',
        items: [
          { nameEN: 'Sauvignon Blanc', nameVI: 'Sauvignon Blanc', descEN: 'Australian Sauvignon Blanc (Murray-Darling/Victoria), ~12% abv, fresh citrus and green fruit character. Woolshed; Australia. Bottle.', descVI: 'Sauvignon Blanc Úc (Murray-Darling/Victoria), ~12% abv, vị cam chanh tươi và trái cây xanh. Woolshed; Úc. Chai.', price: '575' },
          { nameEN: 'Blanc de Blancs Brut', nameVI: 'Blanc de Blancs Brut', descEN: 'French Blanc de Blancs Brut sparkling wine, ~12% abv, dry style. Maison Chevalier; France. Bottle.', descVI: 'Vang sủi Blanc de Blancs Brut Pháp, ~12% abv, vị khô. Maison Chevalier; Pháp. Chai.', price: '600' },
          { nameEN: 'Cabernet Sauvignon', nameVI: 'Cabernet Sauvignon', descEN: 'Australian Cabernet Sauvignon (South-Eastern Australia), ~13.5% abv, dry red wine. Bottle.', descVI: 'Cabernet Sauvignon Úc (Đông Nam nước Úc), ~13.5% abv, vang đỏ khô. Chai.', price: '575' },
        ]
      },
    ]
  },
  {
    key: 'coffee',
    labelEN: 'Coffee',
    labelVI: 'Cà phê',
    sections: [
      {
        labelEN: 'Phin',
        labelVI: 'Phin',
        items: [
          { nameEN: 'Salt Coffee', nameVI: 'Cà phê muối', price: '50' },
          { nameEN: 'Coconut Cream Coffee', nameVI: 'Cà phê kem dừa', price: '55' },
          { nameEN: 'Bạc Xỉu Coffee', nameVI: 'Bạc xỉu', descEN: 'hot/cold', descVI: 'nóng/đá', price: '45' },
          { nameEN: 'Black Coffee', nameVI: 'Cà phê đen', descEN: 'hot/cold', descVI: 'nóng/đá', price: '35' },
          { nameEN: 'White Coffee', nameVI: 'Cà phê nâu', descEN: 'hot/cold', descVI: 'nóng/đá', price: '40' },
          { nameEN: 'Oatmilk Honey Latte', nameVI: 'Latte yến mạch mật ong', descEN: 'hot/cold', descVI: 'nóng/đá', price: '55' },
        ]
      },
      {
        labelEN: 'Coldbrew',
        labelVI: 'Coldbrew',
        items: [
          { nameEN: 'Black Coldbrew', nameVI: 'Coldbrew đen', descEN: 'coffee + time', descVI: 'cà phê + thời gian', price: '45' },
          { nameEN: 'Mazagran', nameVI: 'Mazagran', descEN: '+ lemon, pomelo, tonic', descVI: '+ chanh, bưởi, tonic', price: '55' },
          { nameEN: 'Tropican', nameVI: 'Tropican', descEN: '+ mango, passionfruit, tonic', descVI: '+ xoài, chanh dây, tonic', price: '55' },
          { nameEN: 'Lavender', nameVI: 'Oải hương', descEN: '+ lavender, lime, soda', descVI: '+ oải hương, chanh, soda', price: '55' },
        ]
      },
    ]
  },
  {
    key: 'tea',
    labelEN: 'Tea & Cacao',
    labelVI: 'Trà & Ca cao',
    sections: [
      {
        labelEN: 'Hot Tea',
        labelVI: 'Trà nóng',
        items: [
          { nameEN: 'Matcha Latte or Salt Cream', nameVI: 'Matcha Latte hoặc Kem Muối', descEN: 'Japanese-origin, 100% natural matcha. Latte is available hot or cold, Salt Cream is served cold.', descVI: 'Matcha Nhật Bản, 100% tự nhiên. Latte có nóng hoặc đá, Kem Muối phục vụ đá.', price: '65' },
          { nameEN: 'Houjicha Latte or Salt Cream', nameVI: 'Houjicha Latte hoặc Kem Muối', descEN: 'Low-caffeine houjicha powder, made from roasted Sencha. Latte is available hot or cold, Salt Cream is served cold.', descVI: 'Bột houjicha ít caffeine, làm từ Sencha rang. Latte có nóng hoặc đá, Kem Muối phục vụ đá.', price: '60' },
          { nameEN: 'Oolong Tea', nameVI: 'Trà Ô Long', descEN: 'Blend of Vietnamese ôlong teas by Phúc Long, served hot.', descVI: 'Trà ô long Việt Nam pha trộn bởi Phúc Long, phục vụ nóng.', price: '45' },
        ]
      },
      {
        labelEN: 'Hot Herbal',
        labelVI: 'Trà thảo mộc nóng',
        items: [
          { nameEN: 'Daytripper', nameVI: 'Daytripper', descEN: 'A fascinating arrangement of chrysanthemum, longan, goji berry, jujube, lotus heart, and notoginseng buds. Served hot.', descVI: 'Sự kết hợp thú vị của hoa cúc, nhãn, kỷ tử, táo đỏ, tâm sen và nụ tam thất. Phục vụ nóng.', price: '55' },
          { nameEN: 'Sunshine', nameVI: 'Sunshine', descEN: 'A bright, fruit-forward herbal infusion of passion fruit, kumquat, and rock sugar. Served hot.', descVI: 'Trà thảo mộc tươi sáng, đậm vị trái cây với chanh dây, quất và đường phèn. Phục vụ nóng.', price: '50' },
          { nameEN: 'Honey Hibiscus Tea', nameVI: 'Trà atiso đỏ mật ong', descEN: 'Hibiscus blossoms + raw wild honey, served hot.', descVI: 'Hoa atiso đỏ + mật ong rừng, phục vụ nóng.', price: '45' },
          { nameEN: 'Fresh Ginger Tea', nameVI: 'Trà gừng tươi', descEN: 'One of the ultimate ginger experiences. Served hot.', descVI: 'Một trong những trải nghiệm gừng tuyệt vời nhất. Phục vụ nóng.', price: '45' },
          { nameEN: 'Fresh Mint Tea', nameVI: 'Trà bạc hà tươi', descEN: 'As simple as it gets; fresh mint, purified water, no sugar. Hot.', descVI: 'Đơn giản hết mức; bạc hà tươi, nước tinh khiết, không đường. Nóng.', price: '45' },
        ]
      },
      {
        labelEN: 'Ice Tea',
        labelVI: 'Trà đá',
        items: [
          { nameEN: 'Cold-Brew Honey Hibiscus', nameVI: 'Atiso đỏ mật ong ủ lạnh', descEN: 'Very cooling, available without raw wild honey.', descVI: 'Rất mát, có thể làm không thêm mật ong rừng.', price: '55' },
          { nameEN: 'Cold-Brew Jasmine Green', nameVI: 'Trà xanh nhài ủ lạnh', descEN: 'Vietnamese green tea scented with jasmine flowers.', descVI: 'Trà xanh Việt Nam ướp hoa nhài.', price: '50' },
          { nameEN: 'Cold-Brew Mint Tea', nameVI: 'Trà bạc hà ủ lạnh', descEN: 'Very cooling, available without raw wild honey.', descVI: 'Rất mát, có thể làm không thêm mật ong rừng.', price: '55' },
          { nameEN: 'Add raw wild honey + lime', nameVI: 'Thêm mật ong rừng + chanh', price: '5' },
          { nameEN: 'Add house-made lavender + rose syrups', nameVI: 'Thêm siro oải hương + hoa hồng tự làm', price: '5' },
          { nameEN: 'Add house-made mango + passion fruit syrups', nameVI: 'Thêm siro xoài + chanh dây tự làm', price: '5' },
        ]
      },
      {
        labelEN: 'Cacao',
        labelVI: 'Ca cao',
        items: [
          { nameEN: 'Cacao Latte or Salt Cream', nameVI: 'Cacao Latte hoặc Kem Muối', descEN: '100% all natural Vietnamese cacao. Available hot or cold.', descVI: '100% cacao Việt Nam tự nhiên. Có nóng hoặc đá.', price: '55' },
        ]
      },
    ]
  },
  {
    key: 'other',
    labelEN: 'Other',
    labelVI: 'Khác',
    sections: [
      {
        labelEN: 'Zero Proof',
        labelVI: 'Không cồn',
        items: [
          { nameEN: 'Safe Word', nameVI: 'Safe Word', tagEN: "The most popular non-alcoholic drink we've ever invented.", tagVI: "Đồ uống không cồn nổi tiếng nhất chúng tôi từng sáng tạo.", descEN: 'Passion fruit, mango, lime, ginger ale.', descVI: 'Chanh dây, xoài, chanh, ginger ale.', price: '80' },
          { nameEN: 'Good Girl Mojito', nameVI: 'Good Girl Mojito', tagEN: "Somewhere between innocence and ecstasy.", tagVI: "Đâu đó giữa ngây thơ và ngất ngây.", descEN: 'Lime, fresh mint, ginger ale.', descVI: 'Chanh, bạc hà tươi, ginger ale.', price: '70' },
          { nameEN: '419', nameVI: '419', tagEN: "At least tonight we are free.", tagVI: "Ít nhất đêm nay ta được tự do.", descEN: 'Pineapple juice, Vietnamese basil, soda.', descVI: 'Nước ép dứa, húng quế, soda.', price: '65' },
          { nameEN: 'Free Love', nameVI: 'Free Love', tagEN: "Let's quit our jobs and hitchhike to California.", tagVI: "Hãy nghỉ việc và đi nhờ xe tới California.", descEN: 'Ginger, raw wild honey, lime, soda.', descVI: 'Gừng, mật ong rừng, chanh, soda.', price: '75' },
          { nameEN: 'Summer Fling', nameVI: 'Summer Fling', tagEN: "Both the sweetness + bitterness of that summer...", tagVI: "Cả vị ngọt + vị đắng của mùa hè ấy...", descEN: 'Pomelo, lime, soda.', descVI: 'Bưởi, chanh, soda.', price: '60' },
        ]
      },
      {
        labelEN: 'Soda / Juice',
        labelVI: 'Nước ngọt / Nước ép',
        items: [
          { nameEN: 'Fresh-Squeezed Orange Juice', nameVI: 'Nước cam vắt tươi', descEN: 'Straight from the market, no sugar added.', descVI: 'Vắt tươi từ chợ, không thêm đường.', price: '55' },
          { nameEN: 'Coke / Coke Zero / Ginger Ale', nameVI: 'Coke / Coke Zero / Ginger Ale', descEN: 'The official beverages of the Illuminati.', descVI: 'Thức uống chính thức của hội Illuminati.', price: '35' },
          { nameEN: 'House-Made Limeade', nameVI: 'Nước chanh tự làm', descEN: 'For summer, or whenever you wish it was.', descVI: 'Cho mùa hè, hay bất cứ khi nào bạn ước là mùa hè.', price: '35' },
          { nameEN: 'Đảnh Thạnh Mineral Water', nameVI: 'Nước khoáng Đảnh Thạnh', descEN: 'Sparkling mineral water bottled at source, naturally high pH.', descVI: 'Nước khoáng có gas đóng chai tại nguồn, độ pH cao tự nhiên.', price: '40' },
          { nameEN: 'European Red Bull', nameVI: 'Red Bull châu Âu', descEN: 'The fully carbonated "gives you wings" version.', descVI: 'Phiên bản "cho bạn đôi cánh" có gas đầy đủ.', price: '65' },
        ]
      },
      {
        labelEN: 'Snacks',
        labelVI: 'Đồ ăn nhẹ',
        items: [
          { nameEN: 'Mixed Nuts', nameVI: 'Hạt hỗn hợp', descEN: 'A generous mix of almonds, cashews, and peanuts, all from Việt Nam.', descVI: 'Phần trộn đầy đặn hạnh nhân, hạt điều và đậu phộng, tất cả từ Việt Nam.', price: '55' },
          { nameEN: 'Chips! (Crisps)', nameVI: 'Snack khoai tây', descEN: 'In British, Crisps. In American, Chips.', descVI: 'Tiếng Anh-Anh gọi là "crisps", tiếng Anh-Mỹ gọi là "chips".', price: '35' },
        ]
      },
    ]
  },
];
