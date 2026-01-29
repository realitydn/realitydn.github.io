export const MENU = [
  { 
    key: 'cocktails', 
    labelEN: 'Cocktails', 
    labelVI: 'Cocktails',
    sections: [
      {
        labelEN: 'Classic Cocktails',
        labelVI: 'Cocktail cổ điển',
        items: [
          { nameEN: 'Negroni', nameVI: 'Negroni', descEN: 'Tanqueray Dry, Campari, Dolin Rouge.', descVI: 'Tanqueray Dry, Campari, Dolin Rouge.', price: '165' },
          { nameEN: 'Mojito', nameVI: 'Mojito', descEN: 'Havana 3y, lime, mint, soda.', descVI: 'Havana 3y, chanh, bạc hà, soda.', price: '125' },
          { nameEN: 'Whiskey Sour', nameVI: 'Whiskey Sour', descEN: 'Jim Beam Black, Angostura, lemon, eggwhite.', descVI: 'Jim Beam Black, Angostura, chanh, lòng trắng trứng.', price: '160' },
          { nameEN: 'Old-Fashioned', nameVI: 'Old-Fashioned', descEN: 'Jim Beam Black, Angostura, citrus oil.', descVI: 'Jim Beam Black, Angostura, tinh dầu cam chanh.', price: '145' },
          { nameEN: 'Cuba Libre', nameVI: 'Cuba Libre', descEN: 'Havana 3y, Coca-Cola, lime.', descVI: 'Havana 3y, Coca-Cola, chanh.', price: '95' },
          { nameEN: 'Long Island Iced Tea', nameVI: 'Long Island Iced Tea', descEN: 'All the alcohols + a splash of Coca-Cola.', descVI: 'Tất cả các loại rượu + chút Coca-Cola.', price: '180' },
        ]
      },
      {
        labelEN: 'Signature Cocktails',
        labelVI: 'Cocktail đặc trưng',
        items: [
          { nameEN: 'Le Botanique', nameVI: 'Le Botanique', descEN: 'Jasmine-infused Tanqueray Dry, lavender, aloe vera, lime, whey.', descVI: 'Tanqueray Dry ngâm hoa nhài, oải hương, nha đam, chanh, whey.', price: '160' },
          { nameEN: 'Virtual Reality', nameVI: 'Virtual Reality', descEN: 'Pandan-infused Havana 3y, coconut, tofu, lime.', descVI: 'Havana 3y ngâm lá dứa, dừa, đậu phụ, chanh.', price: '125' },
          { nameEN: 'Daydream', nameVI: 'Daydream', descEN: 'Absolut, Galliano Vanilla, passion fruit, mango, lime, eggwhite.', descVI: 'Absolut, Galliano Vanilla, chanh dây, xoài, chanh, lòng trắng trứng.', price: '150' },
          { nameEN: 'Clockwork Orange', nameVI: 'Clockwork Orange', descEN: 'Havana 7y, Jim Beam Black, Cointreau, cinnamon, almond, ginger, lime.', descVI: 'Havana 7y, Jim Beam Black, Cointreau, quế, hạnh nhân, gừng, chanh.', price: '180' },
          { nameEN: 'Lavender Margarita', nameVI: 'Lavender Margarita', descEN: 'Two Fingers Silver, Cointreau, lime, pepper, lavender.', descVI: 'Two Fingers Silver, Cointreau, chanh, tiêu, oải hương.', price: '140' },
        ]
      },
      {
        labelEN: 'Seasonal Cocktails',
        labelVI: 'Cocktail theo mùa',
        items: [
          { nameEN: 'Phin Cà Phê Martini', nameVI: 'Phin Cà Phê Martini', descEN: 'Absolut, Kahlua, phin coffee.', descVI: 'Absolut, Kahlua, cà phê phin.', price: '140' },
          { nameEN: 'Tomelo Collins', nameVI: 'Tomelo Collins', descEN: 'TA gin, pomelo, soda.', descVI: 'TA gin, bưởi, soda.', price: '110' },
          { nameEN: 'Pink Seoul', nameVI: 'Pink Seoul', descEN: 'TA gin, Soju, lemongrass, house-made grenadine, lime.', descVI: 'TA gin, Soju, sả, grenadine tự làm, chanh.', price: '135' },
        ]
      },
      {
        labelEN: 'Gin + Tonic',
        labelVI: 'Gin + Tonic',
        items: [
          { nameEN: 'w/ TA Gin', nameVI: 'với TA Gin', price: '90' },
          { nameEN: 'w/ Tanqueray', nameVI: 'với Tanqueray', price: '120' },
          { nameEN: 'w/ Roku', nameVI: 'với Roku', price: '150' },
          { nameEN: 'w/ Hendrick\'s', nameVI: 'với Hendrick\'s', price: '180' },
        ]
      },
      {
        labelEN: 'Reserve Cocktails',
        labelVI: 'Cocktail cao cấp',
        items: [
          { nameEN: 'Surrealism', nameVI: 'Surrealism', descEN: 'Creyente mezcal, Palo Santo, aloe vera.', descVI: 'Creyente mezcal, Palo Santo, nha đam.', price: '250' },
          { nameEN: 'Penicillin', nameVI: 'Penicillin', descEN: 'Monkey Shoulder, Laphroaig 10, lime, ginger, Angostura.', descVI: 'Monkey Shoulder, Laphroaig 10, chanh, gừng, Angostura.', price: '280' },
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
        labelEN: 'Beer',
        labelVI: 'Bia',
        items: [
          { nameEN: 'Excited Magpie Stout', nameVI: 'Excited Magpie Stout', descEN: 'Heart of Darkness, Irish-style dry stout, 4.2% abv', descVI: 'Heart of Darkness, stout khô Ireland, 4.2% abv', price: '110' },
          { nameEN: 'Kurtz\'s Insane IPA', nameVI: 'Kurtz\'s Insane IPA', descEN: 'Heart of Darkness, 102 IBU, 7.1% abv', descVI: 'Heart of Darkness, 102 IBU, 7.1% abv', price: '125' },
          { nameEN: 'Hoegaarden', nameVI: 'Hoegaarden', descEN: 'Belgian witbier, 250ml, 4.9% abv', descVI: 'Bia trắng Bỉ, 250ml, 4.9% abv', price: '65' },
          { nameEN: 'Tiger', nameVI: 'Tiger', descEN: '5.0% abv', price: '40' },
          { nameEN: 'Big Huda', nameVI: 'Huda lớn', descEN: 'Huế pale lager', descVI: 'Lager nhạt Huế', price: '40' },
          { nameEN: 'Strongbow Golden Apple', nameVI: 'Strongbow Golden Apple', descEN: 'Cider, gluten-free, 4.5% abv', descVI: 'Cider, không gluten, 4.5% abv', price: '75' },
          { nameEN: 'Soju Jinro Original', nameVI: 'Soju Jinro Original', descEN: '360ml bottle, ~18% abv', descVI: 'Chai 360ml, ~18% abv', price: '170' },
        ]
      },
      {
        labelEN: 'Wine',
        labelVI: 'Rượu vang',
        items: [
          { nameEN: 'Sauvignon Blanc', nameVI: 'Sauvignon Blanc', descEN: 'Woolshed, Australia. Bottle.', descVI: 'Woolshed, Úc. Chai.', price: '575' },
          { nameEN: 'Cabernet Sauvignon', nameVI: 'Cabernet Sauvignon', descEN: 'Woolshed, Australia. Bottle.', descVI: 'Woolshed, Úc. Chai.', price: '575' },
          { nameEN: 'Blanc de Blancs Brut', nameVI: 'Blanc de Blancs Brut', descEN: 'Maison Chevalier, France. Sparkling. Bottle.', descVI: 'Maison Chevalier, Pháp. Vang sủi. Chai.', price: '600' },
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
          { nameEN: 'Black Coffee', nameVI: 'Cà phê đen', descEN: 'hot/cold', descVI: 'nóng/đá', price: '35' },
          { nameEN: 'White Coffee', nameVI: 'Cà phê nâu', descEN: 'hot/cold', descVI: 'nóng/đá', price: '40' },
          { nameEN: 'Bạc Xỉu Coffee', nameVI: 'Bạc xỉu', descEN: 'hot/cold', descVI: 'nóng/đá', price: '45' },
          { nameEN: 'Salt Coffee', nameVI: 'Cà phê muối', price: '50' },
          { nameEN: 'Coconut Cream Coffee', nameVI: 'Cà phê kem dừa', price: '55' },
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
        labelEN: 'Tea',
        labelVI: 'Trà',
        items: [
          { nameEN: 'Matcha Latte or Salt Cream', nameVI: 'Matcha Latte hoặc Kem Muối', descEN: '100% natural Japanese matcha. Latte hot/cold, Salt Cream cold.', descVI: 'Matcha Nhật 100% tự nhiên. Latte nóng/đá, Kem Muối đá.', price: '65' },
          { nameEN: 'Houjicha Latte or Salt Cream', nameVI: 'Houjicha Latte hoặc Kem Muối', descEN: 'Low-caffeine roasted Sencha. Latte hot/cold, Salt Cream cold.', descVI: 'Sencha rang ít caffeine. Latte nóng/đá, Kem Muối đá.', price: '60' },
          { nameEN: 'Oolong Tea', nameVI: 'Trà Ô Long', descEN: 'Phúc Long Vietnamese ôlong blend, served hot.', descVI: 'Trà ô long Phúc Long, phục vụ nóng.', price: '45' },
          { nameEN: 'Jasmine Green Iced Tea', nameVI: 'Trà xanh nhài đá', descEN: 'Vietnamese green tea scented with jasmine.', descVI: 'Trà xanh Việt Nam ướp hoa nhài.', price: '45' },
        ]
      },
      {
        labelEN: 'Herbal Tea',
        labelVI: 'Trà thảo mộc',
        items: [
          { nameEN: 'Honey Hibiscus Tea', nameVI: 'Trà atiso đỏ mật ong', descEN: 'Hibiscus + raw wild honey, hot.', descVI: 'Hoa atiso đỏ + mật ong rừng, nóng.', price: '45' },
          { nameEN: 'Daytripper', nameVI: 'Daytripper', descEN: 'Chrysanthemum, longan, goji, jujube, lotus heart, notoginseng. Hot.', descVI: 'Hoa cúc, nhãn, kỷ tử, táo đỏ, tâm sen, nụ tam thất. Nóng.', price: '55' },
          { nameEN: 'Sunshine', nameVI: 'Sunshine', descEN: 'Passion fruit, kumquat, rock sugar. Hot.', descVI: 'Chanh dây, quất, đường phèn. Nóng.', price: '50' },
          { nameEN: 'Fresh Ginger Tea', nameVI: 'Trà gừng tươi', descEN: 'The ultimate ginger experience. Hot.', descVI: 'Trải nghiệm gừng tuyệt vời. Nóng.', price: '45' },
          { nameEN: 'Fresh Mint Tea', nameVI: 'Trà bạc hà tươi', descEN: 'Fresh mint, purified water, no sugar. Hot.', descVI: 'Bạc hà tươi, nước tinh khiết, không đường. Nóng.', price: '45' },
        ]
      },
      {
        labelEN: 'Cacao',
        labelVI: 'Ca cao',
        items: [
          { nameEN: 'Cacao Latte or Salt Cream', nameVI: 'Cacao Latte hoặc Kem Muối', descEN: '100% natural Vietnamese cacao. Hot or cold.', descVI: '100% cacao Việt Nam tự nhiên. Nóng hoặc đá.', price: '55' },
        ]
      },
    ]
  },
  { 
    key: 'other', 
    labelEN: 'Other Non-Alcoholic', 
    labelVI: 'Không cồn khác',
    sections: [
      {
        labelEN: 'Zero Proof',
        labelVI: 'Không cồn',
        items: [
          { nameEN: 'Safe Word', nameVI: 'Safe Word', descEN: 'Passion fruit, mango, lime, ginger ale.', descVI: 'Chanh dây, xoài, chanh, ginger ale.', price: '80' },
          { nameEN: 'Good Girl Mojito', nameVI: 'Good Girl Mojito', descEN: 'Lime, fresh mint, ginger ale.', descVI: 'Chanh, bạc hà tươi, ginger ale.', price: '70' },
          { nameEN: '419', nameVI: '419', descEN: 'Pineapple juice, Vietnamese basil, soda.', descVI: 'Nước ép dứa, húng quế, soda.', price: '65' },
          { nameEN: 'Free Love', nameVI: 'Free Love', descEN: 'Ginger, raw wild honey, lime, soda.', descVI: 'Gừng, mật ong rừng, chanh, soda.', price: '75' },
          { nameEN: 'Summer Fling', nameVI: 'Summer Fling', descEN: 'Pomelo, lime, soda.', descVI: 'Bưởi, chanh, soda.', price: '60' },
        ]
      },
      {
        labelEN: 'Soda / Juice',
        labelVI: 'Nước ngọt / Nước ép',
        items: [
          { nameEN: 'Fresh Orange Juice', nameVI: 'Nước cam vắt tươi', descEN: 'Straight from the market, no sugar.', descVI: 'Vắt tươi từ chợ, không đường.', price: '45' },
          { nameEN: 'Coke / Coke Zero / Ginger Ale', nameVI: 'Coke / Coke Zero / Ginger Ale', price: '35' },
          { nameEN: 'House-Made Limeade', nameVI: 'Nước chanh tự làm', price: '35' },
          { nameEN: 'Đảnh Thạnh Mineral Water', nameVI: 'Nước khoáng Đảnh Thạnh', descEN: 'Sparkling, naturally high pH.', descVI: 'Có gas, độ pH cao tự nhiên.', price: '40' },
        ]
      },
    ]
  },
];
