const { Telegraf, Markup } = require('telegraf');
const express = require('express');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const { BOOKS, TRANSLATIONS } = require('./books');

const BOT_TOKEN = process.env.BOT_TOKEN;
const WEB_APP_URL = process.env.WEB_APP_URL || 'https://t.me/your_bot/app';
const ADMIN_ID = Number(process.env.ADMIN_ID) || 651936747;

const bot = new Telegraf(BOT_TOKEN);
const DB_FILE = path.join(__dirname, 'users.json');

// Bazadan o'qish va saqlash
function getUsers() {
  if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify([]));
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch (err) {
    return [];
  }
}

function saveUsers(users) {
  fs.writeFileSync(DB_FILE, JSON.stringify(users, null, 2));
}

function getUser(id) {
  return getUsers().find(u => u.id === id);
}

function updateUser(userObj) {
  const users = getUsers();
  const idx = users.findIndex(u => u.id === userObj.id);
  if (idx !== -1) {
    users[idx] = { ...users[idx], ...userObj };
  } else {
    users.push({
      id: userObj.id,
      first_name: userObj.first_name || '',
      last_name: userObj.last_name || '',
      username: userObj.username ? `@${userObj.username}` : 'Mavjud emas',
      lang: 'uz',
      is_premium: false,
      subscriptions: [],
      joined_at: new Date().toISOString()
    });
  }
  saveUsers(users);
}

// Holatlarni saqlash
const userStates = {};
const adminStates = {};

// Express server
const app = express();
app.get('/', (req, res) => res.send('Bot ishlamoqda!'));
app.listen(process.env.PORT || 10000);

// Klaviatura yasash
function getMainKeyboard(ctx) {
  const u = getUser(ctx.from.id) || { lang: 'uz' };
  const lang = u.lang || 'uz';
  const t = TRANSLATIONS[lang] || TRANSLATIONS.uz;

  let kb = [
    [Markup.button.webApp(t.btn_app, WEB_APP_URL)],
    [t.btn_sub, t.btn_help],
    [t.btn_contact, t.btn_more],
    [t.btn_lang]
  ];

  if (ctx.from.id === ADMIN_ID) {
    kb.push(['⚙️ Admin Panel']);
  }

  return Markup.keyboard(kb).resize();
}

// /start
bot.start((ctx) => {
  updateUser(ctx.from);
  const u = getUser(ctx.from.id);
  const t = TRANSLATIONS[u.lang || 'uz'];
  ctx.reply(t.welcome, getMainKeyboard(ctx));
});

// Tilni tanlash
bot.hears(['🌐 Tilni o\'zgartirish', '🌐 Change Language', '🌐 Изменить язык'], (ctx) => {
  ctx.reply("Tilni tanlang / Select language / Выберите язык:", Markup.inlineKeyboard([
    [Markup.button.callback('🇺🇿 O\'zbekcha', 'set_lang_uz')],
    [Markup.button.callback('🇬🇧 English', 'set_lang_en')],
    [Markup.button.callback('🇷🇺 Русский', 'set_lang_ru')]
  ]));
});

bot.action(/set_lang_(uz|en|ru)/, (ctx) => {
  const lang = ctx.match[1];
  const u = getUser(ctx.from.id) || { id: ctx.from.id };
  u.lang = lang;
  updateUser(u);
  ctx.answerCbQuery();
  ctx.reply(TRANSLATIONS[lang].welcome, getMainKeyboard(ctx));
});

// User Menyular
bot.hears([TRANSLATIONS.uz.btn_sub, TRANSLATIONS.en.btn_sub, TRANSLATIONS.ru.btn_sub], (ctx) => {
  const u = getUser(ctx.from.id);
  const t = TRANSLATIONS[u.lang || 'uz'];
  ctx.reply(t.sub_text, { parse_mode: 'Markdown' });
});

bot.hears([TRANSLATIONS.uz.btn_help, TRANSLATIONS.en.btn_help, TRANSLATIONS.ru.btn_help], (ctx) => {
  const u = getUser(ctx.from.id);
  const t = TRANSLATIONS[u.lang || 'uz'];
  ctx.reply(t.help_text, { parse_mode: 'Markdown' });
});

bot.hears([TRANSLATIONS.uz.btn_more, TRANSLATIONS.en.btn_more, TRANSLATIONS.ru.btn_more], (ctx) => {
  const u = getUser(ctx.from.id);
  const t = TRANSLATIONS[u.lang || 'uz'];
  ctx.reply(t.more_text, { parse_mode: 'Markdown' });
});

// 📞 KONTAKT: Adminga xabar yuborish rejimini yoqish
bot.hears([TRANSLATIONS.uz.btn_contact, TRANSLATIONS.en.btn_contact, TRANSLATIONS.ru.btn_contact], (ctx) => {
  const u = getUser(ctx.from.id);
  const t = TRANSLATIONS[u.lang || 'uz'];
  userStates[ctx.from.id] = { action: 'awaiting_feedback' };
  ctx.reply(t.contact_text, { parse_mode: 'Markdown' });
});

// --- ADMIN PANEL ---
bot.hears('⚙️ Admin Panel', (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;

  ctx.reply("🛠 **Admin Panel:**", {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [Markup.button.callback('👥 Obunachilar Ro\'yxati', 'admin_users')],
      [Markup.button.callback('⭐ Premium Obunachilar', 'admin_premiums')],
      [Markup.button.callback('➕ Premium Boshqaruvi', 'admin_manage_prem')],
      [Markup.button.callback('📢 Xabar Yuborish', 'admin_broadcast_menu')]
    ])
  });
});

bot.action('admin_users', (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;
  ctx.answerCbQuery();
  const users = getUsers();
  let msg = `👥 **Jami obunachilar:** ${users.length} ta\n\n`;
  users.forEach((u, i) => {
    msg += `${i + 1}. **${u.first_name}** | ID: \`${u.id}\` | ${u.username}\n`;
  });
  ctx.reply(msg, { parse_mode: 'Markdown' });
});

bot.action('admin_premiums', (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;
  ctx.answerCbQuery();
  const prems = getUsers().filter(u => u.is_premium);
  let msg = `⭐ **Premium obunachilar:** ${prems.length} ta\n\n`;
  prems.forEach((u, i) => {
    msg += `${i + 1}. **${u.first_name}** | ID: \`${u.id}\` | ${u.username}\n`;
  });
  ctx.reply(msg, { parse_mode: 'Markdown' });
});

bot.action('admin_manage_prem', (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;
  ctx.answerCbQuery();
  adminStates[ADMIN_ID] = { action: 'awaiting_target_id' };
  ctx.reply("✏️ Boshqarmoqchi bo'lgan foydalanuvchining **Telegram ID** raqamini kiriting:");
});

bot.action('admin_broadcast_menu', (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;
  ctx.answerCbQuery();
  ctx.reply("📢 Xabar tarqatish turini tanlang:", Markup.inlineKeyboard([
    [Markup.button.callback('🌐 Barchaga Yuborish', 'send_to_all')],
    [Markup.button.callback('👤 Alohida Foydalanuvchiga Yuborish', 'send_to_one')]
  ]));
});

bot.action('send_to_all', (ctx) => {
  adminStates[ADMIN_ID] = { action: 'awaiting_broadcast' };
  ctx.reply("📢 Barcha obunachilarga yubormoqchi bo'lgan xabaringizni yuboring:");
});

bot.action('send_to_one', (ctx) => {
  adminStates[ADMIN_ID] = { action: 'awaiting_single_id' };
  ctx.reply("👤 Qaysi **ID** egasiga xabar yubormoqchisiz? ID raqamni kiriting:");
});

// Admin Reply va Ignore tugmalari
bot.action(/reply_to_(\d+)/, (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;
  const targetId = Number(ctx.match[1]);
  adminStates[ADMIN_ID] = { action: 'awaiting_reply_msg', targetId };
  ctx.answerCbQuery();
  ctx.reply(`✍️ ID: \`${targetId}\` bo'lgan foydalanuvchiga javob xabaringizni yozing:`, { parse_mode: 'Markdown' });
});

bot.action(/ignore_msg_(\d+)/, (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;
  ctx.answerCbQuery("Xabar e'tiborsiz qoldirildi.");
  ctx.editMessageText(ctx.callbackQuery.message.text + "\n\n❌ *E'tiborsiz qoldirildi*", { parse_mode: 'Markdown' });
});

bot.action(/toggle_prem_(\d+)/, (ctx) => {
  const targetId = Number(ctx.match[1]);
  const u = getUser(targetId);
  if (!u) return ctx.reply("Foydalanuvchi topilmadi.");

  u.is_premium = !u.is_premium;
  updateUser(u);

  ctx.answerCbQuery();
  ctx.reply(`Status o'zgartirildi: ${u.is_premium ? '⭐ Premium' : 'Oddiy'}\n\nEndi kitob obunasini tanlang:`,
    Markup.inlineKeyboard(
      BOOKS.map(b => [Markup.button.callback(b.title, `toggle_book_${targetId}_${b.id}`)])
    )
  );
});

bot.action(/toggle_book_(\d+)_(.+)/, (ctx) => {
  const targetId = Number(ctx.match[1]);
  const bookId = ctx.match[2];
  ctx.answerCbQuery();
  ctx.reply(`✅ ID: \`${targetId}\` foydalanuvchisiga **${bookId}** kitobi obunasi biriktirildi!`, { parse_mode: 'Markdown' });
});

// MESSAGE HANDLER (Xabarlarni ushlash)
bot.on('message', async (ctx, next) => {
  updateUser(ctx.from);

  // 1. Foydalanuvchi Adminga murojaat yuborganda
  const uState = userStates[ctx.from.id];
  if (uState && uState.action === 'awaiting_feedback' && ctx.from.id !== ADMIN_ID) {
    delete userStates[ctx.from.id];

    // Xabarni adminga yetkazish
    await ctx.telegram.sendMessage(
      ADMIN_ID,
      `📩 **Yangi Murojaat!**\n\n` +
      `👤 **Kimdan:** ${ctx.from.first_name} ${ctx.from.last_name || ''}\n` +
      `🆔 **ID:** \`${ctx.from.id}\`\n` +
      `🌐 **Username:** @${ctx.from.username || 'mavjud_emas'}\n\n` +
      `💬 **Xabar:**\n${ctx.message.text || '[Media xabar]'}`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('💬 Javob berish', `reply_to_${ctx.from.id}`)],
          [Markup.button.callback('❌ E\'tiborsiz qoldirish', `ignore_msg_${ctx.from.id}`)]
        ])
      }
    );

    return ctx.reply("✅ Xabaringiz adminga yetkazildi. Tez orada javob olasiz!");
  }

  // 2. Admin amallari
  const aState = adminStates[ctx.from.id];
  if (!aState || ctx.from.id !== ADMIN_ID) return next();

  // Admin foydalanuvchiga javob yozganda
  if (aState.action === 'awaiting_reply_msg') {
    const targetId = aState.targetId;
    delete adminStates[ctx.from.id];

    try {
      await ctx.telegram.sendMessage(targetId, `💬 **Admin javobi:**\n\n${ctx.message.text}`);
      return ctx.reply(`✅ Javob ID: \`${targetId}\` egasiga yuborildi!`, { parse_mode: 'Markdown' });
    } catch (e) {
      return ctx.reply("❌ Javob yuborishda xatolik. Foydalanuvchi botni bloklagan bo'lishi mumkin.");
    }
  }

  // Admin ID kiritganda Premium Boshqaruvi
  if (aState.action === 'awaiting_target_id') {
    const targetId = Number(ctx.message.text);
    delete adminStates[ctx.from.id];
    const targetUser = getUser(targetId);

    if (!targetUser) return ctx.reply("❌ Bu ID foydalanuvchilar bazasida topilmadi!");

    return ctx.reply(
      `👤 **Foydalanuvchi:** ${targetUser.first_name}\nID: \`${targetUser.id}\`\nHolati: ${targetUser.is_premium ? '⭐ Premium' : 'Oddiy'}`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback(targetUser.is_premium ? '❌ Premiumdan chiqarish' : '⭐ Premiumga o\'tkazish', `toggle_prem_${targetId}`)]
        ])
      }
    );
  }

  // Barchaga xabar
  if (aState.action === 'awaiting_broadcast') {
    delete adminStates[ctx.from.id];
    const users = getUsers();
    let c = 0;
    for (const u of users) {
      try { await ctx.copyMessage(u.id); c++; } catch (e) {}
    }
    return ctx.reply(`✅ Xabar ${c} ta foydalanuvchiga yetkazildi!`);
  }

  // Alohida xabar uchun ID
  if (aState.action === 'awaiting_single_id') {
    const targetId = Number(ctx.message.text);
    adminStates[ctx.from.id] = { action: 'awaiting_single_msg', targetId };
    return ctx.reply(`Siz ID: \`${targetId}\` ni kiritdingiz. Endi xabaringizni yuboring:`);
  }

  if (aState.action === 'awaiting_single_msg') {
    const targetId = aState.targetId;
    delete adminStates[ctx.from.id];
    try {
      await ctx.copyMessage(targetId);
      return ctx.reply(`✅ ID \`${targetId}\` ga xabar yuborildi!`);
    } catch (e) {
      return ctx.reply("❌ Xabar yuborib bo'lmadi.");
    }
  }

  return next();
});

bot.launch();
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
