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

// Bazadan xatosiz o'qish va saqlash
function getUsers() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2), 'utf8');
      return [];
    }
    const data = fs.readFileSync(DB_FILE, 'utf8');
    return data ? JSON.parse(data) : [];
  } catch (err) {
    console.error("Fayl o'qishda xatolik:", err);
    return [];
  }
}

function saveUsers(users) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(users, null, 2), 'utf8');
  } catch (err) {
    console.error("Faylga yozishda xatolik:", err);
  }
}

function getUser(id) {
  return getUsers().find(u => Number(u.id) === Number(id));
}

function updateUser(userObj) {
  if (!userObj || !userObj.id) return;

  const users = getUsers();
  const idx = users.findIndex(u => Number(u.id) === Number(userObj.id));

  if (idx !== -1) {
    users[idx] = {
      ...users[idx],
      first_name: userObj.first_name || users[idx].first_name,
      last_name: userObj.last_name || users[idx].last_name,
      username: userObj.username ? `@${userObj.username}` : users[idx].username,
      is_premium: typeof userObj.is_premium !== 'undefined' ? userObj.is_premium : users[idx].is_premium,
      subscriptions: userObj.subscriptions || users[idx].subscriptions || []
    };
  } else {
    users.push({
      id: Number(userObj.id),
      first_name: userObj.first_name || '',
      last_name: userObj.last_name || '',
      username: userObj.username ? `@${userObj.username}` : 'Mavjud emas',
      lang: 'uz',
      is_premium: userObj.is_premium || false,
      subscriptions: userObj.subscriptions || [],
      joined_at: new Date().toISOString()
    });
  }
  saveUsers(users);
}

// --- MUDDATLARNI HISOBLASH VA AVTO-TOZALASH ---
function getRemainingDays(expiresAt) {
  if (!expiresAt) return 30;
  const now = new Date();
  const exp = new Date(expiresAt);
  const diffTime = exp - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
}

function cleanExpiredSubscriptions(userId) {
  const users = getUsers();
  const user = users.find(u => Number(u.id) === Number(userId));
  if (!user || !user.subscriptions || !Array.isArray(user.subscriptions)) return user;

  const initialCount = user.subscriptions.length;
  user.subscriptions = user.subscriptions.filter(sub => {
    if (typeof sub === 'string') return true;
    return getRemainingDays(sub.expires_at) > 0;
  });

  if (user.subscriptions.length === 0) {
    user.is_premium = false;
  }

  if (user.subscriptions.length !== initialCount) {
    saveUsers(users);
  }
  return user;
}

// Holatlarni saqlash
const userStates = {};
const adminStates = {};

// Express server (Render keep-alive)
const app = express();
app.get('/', (req, res) => res.send('Bot ishlamoqda!'));
app.listen(process.env.PORT || 10000);

// Asosiy klaviatura
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

// Dinamik Obunalar bo'limi (Kitoblar alohida ko'rinishda va muddatlari bilan)
bot.hears([TRANSLATIONS.uz.btn_sub, TRANSLATIONS.en.btn_sub, TRANSLATIONS.ru.btn_sub], (ctx) => {
  const u = cleanExpiredSubscriptions(ctx.from.id);
  const lang = u ? (u.lang || 'uz') : 'uz';

  if (u && u.is_premium && u.subscriptions && u.subscriptions.length > 0) {
    let responseText = "";

    if (lang === 'uz') {
      responseText = `📊 **Sizning obunangiz:**\n\n⭐ Status: **Premium**\n📚 **Kitoblar:**\n\n`;
      u.subscriptions.forEach((sub, idx) => {
        const title = typeof sub === 'string' ? sub : sub.book_title;
        const daysLeft = typeof sub === 'string' ? 30 : getRemainingDays(sub.expires_at);
        responseText += `${idx + 1}. 📙 **${title}**\n⏳ Qolgan muddat: **${daysLeft} kun**\n_________________________\n\n`;
      });
    } else if (lang === 'en') {
      responseText = `📊 **Your Subscription:**\n\n⭐ Status: **Premium**\n📚 **Books:**\n\n`;
      u.subscriptions.forEach((sub, idx) => {
        const title = typeof sub === 'string' ? sub : sub.book_title;
        const daysLeft = typeof sub === 'string' ? 30 : getRemainingDays(sub.expires_at);
        responseText += `${idx + 1}. 📙 **${title}**\n⏳ Days remaining: **${daysLeft} days**\n_________________________\n\n`;
      });
    } else {
      responseText = `📊 **Ваша подписка:**\n\n⭐ Статус: **Premium**\n📚 **Книги:**\n\n`;
      u.subscriptions.forEach((sub, idx) => {
        const title = typeof sub === 'string' ? sub : sub.book_title;
        const daysLeft = typeof sub === 'string' ? 30 : getRemainingDays(sub.expires_at);
        responseText += `${idx + 1}. 📙 **${title}**\n⏳ Осталось дней: **${daysLeft} дней**\n_________________________\n\n`;
      });
    }

    ctx.reply(responseText, { parse_mode: 'Markdown' });
  } else {
    let noSubText = "";
    if (lang === 'uz') {
      noSubText = `📊 **Sizning obunangiz:**\n\n❌ Sizda hozircha faol obuna mavjud emas.\n\nObuna bo'lish uchun adminga murojaat qiling yoki **📞 Kontakt** bo'limi orqali xabar yuboring.`;
    } else if (lang === 'en') {
      noSubText = `📊 **Your Subscription:**\n\n❌ You do not have an active subscription yet.\n\nTo subscribe, please contact the admin via the **📞 Contact** section.`;
    } else {
      noSubText = `📊 **Ваша подписка:**\n\n❌ У вас пока нет активной подписки.\n\nЧтобы оформить подписку, свяжитесь с администратором через раздел **📞 Контакт**.`;
    }

    ctx.reply(noSubText, { parse_mode: 'Markdown' });
  }
});

bot.hears([TRANSLATIONS.uz.btn_help, TRANSLATIONS.en.btn_help, TRANSLATIONS.ru.btn_help], (ctx) => {
  const u = getUser(ctx.from.id);
  const t = TRANSLATIONS[u ? u.lang || 'uz' : 'uz'];
  ctx.reply(t.help_text, { parse_mode: 'Markdown' });
});

bot.hears([TRANSLATIONS.uz.btn_more, TRANSLATIONS.en.btn_more, TRANSLATIONS.ru.btn_more], (ctx) => {
  const u = getUser(ctx.from.id);
  const t = TRANSLATIONS[u ? u.lang || 'uz' : 'uz'];
  ctx.reply(t.more_text, { parse_mode: 'Markdown' });
});

// Kontakt: Ticket tizimi
bot.hears([TRANSLATIONS.uz.btn_contact, TRANSLATIONS.en.btn_contact, TRANSLATIONS.ru.btn_contact], (ctx) => {
  updateUser(ctx.from);
  const u = getUser(ctx.from.id);
  const t = TRANSLATIONS[u ? u.lang || 'uz' : 'uz'];
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

// Admin Reply/Ignore
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

// Premium va Kitob biriktirish tugmalari hodisasi
bot.action(/toggle_prem_(\d+)/, (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;

  const targetId = Number(ctx.match[1]);
  const u = cleanExpiredSubscriptions(targetId);
  if (!u) {
    ctx.answerCbQuery("Foydalanuvchi topilmadi!");
    return;
  }

  u.is_premium = !u.is_premium;
  if (!u.is_premium) {
    u.subscriptions = [];
  }
  updateUser(u);

  ctx.answerCbQuery("Status o'zgardi!");

  const bookButtons = BOOKS.map(b => {
    const isSubscribed = u.subscriptions && u.subscriptions.some(s => (typeof s === 'string' ? s : s.book_title) === b.title);
    return [
      Markup.button.callback(
        `${isSubscribed ? '✅' : '➕'} ${b.title}`,
        `toggle_book_${targetId}_${b.id}`
      )
    ];
  });

  ctx.reply(
    `👤 **Foydalanuvchi:** ${u.first_name}\n` +
    `⭐ **Status:** ${u.is_premium ? 'Premium ACTIVE' : 'Oddiy'}\n\n` +
    `Endi foydalanuvchiga biriktirmoqchi bo'lgan kitobingizni bosing:`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(bookButtons)
    }
  );
});

bot.action(/toggle_book_(\d+)_(.+)/, (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;

  const targetId = Number(ctx.match[1]);
  const bookId = ctx.match[2];

  const u = getUser(targetId);
  const bookObj = BOOKS.find(b => b.id === bookId);

  if (!u || !bookObj) {
    ctx.answerCbQuery("Xatolik yuz berdi!");
    return;
  }

  if (!Array.isArray(u.subscriptions)) {
    u.subscriptions = [];
  }

  const bookTitle = bookObj.title;
  const existsIndex = u.subscriptions.findIndex(s => (typeof s === 'string' ? s : s.book_title) === bookTitle);

  if (existsIndex > -1) {
    u.subscriptions.splice(existsIndex, 1);
  } else {
    // Odatiy 30 kunlik muddat biriktiriladi
    const expireDate = new Date();
    expireDate.setDate(expireDate.getDate() + 30);

    u.subscriptions.push({
      book_id: bookObj.id,
      book_title: bookTitle,
      expires_at: expireDate.toISOString()
    });
  }

  u.is_premium = u.subscriptions.length > 0;
  updateUser(u);

  ctx.answerCbQuery("Obuna yangilandi!");

  let activeList = u.subscriptions.map((s, idx) => {
    const title = typeof s === 'string' ? s : s.book_title;
    const days = typeof s === 'string' ? 30 : getRemainingDays(s.expires_at);
    return `\n${idx + 1}. 📙 ${title} (${days} kun)`;
  }).join('');

  ctx.reply(
    `✅ **Muvaffaqiyatli saqlandi!**\n\n` +
    `👤 **Foydalanuvchi:** ${u.first_name} (\`${u.id}\`)\n` +
    `⭐ **Status:** ${u.is_premium ? 'Premium' : 'Oddiy'}\n` +
    `📚 **Aktiv kitoblari:** ${activeList || 'Mavjud emas'}`,
    { parse_mode: 'Markdown' }
  );
});

// Message Listener
bot.on('message', async (ctx, next) => {
  updateUser(ctx.from);

  // 1. Foydalanuvchi Murojaati
  const uState = userStates[ctx.from.id];
  if (uState && uState.action === 'awaiting_feedback' && ctx.from.id !== ADMIN_ID) {
    delete userStates[ctx.from.id];

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

  if (aState.action === 'awaiting_broadcast') {
    delete adminStates[ctx.from.id];
    const users = getUsers();
    let c = 0;
    for (const u of users) {
      try { await ctx.copyMessage(u.id); c++; } catch (e) {}
    }
    return ctx.reply(`✅ Xabar ${c} ta foydalanuvchiga yetkazildi!`);
  }

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
