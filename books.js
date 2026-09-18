const BOOKS = [
  { id: 'eew_1', title: '4000 Essential English Words 1' },
  { id: 'eew_2', title: '4000 Essential English Words 2' },
  { id: 'eew_3', title: '4000 Essential English Words 3' },
  { id: 'eew_4', title: '4000 Essential English Words 4' },
  { id: 'eew_5', title: '4000 Essential English Words 5' },
  { id: 'eew_6', title: '4000 Essential English Words 6' }
];

const TRANSLATIONS = {
  uz: {
    welcome: "Xush kelibsiz! Kerakli bo'limni tanlang:",
    btn_app: "🚀 My Vocabularies",
    btn_sub: "💳 Obunalar",
    btn_help: "📖 Yordam",
    btn_contact: "📞 Kontakt",
    btn_more: "🌐 More (Loyiha haqida)",
    btn_lang: "🌐 Tilni o'zgartirish",
    help_text: "📖 **Qo'llanma va video darsliklar:**\n\n1. Botdan foydalanish video yo'riqnomasi\n2. Obuna bo'lish video yo'riqnomasi",
    contact_text: "📞 **Adminga xabar yuborish:**\n\nSavolingiz yoki murojaatingizni yozib yuboring. Admin tez orada javob beradi.",
    more_text: "🌐 **Bizning boshqa loyihalarimiz va kanallarimiz:**\n\n• Telegram Kanal: @myvocabularies\n• YouTube: @myvocabularies"
  },
  en: {
    welcome: "Welcome! Choose a section:",
    btn_app: "🚀 My Vocabularies",
    btn_sub: "💳 Subscriptions",
    btn_help: "📖 Help",
    btn_contact: "📞 Contact",
    btn_more: "🌐 More Info",
    btn_lang: "🌐 Change Language",
    help_text: "📖 **Guides & Video Tutorials:**\n\n1. How to use the bot\n2. How to subscribe",
    contact_text: "📞 **Contact Support:**\n\nPlease send your message or question below. Admin will reply soon.",
    more_text: "🌐 **Our other projects and channels:**\n\n• Telegram Channel: @myvocabularies\n• YouTube: @myvocabularies"
  },
  ru: {
    welcome: "Добро пожаловать! Выберите раздел:",
    btn_app: "🚀 My Vocabularies",
    btn_sub: "💳 Подписки",
    btn_help: "📖 Помощь",
    btn_contact: "📞 Контакт",
    btn_more: "🌐 Дополнительно",
    btn_lang: "🌐 Изменить язык",
    help_text: "📖 **Инструкции и видеоуроки:**\n\n1. Как пользоваться ботом\n2. Как оформить подписку",
    contact_text: "📞 **Связь с администратором:**\n\nНапишите ваше сообщение или вопрос. Админ ответит в ближайшее время.",
    more_text: "🌐 **Наши другие проекты и каналы:**\n\n• Telegram Канал: @myvocabularies\n• YouTube: @myvocabularies"
  }
};

module.exports = { BOOKS, TRANSLATIONS };
