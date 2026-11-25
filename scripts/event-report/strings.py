"""Every word on the public event report, in English and Vietnamese.

Series names are not translated here: a series shows its webapp title (title_vi on
the Vietnamese page when the app has one), else the pipeline's canonical name.
Category names come from assets/categories.json.

The Vietnamese is a draft for Donald to correct. Keep the diacritics; edit freely.
A key missing from 'vi' falls back to English rather than breaking the build.
"""

STRINGS = {
    'en': {
        'html_lang': 'en',
        'doc_title': 'REALITY in numbers: {total} events since {opened}',
        'meta_description': (
            'REALITY, a café, bar and community space at 86 Mai Thúc Lân, Đà Nẵng, has hosted '
            '{total} events since it opened on {opened}: {last30} in the last 30 days, from '
            '{series} different series and one-offs. Updated every week.'),
        'og_title': 'REALITY in numbers',
        'kicker': 'REALITY in numbers',
        'home_label': 'REALITY home page',
        'lang_label': 'Language',
        'to_dark': 'Switch to dark mode',
        'to_light': 'Switch to light mode',

        'big_unit': 'events since<br>the doors opened',
        'span': '{opened} – {asof} · updated every week',
        'lead': (
            'REALITY is a café, bar and community space at 86 Mai Thúc Lân, Đà Nẵng. '
            'Since it opened on {opened}, it has hosted {total} events: {last30} in the last '
            '30 days, with something on {active_days} of those 30 days. They come from '
            '{series} different series and one-offs, and {running} series are running now.'),
        'lead_every': (
            'REALITY is a café, bar and community space at 86 Mai Thúc Lân, Đà Nẵng. '
            'Since it opened on {opened}, it has hosted {total} events: {last30} in the last '
            '30 days, with something on every one of those days. They come from '
            '{series} different series and one-offs, and {running} series are running now.'),

        'stat_last30': 'events in the last 30 days',
        'stat_week': 'events a week, on average, over the last 90 days',
        'stat_series': 'different series and one-offs',
        'stat_series_sub': '{n} of them came back for more than one night',
        'stat_running': 'series running now',
        'stat_new': 'new series in the last 30 days',

        'growth_title': 'Thirty days at a time',
        'growth_note': 'Each point on the line counts the events in the 30 days up to that day.',
        'growth_read': ('In the 30 days to {d0} there were {n0} events. '
                        'In the 30 days to {d1} there were {n1}.'),
        'growth_alt': 'Line chart of events in each trailing 30 days, from {n0} on {d0} to {n1} on {d1}.',

        'mix_title': 'A bit of everything',
        'mix_note': 'Every event since opening, by kind, with the series that ran most in each.',
        'mix_share': '{p}% of all events',
        'mix_alt': 'Bar showing each kind of event as a share of all {total}.',

        'regulars_title': 'The regulars',
        'regulars_note': ('{n} series are running now, listed by the day they usually meet. '
                          'Each one links to its page on the webapp, with the next dates.'),
        'since': 'since {d}',
        'times': '{n} times',
        'times_one': 'once',
        'cadence_weekly': 'Weekly',
        'cadence_fortnightly': 'Every two weeks',
        'cadence_monthly': 'Monthly',
        'cadence_occasional': 'Now and then',
        'cadence_rare': 'Now and then',

        'new_title': 'New this month',
        'new_note': '{n} series had their first night in the last 30 days.',
        'new_note_one': 'One series had its first night in the last 30 days.',
        'new_empty': 'Nothing new started in the last 30 days.',
        'new_first': 'First night {d}',

        'when_title': 'When things happen',
        'when_note': ('The last 30 days by day of the week and time of day. '
                      'Each square counts the events that started in it.'),
        'when_caption': 'Events in the last 30 days, by day and time of day',
        'band_Daytime': 'Before noon',
        'band_Afternoon': 'Afternoon',
        'band_Evening': 'Evening',
        'band_Late': 'Late',
        'band_hours_Daytime': '11–12',
        'band_hours_Afternoon': '12–17',
        'band_hours_Evening': '17–21',
        'band_hours_Late': '21+',
        'open_label': 'open',
        'open_title': 'Open slots',
        'open_body': ('Nothing started in these squares in the last 30 days. If you’d like to '
                      'host something, they’re a good place to start.'),
        'open_none': ('Every square had something on in the last 30 days. Most hold more than '
                      'one event, so ask anyway.'),
        'open_cta': 'Propose an event',

        'week_summary': 'Everything from the last seven days ({n} events)',

        'footer_method': (
            'Counted from REALITY’s own calendar: Google Calendar before 8.6.26, and the '
            'webapp’s public events feed since then. Repeat listings and non-events, like '
            'happy hours, are left out. Private parties count in the totals but aren’t named here.'),
        'footer_updated': 'Updated every week. Figures to {d}.',
        'footer_data': 'The same numbers as data',

        'dataset_name': 'REALITY events, counted',
        'dataset_description': (
            'Weekly counts of the events held at REALITY, 86 Mai Thúc Lân, Đà Nẵng, since it '
            'opened on 26 May 2025: totals, the trailing 30-day count, series running and '
            'events by kind.'),

        'days': {'Monday': 'Monday', 'Tuesday': 'Tuesday', 'Wednesday': 'Wednesday',
                 'Thursday': 'Thursday', 'Friday': 'Friday', 'Saturday': 'Saturday',
                 'Sunday': 'Sunday'},
        'days_short': {'Monday': 'Mon', 'Tuesday': 'Tue', 'Wednesday': 'Wed',
                       'Thursday': 'Thu', 'Friday': 'Fri', 'Saturday': 'Sat', 'Sunday': 'Sun'},
        'months_short': ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                         'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    },

    'vi': {
        'html_lang': 'vi',
        'doc_title': 'REALITY qua những con số: {total} sự kiện kể từ {opened}',
        'meta_description': (
            'REALITY, quán cà phê, quán bar và không gian cộng đồng tại 86 Mai Thúc Lân, '
            'Đà Nẵng, đã tổ chức {total} sự kiện kể từ ngày mở cửa {opened}: {last30} sự kiện '
            'trong 30 ngày qua, thuộc {series} chuỗi và sự kiện một lần khác nhau. '
            'Cập nhật hằng tuần.'),
        'og_title': 'REALITY qua những con số',
        'kicker': 'REALITY qua những con số',
        'home_label': 'Trang chủ REALITY',
        'lang_label': 'Ngôn ngữ',
        'to_dark': 'Chuyển sang giao diện tối',
        'to_light': 'Chuyển sang giao diện sáng',

        'big_unit': 'sự kiện kể từ<br>ngày mở cửa',
        'span': '{opened} – {asof} · cập nhật hằng tuần',
        'lead': (
            'REALITY là quán cà phê, quán bar và không gian cộng đồng tại 86 Mai Thúc Lân, '
            'Đà Nẵng. Từ ngày mở cửa {opened} đến nay, REALITY đã tổ chức {total} sự kiện: '
            '{last30} sự kiện trong 30 ngày qua, và {active_days} trên 30 ngày đó có sự kiện. '
            'Các sự kiện thuộc {series} chuỗi và sự kiện một lần khác nhau, và hiện có '
            '{running} chuỗi đang diễn ra.'),
        'lead_every': (
            'REALITY là quán cà phê, quán bar và không gian cộng đồng tại 86 Mai Thúc Lân, '
            'Đà Nẵng. Từ ngày mở cửa {opened} đến nay, REALITY đã tổ chức {total} sự kiện: '
            '{last30} sự kiện trong 30 ngày qua, và ngày nào trong 30 ngày đó cũng có sự kiện. '
            'Các sự kiện thuộc {series} chuỗi và sự kiện một lần khác nhau, và hiện có '
            '{running} chuỗi đang diễn ra.'),

        'stat_last30': 'sự kiện trong 30 ngày qua',
        'stat_week': 'sự kiện mỗi tuần, trung bình trong 90 ngày qua',
        'stat_series': 'chuỗi và sự kiện một lần khác nhau',
        'stat_series_sub': '{n} trong số đó đã quay lại nhiều hơn một lần',
        'stat_running': 'chuỗi đang diễn ra',
        'stat_new': 'chuỗi mới trong 30 ngày qua',

        'growth_title': 'Đếm theo từng 30 ngày',
        'growth_note': 'Mỗi điểm trên đường là số sự kiện trong 30 ngày tính đến ngày đó.',
        'growth_read': ('Trong 30 ngày tính đến {d0} có {n0} sự kiện. '
                        'Trong 30 ngày tính đến {d1} có {n1} sự kiện.'),
        'growth_alt': ('Biểu đồ đường số sự kiện trong mỗi 30 ngày gần nhất, từ {n0} vào {d0} '
                       'đến {n1} vào {d1}.'),

        'mix_title': 'Mỗi thứ một chút',
        'mix_note': ('Tất cả sự kiện từ ngày mở cửa, theo thể loại, cùng những chuỗi diễn ra '
                     'nhiều nhất ở mỗi loại.'),
        'mix_share': '{p}% tổng số sự kiện',
        'mix_alt': 'Thanh thể hiện tỷ lệ của từng loại sự kiện trên tổng số {total}.',

        'regulars_title': 'Những chuỗi quen thuộc',
        'regulars_note': ('Hiện có {n} chuỗi đang diễn ra, xếp theo ngày thường gặp. '
                          'Mỗi chuỗi dẫn đến trang riêng trên webapp, có lịch các buổi tới.'),
        'since': 'từ {d}',
        'times': '{n} lần',
        'times_one': '1 lần',
        'cadence_weekly': 'Hằng tuần',
        'cadence_fortnightly': 'Hai tuần một lần',
        'cadence_monthly': 'Hằng tháng',
        'cadence_occasional': 'Thỉnh thoảng',
        'cadence_rare': 'Thỉnh thoảng',

        'new_title': 'Mới trong tháng này',
        'new_note': '{n} chuỗi có buổi đầu tiên trong 30 ngày qua.',
        'new_note_one': 'Một chuỗi có buổi đầu tiên trong 30 ngày qua.',
        'new_empty': 'Không có chuỗi mới nào bắt đầu trong 30 ngày qua.',
        'new_first': 'Buổi đầu {d}',

        'when_title': 'Khi nào có sự kiện',
        'when_note': ('30 ngày qua, theo ngày trong tuần và giờ trong ngày. '
                      'Mỗi ô là số sự kiện bắt đầu trong khung giờ đó.'),
        'when_caption': 'Sự kiện trong 30 ngày qua, theo ngày và giờ',
        'band_Daytime': 'Trước trưa',
        'band_Afternoon': 'Chiều',
        'band_Evening': 'Tối',
        'band_Late': 'Khuya',
        'open_label': 'trống',
        'open_title': 'Khung giờ còn trống',
        'open_body': ('Trong 30 ngày qua, các ô này chưa có sự kiện nào. Nếu bạn muốn tổ chức '
                      'một sự kiện, đây là chỗ tốt để bắt đầu.'),
        'open_none': ('Trong 30 ngày qua, ô nào cũng có sự kiện. Phần lớn các ô vẫn còn chỗ '
                      'cho nhiều hơn một sự kiện, nên bạn cứ hỏi nhé.'),
        'open_cta': 'Đề xuất sự kiện',

        'week_summary': 'Tất cả sự kiện trong bảy ngày qua ({n} sự kiện)',

        'footer_method': (
            'Đếm từ lịch của chính REALITY: Google Calendar trước 8.6.26, và nguồn sự kiện '
            'công khai của webapp từ đó đến nay. Các mục trùng lặp và những mục không phải sự '
            'kiện, như happy hour, không được tính. Tiệc riêng có trong tổng số nhưng không '
            'được nêu tên ở đây.'),
        'footer_updated': 'Cập nhật hằng tuần. Số liệu tính đến {d}.',
        'footer_data': 'Cùng số liệu, dạng dữ liệu',

        'dataset_name': 'Sự kiện tại REALITY, qua những con số',
        'dataset_description': (
            'Số liệu hằng tuần về các sự kiện tại REALITY, 86 Mai Thúc Lân, Đà Nẵng, kể từ '
            'ngày mở cửa 26.5.25: tổng số, số sự kiện trong 30 ngày gần nhất, các chuỗi đang '
            'diễn ra và sự kiện theo thể loại.'),

        'days': {'Monday': 'Thứ 2', 'Tuesday': 'Thứ 3', 'Wednesday': 'Thứ 4',
                 'Thursday': 'Thứ 5', 'Friday': 'Thứ 6', 'Saturday': 'Thứ 7',
                 'Sunday': 'Chủ nhật'},
        'days_short': {'Monday': 'T2', 'Tuesday': 'T3', 'Wednesday': 'T4',
                       'Thursday': 'T5', 'Friday': 'T6', 'Saturday': 'T7', 'Sunday': 'CN'},
        'months_short': ['Th1', 'Th2', 'Th3', 'Th4', 'Th5', 'Th6',
                         'Th7', 'Th8', 'Th9', 'Th10', 'Th11', 'Th12'],
    },
}

# Brand: 'Thứ 2' / 'CN' are the house forms; the grid uses the short ones.


def t(locale, key, **kw):
    s = STRINGS.get(locale, {}).get(key)
    if s is None:
        s = STRINGS['en'][key]
    return s.format(**kw) if kw else s
