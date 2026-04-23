export const FORM_STR = {
  EN: {
    proposal: {
      title: "Work with us",
      subtitle: "Have an idea for an event or exhibition? We'd love to hear it.",
      eventTab: "Propose an Event",
      artTab: "Propose an Exhibition",
    },
    eventForm: {
      stepTitles: ["About You", "About the Event", "Logistics", "Review & Submit"],
      step1: {
        email: {
          label: "Email",
          placeholder: "your@email.com",
        },
        hostName: {
          label: "Your name",
          placeholder: "First and last",
        },
        contact: {
          label: "Phone number",
          placeholder: "+84 xxx xxx xxx",
          helper: "Best way to reach you",
        },
      },
      step2: {
        eventTitle: {
          label: "Event title",
          placeholder: "Think of this as marketing copy—what would make someone want to come?",
        },
        recurrence: {
          label: "How often?",
          options: {
            oneTime: "One-time",
            weekly: "Weekly",
            biweekly: "Biweekly",
            monthly: "Monthly",
            discuss: "Let's discuss",
          },
        },
        schedule: {
          label: "Date & time",
          placeholder: "When do you want to host?",
        },
        duration: {
          label: "How long?",
          placeholder: "e.g., 2 hours, all evening",
        },
        cost: {
          label: "Cost to attendees",
          placeholder: "Free, or ticket price",
          helper: "Let us know if you plan to charge",
        },
      },
      step3: {
        language: {
          label: "What language(s)?",
          options: {
            english: "English",
            vietnamese: "Vietnamese",
            russian: "Russian",
            ukrainian: "Ukrainian",
            other: "Other",
          },
        },
        space: {
          label: "Which space?",
          options: {
            groundFloor: "Ground floor lounge (1L)",
            secondFloorLounge: "Second floor lounge (2L)",
            secondFloorEvent: "Second floor event space (2E)",
            thirdFloorPatio: "Third floor patio (3P)",
            unsure: "Not sure",
          },
        },
        equipment: {
          label: "What do you need?",
          helper: "Select all that apply",
          options: {
            projector: "Projector",
            microphones: "Microphones",
            laptop: "Laptop",
            djEquipment: "DJ Equipment",
            pianoKeyboard: "Piano keyboard",
            seatingArrangement: "Specific seating arrangement",
            none: "None",
            other: "Other",
          },
        },
        anythingElse: {
          label: "Anything else we should know?",
          placeholder: "Tell us about any special requirements, ideas, or concerns...",
        },
      },
      step4: {
        reviewTitle: "Does everything look good?",
        editButton: "Edit",
        submitButton: "Submit Proposal",
        guidelinesLink: "Read our event guidelines",
      },
      validation: {
        required: "This field is required",
        invalidEmail: "Please enter a valid email address",
      },
      successMessage: "Thank you! We'll be in touch within a few days.",
      errorMessage: "Something went wrong. Please try again, or contact us directly.",
      stepOf: "Step {n} of {total}",
      stepOfTemplate: {
        step: "Step",
        of: "of",
      },
    },
    artForm: {
      stepTitles: ["About You", "About the Show", "Scheduling & Group Shows", "Review & Submit"],
      step1: {
        email: {
          label: "Email",
          placeholder: "your@email.com",
        },
        name: {
          label: "Your name",
          placeholder: "First and last",
        },
        artistName: {
          label: "Artist name",
          placeholder: "Your art name or alias",
          helper: "Leave blank if it's the same as your name",
        },
        location: {
          label: "Where are you based?",
          placeholder: "City, country (you don't have to be in Da Nang!)",
        },
        contact: {
          label: "Phone number",
          placeholder: "+84 xxx xxx xxx",
          helper: "Best way to reach you",
        },
        bio: {
          label: "Tell us about your art",
          placeholder: "2–4 sentences about your practice, style, or what you create",
          helper: "This helps us understand your work",
        },
        portfolioLink: {
          label: "Portfolio or website",
          placeholder: "Link to your work (Instagram, website, etc.)",
          helper: "Optional but helpful",
        },
      },
      step2: {
        showConcept: {
          label: "Describe your show",
          placeholder: "Tell us about the exhibition: title, media, subject, number of pieces, size, and whether it's for sale or exhibition only",
          helper: "Help us visualize what you're imagining",
        },
        spaces: {
          label: "Which space appeals to you?",
          options: {
            firstFloor: "First floor",
            secondFloorLounge: "Second floor lounge",
            secondFloorEvent: "Second floor event space",
            rooftopPatio: "Rooftop patio",
          },
        },
        spaceScale: {
          label: "How much space do you need?",
          placeholder: "e.g., one wall, one room, half the second floor",
        },
        installationNeeds: {
          label: "Any special installation needs?",
          placeholder: "Tell us about lighting, walls, furniture, or other requirements",
        },
      },
      step3: {
        preferredDates: {
          label: "When would you like to show?",
          placeholder: "Preferred dates or timeframe",
        },
        flexibility: {
          label: "How flexible are you?",
          options: {
            veryFlexible: "Very flexible",
            somewhatFlexible: "Somewhat flexible",
            fixedDates: "Fixed dates",
          },
        },
        groupShow: {
          label: "Is this a group show?",
          options: {
            yes: "Yes",
            no: "No",
          },
        },
        artistCount: {
          label: "How many artists?",
          placeholder: "If it's a group show",
        },
        curator: {
          label: "Who's coordinating?",
          placeholder: "Curator or organizer name & email (if different from above)",
        },
      },
      step4: {
        reviewTitle: "Does everything look good?",
        editButton: "Edit",
        submitButton: "Submit Proposal",
        guidelinesLink: "Read our artist guidelines",
      },
      validation: {
        required: "This field is required",
        invalidEmail: "Please enter a valid email address",
      },
      successMessage: "Thank you! We'll be in touch within a few days.",
      errorMessage: "Something went wrong. Please try again, or contact us directly.",
      stepOf: "Step {n} of {total}",
      stepOfTemplate: {
        step: "Step",
        of: "of",
      },
    },
    guidelines: {
      pageTitle: "Event Guidelines",
      backLink: "Back to REALITY",
      sections: {
        generalRules: {
          title: "General Rules",
          content: "We're a community space, and we want everyone to feel welcome and respected. Here's how we keep things good:\n\n• Be respectful to other guests and our staff. Everyone's here to enjoy themselves.\n• Keep the noise level cool—we're a bar, not a nightclub. If we tell you it's too loud, turn it down.\n• Clean up after yourself. Take your trash and wipe down any mess you make.\n• No outside food or drink unless you've got pre-approval from the team.\n• If you're bringing kids, keep an eye on them. We're not a daycare.\n• Only pets that are small, leashed, and well-behaved. And only if they're right with you.\n• No drugs or illegal activity. Ever.",
        },
        publicEvents: {
          title: "Public & Free Community Events",
          content: "We love hosting free community events. It's part of our mission. Here's what we expect:\n\n• Events should be free or low-cost and open to the public.\n• You're responsible for promoting your event—we'll help, but we can't do the heavy lifting.\n• Plan for cleanup. Your event, your mess, your responsibility.\n• Make sure it fits our vibe. REALITY is a welcoming, creative space for adults and families.\n• If you're serving alcohol, you need to handle that legally and responsibly.\n• Tell us if you expect a big crowd. We need to make sure the space isn't overbooked.",
        },
        privateEvents: {
          title: "Private & For-Profit Events",
          content: "You want to throw a private party or paid workshop? Cool. We can make that happen.\n\n• Private events happen outside normal hours or in a reserved space.\n• We charge a space rental fee. Let's talk details.\n• For ticketed or for-profit events, we typically get a small cut of revenue. This covers our costs and keeps the space running.\n• You're still responsible for vibe and cleanup.\n• Private doesn't mean you get to break the rules. Respect and responsibility still matter.",
        },
        classes: {
          title: "Teaching Classes & Workshops",
          content: "Want to teach something? Yoga, art, language, music, business? We're down for it.\n\n• Classes work best on a regular schedule. Weekly is ideal.\n• We can help you get the word out, but you need to do some promotion too.\n• Charging for your class is totally fine—just work out the revenue share with us.\n• Set up early, clean up after. We'll help with furniture if you need it.\n• Keep it cool. Respect the space and other people using REALITY while you're teaching.",
        },
        branding: {
          title: "Using REALITY's Brand",
          content: "If you're promoting your event at REALITY or in partnership with us, follow these rules:\n\n• Use our logo only with permission. Ask first.\n• Tell the truth about REALITY. Don't oversell what we offer.\n• If you're advertising as 'presented by REALITY' or similar, make sure we've actually agreed to that level of partnership.\n• Don't use REALITY to promote something that doesn't fit our community values.\n• Give us a credit. If we're helping you, mention us. Tag us on social media, mention us in emails.",
        },
        promotion: {
          title: "How We Help Promote",
          content: "We're invested in making your event awesome. Here's how we usually help:\n\n• Social media shout-outs on our Instagram and Facebook (if it fits our vibe).\n• WhatsApp community updates to our followers.\n• Mentioning your event in our email or on our website.\n• Word-of-mouth from staff and regular guests.\n• We can't guarantee massive turnout, but we'll do our best to spread the word. You should promote too.",
        },
        checklist: {
          title: "Event Day Checklist",
          content: "Week before:\n• Confirm final numbers and timeline with the REALITY team.\n• Promote the heck out of your event.\n• Check that all equipment you need is available.\n\nDay of:\n• Arrive early. Set up and do a soundcheck if you need it.\n• Walk through the space and make sure it works for your event.\n• Brief your team (if you have one) on the vibe and any logistics.\n• Check in with REALITY staff 30 minutes before you start.\n\nDuring:\n• Keep things running. We're here to help, but it's your event.\n• Keep an eye on the crowd and the vibe.\n• Be ready to adapt if something changes.\n\nAfter:\n• Pack up your stuff. Return borrowed equipment.\n• Do a quick cleanup. Wipe down, pick up trash, rearrange furniture back.\n• Thank the REALITY team. Seriously.\n• Tell us how it went. We'd love to know what worked and what didn't.",
        },
      },
      ctaText: "Ready to propose an event?",
    },
    hostGuide: {
      pageTitle: "Event Host Guide",
      comingSoon: "This guide is coming soon. Check back shortly!",
      backLink: "Back to REALITY",
    },
  },
  VN: {
    proposal: {
      title: "Hợp tác với chúng tôi",
      subtitle: "Có ý tưởng về sự kiện hoặc triển lãm? Chúng tôi rất muốn nghe!",
      eventTab: "Đề xuất sự kiện",
      artTab: "Đề xuất triển lãm",
    },
    eventForm: {
      stepTitles: ["Về bạn", "Về sự kiện", "Logistic", "Xem xét & Gửi"],
      step1: {
        email: {
          label: "Email",
          placeholder: "your@email.com",
        },
        hostName: {
          label: "Tên của bạn",
          placeholder: "Tên đầu và tên cuối",
        },
        contact: {
          label: "Số điện thoại",
          placeholder: "+84 xxx xxx xxx",
          helper: "Cách tốt nhất để liên hệ bạn",
        },
      },
      step2: {
        eventTitle: {
          label: "Tên sự kiện",
          placeholder: "Hãy nghĩ của nó như bản sao tiếp thị—cái gì sẽ khiến ai đó muốn đến?",
        },
        recurrence: {
          label: "Tần suất?",
          options: {
            oneTime: "Một lần",
            weekly: "Hàng tuần",
            biweekly: "Hai tuần một lần",
            monthly: "Hàng tháng",
            discuss: "Hãy trao đổi",
          },
        },
        schedule: {
          label: "Ngày & giờ",
          placeholder: "Bạn muốn tổ chức lúc nào?",
        },
        duration: {
          label: "Bao lâu?",
          placeholder: "Ví dụ: 2 tiếng, cả buổi tối",
        },
        cost: {
          label: "Chi phí cho người tham dự",
          placeholder: "Miễn phí hoặc giá vé",
          helper: "Cho chúng tôi biết nếu bạn dự định tính phí",
        },
      },
      step3: {
        language: {
          label: "Sử dụng ngôn ngữ nào?",
          options: {
            english: "Tiếng Anh",
            vietnamese: "Tiếng Việt",
            russian: "Tiếng Nga",
            ukrainian: "Tiếng Ukraina",
            other: "Khác",
          },
        },
        space: {
          label: "Không gian nào?",
          options: {
            groundFloor: "Phòng khách tầng 1 (1L)",
            secondFloorLounge: "Phòng khách tầng 2 (2L)",
            secondFloorEvent: "Không gian sự kiện tầng 2 (2E)",
            thirdFloorPatio: "Sân thượng tầng 3 (3P)",
            unsure: "Chưa chắc",
          },
        },
        equipment: {
          label: "Bạn cần cái gì?",
          helper: "Chọn tất cả những cái phù hợp",
          options: {
            projector: "Máy chiếu",
            microphones: "Micro",
            laptop: "Laptop",
            djEquipment: "Thiết bị DJ",
            pianoKeyboard: "Đàn phím",
            seatingArrangement: "Sắp xếp chỗ ngồi đặc biệt",
            none: "Không cần",
            other: "Khác",
          },
        },
        anythingElse: {
          label: "Có gì khác chúng tôi nên biết không?",
          placeholder: "Cho chúng tôi biết về yêu cầu đặc biệt, ý tưởng hoặc lo ngại...",
        },
      },
      step4: {
        reviewTitle: "Mọi thứ có trông ổn không?",
        editButton: "Chỉnh sửa",
        submitButton: "Gửi đề xuất",
        guidelinesLink: "Đọc hướng dẫn sự kiện của chúng tôi",
      },
      validation: {
        required: "Trường này là bắt buộc",
        invalidEmail: "Vui lòng nhập địa chỉ email hợp lệ",
      },
      successMessage: "Cảm ơn bạn! Chúng tôi sẽ liên hệ bạn trong vài ngày.",
      errorMessage: "Có gì đó sai. Vui lòng thử lại hoặc liên hệ trực tiếp với chúng tôi.",
      stepOf: "Bước {n} trong {total}",
      stepOfTemplate: {
        step: "Bước",
        of: "trong",
      },
    },
    artForm: {
      stepTitles: ["Về bạn", "Về triển lãm", "Lịch & Triển lãm nhóm", "Xem xét & Gửi"],
      step1: {
        email: {
          label: "Email",
          placeholder: "your@email.com",
        },
        name: {
          label: "Tên của bạn",
          placeholder: "Tên đầu và tên cuối",
        },
        artistName: {
          label: "Tên nghệ sĩ",
          placeholder: "Tên nghệ danh hoặc biệt danh của bạn",
          helper: "Để trống nếu giống tên thật của bạn",
        },
        location: {
          label: "Bạn ở đâu?",
          placeholder: "Thành phố, đất nước (bạn không nhất thiết phải ở Đà Nẵng!)",
        },
        contact: {
          label: "Số điện thoại",
          placeholder: "+84 xxx xxx xxx",
          helper: "Cách tốt nhất để liên hệ bạn",
        },
        bio: {
          label: "Kể cho chúng tôi về nghệ thuật của bạn",
          placeholder: "2–4 câu về các thực hành, phong cách hoặc những gì bạn tạo ra",
          helper: "Điều này giúp chúng tôi hiểu về tác phẩm của bạn",
        },
        portfolioLink: {
          label: "Portfolio hoặc trang web",
          placeholder: "Liên kết đến tác phẩm của bạn (Instagram, website, v.v.)",
          helper: "Tùy chọn nhưng rất hữu ích",
        },
      },
      step2: {
        showConcept: {
          label: "Mô tả triển lãm của bạn",
          placeholder: "Cho chúng tôi biết về triển lãm: tiêu đề, phương tiện, chủ đề, số lượng tác phẩm, kích thước, và liệu nó để bán hay chỉ để trưng bày",
          helper: "Giúp chúng tôi hình dung những gì bạn đang tưởng tượng",
        },
        spaces: {
          label: "Không gian nào hấp dẫn bạn?",
          options: {
            firstFloor: "Tầng 1",
            secondFloorLounge: "Phòng khách tầng 2",
            secondFloorEvent: "Không gian sự kiện tầng 2",
            rooftopPatio: "Sân thượng",
          },
        },
        spaceScale: {
          label: "Bạn cần bao nhiêu không gian?",
          placeholder: "Ví dụ: một bức tường, một phòng, nửa tầng 2",
        },
        installationNeeds: {
          label: "Có nhu cầu lắp đặt đặc biệt nào không?",
          placeholder: "Cho chúng tôi biết về ánh sáng, tường, nội thất hoặc các yêu cầu khác",
        },
      },
      step3: {
        preferredDates: {
          label: "Bạn muốn triển lãm lúc nào?",
          placeholder: "Ngày ưu tiên hoặc khung thời gian",
        },
        flexibility: {
          label: "Bạn linh hoạt đến mức nào?",
          options: {
            veryFlexible: "Rất linh hoạt",
            somewhatFlexible: "Hơi linh hoạt",
            fixedDates: "Ngày cố định",
          },
        },
        groupShow: {
          label: "Đây có phải là triển lãm nhóm không?",
          options: {
            yes: "Có",
            no: "Không",
          },
        },
        artistCount: {
          label: "Bao nhiêu nghệ sĩ?",
          placeholder: "Nếu đó là một triển lãm nhóm",
        },
        curator: {
          label: "Ai sẽ phối hợp?",
          placeholder: "Tên & email của người biên tập hoặc tổ chức viên (nếu khác từ trên)",
        },
      },
      step4: {
        reviewTitle: "Mọi thứ có trông ổn không?",
        editButton: "Chỉnh sửa",
        submitButton: "Gửi đề xuất",
        guidelinesLink: "Đọc hướng dẫn nghệ sĩ của chúng tôi",
      },
      validation: {
        required: "Trường này là bắt buộc",
        invalidEmail: "Vui lòng nhập địa chỉ email hợp lệ",
      },
      successMessage: "Cảm ơn bạn! Chúng tôi sẽ liên hệ bạn trong vài ngày.",
      errorMessage: "Có gì đó sai. Vui lòng thử lại hoặc liên hệ trực tiếp với chúng tôi.",
      stepOf: "Bước {n} trong {total}",
      stepOfTemplate: {
        step: "Bước",
        of: "trong",
      },
    },
    guidelines: {
      pageTitle: "Hướng dẫn sự kiện",
      backLink: "Quay lại REALITY",
      sections: {
        generalRules: {
          title: "Quy tắc chung",
          content: "Chúng tôi là một không gian cộng đồng, và chúng tôi muốn mọi người cảm thấy chào đón và được tôn trọng. Đây là cách chúng tôi giữ mọi thứ tốt đẹp:\n\n• Tôn trọng những khách khác và nhân viên của chúng tôi. Mọi người đều ở đây để tận hưởng.\n• Giữ mức độ tiếng ồn ở mức vừa phải—chúng tôi là một quán bar, không phải một nightclub. Nếu chúng tôi nói quá to, hãy giảm âm lượng lại.\n• Dọn dẹp sau bạn. Lấy rác của bạn và lau sạch bất kỳ vết bẩn nào bạn tạo ra.\n• Không mang đồ ăn hoặc đồ uống từ ngoài vào trừ khi bạn đã được phê duyệt từ trước bởi đội ngũ.\n• Nếu bạn đang mang theo trẻ em, hãy để mắt đến chúng. Chúng tôi không phải là nhà trẻ.\n• Chỉ những con thú cưng nhỏ, có dây dắt và ngoan ngoãn. Và chỉ khi chúng ở gần bạn.\n• Không có ma túy hoặc hoạt động bất hợp pháp. Bao giờ.",
        },
        publicEvents: {
          title: "Sự kiện cộng đồng công khai & miễn phí",
          content: "Chúng tôi yêu thích tổ chức các sự kiện cộng đồng miễn phí. Nó là một phần của sứ mệnh của chúng tôi. Đây là những gì chúng tôi mong đợi:\n\n• Sự kiện phải miễn phí hoặc giá thấp và mở cửa cho công chúng.\n• Bạn chịu trách nhiệm quảng bá sự kiện của mình—chúng tôi sẽ giúp, nhưng chúng tôi không thể làm nặng.\n• Lên kế hoạch dọn dẹp. Sự kiện của bạn, bẩn của bạn, trách nhiệm của bạn.\n• Đảm bảo nó phù hợp với vibe của chúng tôi. REALITY là một không gian chào đón, sáng tạo cho người lớn và gia đình.\n• Nếu bạn đang phục vụ rượu, bạn cần xử lý nó hợp pháp và có trách nhiệm.\n• Cho chúng tôi biết nếu bạn mong đợi một đám đông lớn. Chúng tôi cần đảm bảo rằng không gian không bị quá đặt hàng.",
        },
        privateEvents: {
          title: "Sự kiện riêng tư & sinh lợi",
          content: "Bạn muốn tổ chức một bữa tiệc riêng tư hoặc workshop có phí? Tuyệt vời. Chúng tôi có thể làm cho nó xảy ra.\n\n• Các sự kiện riêng tư diễn ra ngoài giờ bình thường hoặc trong một không gian dành riêng.\n• Chúng tôi tính phí cho việc cho thuê không gian. Hãy thảo luận chi tiết.\n• Để có vé hoặc sự kiện sinh lợi, chúng tôi thường nhận một phần nhỏ từ doanh thu. Điều này bao gồm chi phí của chúng tôi và giữ cho không gian chạy.\n• Bạn vẫn chịu trách nhiệm về vibe và dọn dẹp.\n• Riêng tư không có nghĩa là bạn có thể phá vỡ các quy tắc. Sự tôn trọng và trách nhiệm vẫn còn quan trọng.",
        },
        classes: {
          title: "Dạy các lớp & Workshop",
          content: "Bạn muốn dạy cái gì đó? Yoga, nghệ thuật, ngôn ngữ, âm nhạc, kinh doanh? Chúng tôi sẽ bỏ phiếu cho nó.\n\n• Các lớp hoạt động tốt nhất trên lịch biểu thường xuyên. Hàng tuần là lý tưởng.\n• Chúng tôi có thể giúp bạn đến được từ, nhưng bạn cần phải làm một số quảng bá quá.\n• Tính phí cho lớp của bạn là hoàn toàn tốt—chỉ cần làm việc với chia sẻ doanh thu với chúng tôi.\n• Thiết lập sớm, dọn dẹp sau. Chúng tôi sẽ giúp với nội thất nếu bạn cần nó.\n• Giữ nó lạnh. Tôn trọng không gian và những người khác sử dụng REALITY trong khi bạn dạy.",
        },
        branding: {
          title: "Sử dụng thương hiệu REALITY",
          content: "Nếu bạn đang quảng bá sự kiện của bạn tại REALITY hoặc trong quan hệ đối tác với chúng tôi, hãy tuân theo các quy tắc này:\n\n• Chỉ sử dụng logo của chúng tôi với sự cho phép. Hỏi trước.\n• Nói sự thật về REALITY. Đừng bán quá mức những gì chúng tôi cung cấp.\n• Nếu bạn quảng cáo là 'được trình bày bởi REALITY' hoặc tương tự, hãy đảm bảo chúng tôi thực sự đã đồng ý với mức độ kỳ lân đó.\n• Đừng sử dụng REALITY để quảng bá cái gì đó không phù hợp với giá trị cộng đồng của chúng tôi.\n• Hãy tính chúng tôi. Nếu chúng tôi đang giúp bạn, hãy đề cập đến chúng tôi. Gắn thẻ chúng tôi trên phương tiện truyền thông xã hội, đề cập đến chúng tôi trong email.",
        },
        promotion: {
          title: "Cách chúng tôi quảng bá",
          content: "Chúng tôi đầu tư vào việc làm cho sự kiện của bạn tuyệt vời. Đây là cách chúng tôi thường giúp:\n\n• Shout-outs trên phương tiện truyền thông xã hội trên Instagram và Facebook của chúng tôi (nếu nó phù hợp với vibe của chúng tôi).\n• Cập nhật cộng đồng WhatsApp cho những người theo dõi của chúng tôi.\n• Đề cập đến sự kiện của bạn trong email hoặc trên trang web của chúng tôi.\n• Miệng miệng từ nhân viên và những khách hàng thường xuyên.\n• Chúng tôi không thể đảm bảo lượt chuyển đổi khổng lồ, nhưng chúng tôi sẽ cố gắng hết sức để truyền bá từ. Bạn cũng nên quảng bá.",
        },
        checklist: {
          title: "Danh sách kiểm tra ngày sự kiện",
          content: "Tuần trước:\n• Xác nhận số lượng cuối cùng và lịch trình với đội REALITY.\n• Quảng bá sự kiện của bạn rất nhiều.\n• Kiểm tra xem tất cả các thiết bị bạn cần có sẵn không.\n\nNgày hôm đó:\n• Đến sớm. Thiết lập và kiểm tra âm thanh nếu bạn cần nó.\n• Đi bộ qua không gian và đảm bảo nó hoạt động cho sự kiện của bạn.\n• Cho đội của bạn biết (nếu bạn có) về vibe và bất kỳ logistic nào.\n• Kiểm tra với nhân viên REALITY 30 phút trước khi bạn bắt đầu.\n\nDuring:\n• Giữ cho mọi thứ chạy. Chúng tôi ở đây để giúp, nhưng đó là sự kiện của bạn.\n• Để mắt đến đám đông và vibe.\n• Sẵn sàng thích ứng nếu một cái gì đó thay đổi.\n\nSau:\n• Gói các thứ của bạn. Trả lại thiết bị vay.\n• Làm một dọn dẹp nhanh chóng. Lau xuống, lấy rác, sắp xếp lại nội thất.\n• Cảm ơn đội REALITY. Nghiêm túc.\n• Cho chúng tôi biết nó đã xảy ra như thế nào. Chúng tôi rất muốn biết những gì hoạt động và những gì không.",
        },
      },
      ctaText: "Sẵn sàng đề xuất sự kiện?",
    },
    hostGuide: {
      pageTitle: "Hướng dẫn tổ chức sự kiện",
      comingSoon: "Hướng dẫn này sẽ sớm ra mắt. Hãy quay lại sớm!",
      backLink: "Quay lại REALITY",
    },
  },
};
