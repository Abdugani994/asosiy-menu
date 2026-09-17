const { Telegraf, Markup } = require('telegraf');
const express = require('express');
require('dotenv').config();

// O'zgaruvchilar
const BOT_TOKEN = process.env.BOT_TOKEN;
const WEB_APP_URL = process.env.WEB_APP_URL || 'https://t.me/your_bot/app';
const PAYMENT_BOT_URL = process.env.PAYMENT_BOT_URL || 'https://t.me/your_payment_bot';
const ADMIN_USERNAME = (process.env.ADMIN_USERNAME || 'Server_9401').replace('@', '');
const ADMIN_ID = Number(process.env.ADMIN_ID) || 0;

const bot = new Telegraf(BOT_TOKEN);

// Express HTTP Server (Render to'xtab qolmasligi uchun)
const app = express();
const PORT = process.env.PORT || 10000;

app.get('/', (req, res) => {
  res.send('Bot muvaffaqiyatli ishlamoqda!');
});

app.listen(PORT, () => {
  console.log(`Server ${PORT}-portda tinglanmoqda`);
});

// /start komandasi
bot.start((ctx) => {
  const isUserAdmin = ctx.from.id === ADMIN_ID;

  let keyboard = [
    [Markup.button.webApp('🚀 Web App-ni ochish', WEB_APP_URL)],
    ['💳 Obunalar', '📖 Yordam'],
    ['📞 Kontakt']
  ];

  // Agar siz (Admin) bo'lsangiz, Admin Panel tugmasi chiqadi
  if (isUserAdmin) {
    keyboard.push(['⚙️ Admin Panel']);
  }

  ctx.reply(
    `Xush kelibsiz, ${ctx.from.first_name}!\n\n"My Vocabularies" botiga xush kelibsiz. Kerakli bo'limni tanlang:`,
    Markup.keyboard(keyboard).resize()
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
  const text = "📞 **Qo'llab-quvvatlash xizmati**\n\nSavollar yoki takliflar bo'lsa, adminga murojaat qiling:";

  ctx.reply(text, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [Markup.button.url("💬 Admin bilan bog'lanish", `https://t.me/${ADMIN_USERNAME}`)]
    ])
  });
});

// ⚙️ Admin Panel
bot.hears('⚙️ Admin Panel', (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;

  ctx.reply("🛠 **Admin Panel:**\n\nBo'limni tanlang:", {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [Markup.button.callback('📊 Statistika', 'admin_stats')]
    ])
  });
});

bot.action('admin_stats', (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;
  ctx.answerCbQuery();
  ctx.reply('📊 Bot faol holatda ishlamoqda.');
});

// Botni ishga tushirish
bot.launch();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
