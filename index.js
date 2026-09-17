const { Telegraf, Markup } = require('telegraf');
require('dotenv').config();

// Configuration (O'zgaruvchilar)
const BOT_TOKEN = process.env.BOT_TOKEN;
const WEB_APP_URL = process.env.WEB_APP_URL || 'https://t.me/your_bot/app';
const PAYMENT_BOT_URL = process.env.PAYMENT_BOT_URL || 'https://t.me/your_payment_bot';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'your_admin_username';

const bot = new Telegraf(BOT_TOKEN);

// Main Reply Keyboard (Asosiy Menyu)
const mainMenu = Markup.keyboard([
  [Markup.button.webApp('🚀 Web App-ni ochish', WEB_APP_URL)],
  ['💳 Obunalar', '📖 Yordam'],
  ['📞 Kontakt']
]).resize();

// /start komandasi
bot.start((ctx) => {
  ctx.reply(
    `Xush kelibsiz, ${ctx.from.first_name}!\n\n"My Vocabularies" botiga xush kelibsiz. Kerakli bo'limni tanlang:`,
    mainMenu
  );
});

// 💳 Obunalar bo'limi
bot.hears('💳 Obunalar', (ctx) => {
  const text = `📊 **Sizning obuna holatingiz:** Noma'lum\n\nObunani faollashtirish yoki uzaytirish uchun rasmiy toʻlov botimizga oʻting:`;
  
  ctx.reply(text, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [Markup.button.url('💳 Toʻlov qilish botiga oʻtish', PAYMENT_BOT_URL)]
    ])
  });
});

// 📖 Yordam bo'limi
bot.hears('📖 Yordam', (ctx) => {
  const text = `📖 **Botdan foydalanish yo'riqnomasi:**\n\n` +
    `1. **🚀 Web App** tugmasini bosing va lug'at bo'limiga o'ting.\n` +
    `2. So'zlarni yodlang va mashqlarni bajaring.\n` +
    `3. Obuna muddatini uzaytirish uchun **💳 Obunalar** bo'limidan foydalaning.`;

  ctx.reply(text, { parse_mode: 'Markdown' });
});

// 📞 Kontakt bo'limi
bot.hears('📞 Kontakt', (ctx) => {
  const text = `📞 **Qo'llab-quvvatlash xizmati**\n\nSavollar yoki takliflar bo'lsa, adminga murojaat qiling:`;

  ctx.reply(text, {
    ...Markup.inlineKeyboard([
      [Markup.button.url('💬 Admin bilan bog'lanish', `https://t.me/${ADMIN_USERNAME}`)]
    ])
  });
});

// Botni ishga tushirish
bot.launch();
console.log('Bot muvaffaqiyatli ishga tushdi!');

// Process termination handler
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
