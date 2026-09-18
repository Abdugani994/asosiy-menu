const { Telegraf, Markup } = require('telegraf');
const fs = require('fs');
const path = require('path');

const BOT_TOKEN = process.env.BOT_TOKEN || "BOT_TOKENINGIZNI_YOZING";
const ADMIN_ID = Number(process.env.ADMIN_ID) || 123456789;

const bot = new Telegraf(BOT_TOKEN);
const DB_FILE = path.join(__dirname, 'users.json');

// ==========================================
// TARJIMAlAR (TRANSLATIONS)
// ==========================================
const TRANSLATIONS = {
  uz: {
    welcome: "Assalomu alaykum! Botga xush kelibsiz.",
    my_sub: "📊 Sizning obunangiz:",
    no_sub: "❌ Sizda hozircha faol obuna mavjud emas.\n\nObuna bo'lish uchun adminga murojaat qiling yoki 📞 Kontakt bo'limi orqali xabar yuboring.",
    status_active: "⭐ Status: Premium ACTIVE",
    books: "📚 Kitoblar:",
    remaining: "⏳ Qolgan muddat:",
    days: "kun",
    btn_books: "🚀 My Vocabularies",
    btn_sub: "💳 Subscriptions",
    btn_help: "📖 Help",
    btn_contact: "📞 Contact",
    btn_info: "🌐 More Info",
    btn_lang: "🌐 Change Language"
  },
  en: {
    welcome: "Welcome to the bot!",
    my_sub: "📊 Your Subscription:",
    no_sub: "❌ You currently do not have an active subscription.\n\nTo subscribe, please contact the admin or send a message via 📞 Contact.",
    status_active: "⭐ Status: Premium ACTIVE",
    books: "📚 Books:",
    remaining: "⏳ Remaining time:",
    days: "days",
    btn_books: "🚀 My Vocabularies",
    btn_sub: "💳 Subscriptions",
    btn_help: "📖 Help",
    btn_contact: "📞 Contact",
    btn_info: "🌐 More Info",
    btn_lang: "🌐 Change Language"
  },
  ru: {
    welcome: "Добро пожаловать в бот!",
    my_sub: "📊 Ваша подписка:",
    no_sub: "❌ У вас пока нет активной подписки.\n\nДля оформления подписки свяжитесь с админом или отправьте сообщение через 📞 Контакты.",
    status_active: "⭐ Статус: Premium ACTIVE",
    books: "📚 Книги:",
    remaining: "⏳ Оставшийся срок:",
    days: "дней",
    btn_books: "🚀 My Vocabularies",
    btn_sub: "💳 Subscriptions",
    btn_help: "📖 Help",
    btn_contact: "📞 Contact",
    btn_info: "🌐 More Info",
    btn_lang: "🌐 Change Language"
  }
};

// ==========================================
// BAZA FUNKSIYALARI
// ==========================================
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
  const users = getUsers();
  return users.find(u => Number(u.id) === Number(id));
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
      username: userObj.username ? `@${userObj.username.replace('@', '')}` : users[idx].username
    };
  } else {
    users.push({
      id: Number(userObj.id),
      first_name: userObj.first_name || '',
      last_name: userObj.last_name || '',
      username: userObj.username ? `@${userObj.username.replace('@', '')}` : 'Mavjud emas',
      lang: 'en', // Odatiy til
      subscriptions: [],
      joined_at: new Date().toISOString()
    });
  }
  saveUsers(users);
}

function getRemainingDays(expiresAt) {
  const now = new Date();
  const exp = new Date(expiresAt);
  const diffTime = exp - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
}

function cleanExpiredSubscriptions(userId) {
  const users = getUsers();
  const user = users.find(u => Number(u.id) === Number(userId));
  if (!user || !user.subscriptions) return user;

  const initialCount = user.subscriptions.length;
  user.subscriptions = user.subscriptions.filter(sub => getRemainingDays(sub.expires_at) > 0);

  if (user.subscriptions.length !== initialCount) {
    saveUsers(users);
  }
  return user;
}

// ==========================================
// MENYU KLAVIATURASI
// ==========================================
function getMainKeyboard(ctx) {
  const user = getUser(ctx.from.id) || { lang: 'en' };
  const lang = user.lang || 'en';
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
  const isAdmin = Number(ctx.from.id) === ADMIN_ID;

  const buttons = [
    [t.btn_books],
    [t.btn_sub, t.btn_help],
    [t.btn_contact, t.btn_info],
    [t.btn_lang]
  ];

  if (isAdmin) {
    buttons.push(['⚙️ Admin Panel']);
  }

  return Markup.keyboard(buttons).resize();
}

// ==========================================
// BOT ISHLASH LOGIKASI
// ==========================================
bot.use((ctx, next) => {
  if (ctx.from) {
    updateUser(ctx.from);
  }
  return next();
});

bot.start((ctx) => {
  const user = getUser(ctx.from.id);
  const lang = user ? user.lang : 'en';
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
  ctx.reply(t.welcome, getMainKeyboard(ctx));
});

// 💳 OBUNA BO'LIMI (3 TILDAGI TUGMALARNI HAM USHLAYDI)
bot.hears(['💳 Subscriptions', '💳 Obunalar', '💳 Подписки', '📊 Mening obunam'], (ctx) => {
  const user = cleanExpiredSubscriptions(ctx.from.id);
  const lang = (user && user.lang) ? user.lang : 'en';
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;

  if (!user || !user.subscriptions || user.subscriptions.length === 0) {
    return ctx.reply(`${t.my_sub}\n\n${t.no_sub}`);
  }

  let text = `${t.my_sub}\n\n${t.status_active}\n${t.books}\n\n`;

  user.subscriptions.forEach((sub, index) => {
    const daysLeft = getRemainingDays(sub.expires_at);
    text += `${index + 1}. 📙 *${sub.book_title}*\n${t.remaining} ${daysLeft} ${t.days}\n_________________________\n\n`;
  });

  ctx.replyWithMarkdown(text);
});

// 🌐 TILNI O'ZGARTIRISH
bot.hears(['🌐 Change Language', '🌐 Tilni o\'zgartirish', '🌐 Изменить язык'], (ctx) => {
  ctx.reply("Choose language / Tilni tanlang / Выберите язык:", Markup.inlineKeyboard([
    [Markup.button.callback("🇺🇿 O'zbekcha", "set_lang_uz")],
    [Markup.button.callback("🇬🇧 English", "set_lang_en")],
    [Markup.button.callback("🇷🇺 Русский", "set_lang_ru")]
  ]));
});

bot.action(/set_lang_(uz|en|ru)/, (ctx) => {
  const lang = ctx.match[1];
  const users = getUsers();
  const user = users.find(u => Number(u.id) === Number(ctx.from.id));
  if (user) {
    user.lang = lang;
    saveUsers(users);
  }

  ctx.answerCbQuery();
  const t = TRANSLATIONS[lang];
  ctx.reply(t.welcome, getMainKeyboard(ctx));
});

// ==========================================
// ADMIN PANEL (OBUNANI TO'G'RI BIRIKTIRISH)
// ==========================================
bot.hears('⚙️ Admin Panel', (ctx) => {
  if (Number(ctx.from.id) !== ADMIN_ID) return;

  ctx.reply("⚙️ *Admin Panel:*", {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [Markup.button.callback("👥 Obunachilar Ro'yxati", "admin_users_list")]
    ])
  });
});

bot.action('admin_users_list', (ctx) => {
  if (Number(ctx.from.id) !== ADMIN_ID) return;

  const users = getUsers();
  if (users.length === 0) {
    return ctx.reply("Hozircha foydalanuvchilar yo'q.");
  }

  const buttons = users.map(u => [
    Markup.button.callback(`${u.first_name} (${u.id})`, `admin_user_${u.id}`)
  ]);

  ctx.reply("👥 Obunachini tanlang:", Markup.inlineKeyboard(buttons));
});

bot.action(/admin_user_(\d+)/, (ctx) => {
  if (Number(ctx.from.id) !== ADMIN_ID) return;

  const targetId = ctx.match[1];
  const user = cleanExpiredSubscriptions(targetId);

  let text = `👤 Foydalanuvchi: ${user.first_name} (${user.id})\n\nEndi foydalanuvchiga biriktirmoqchi bo'lgan kitobingizni bosing:`;

  const books = [
    { id: "book_1", title: "4000 Essential English Words 1" },
    { id: "book_2", title: "4000 Essential English Words 2" },
    { id: "book_3", title: "4000 Essential English Words 3" },
    { id: "book_4", title: "4000 Essential English Words 4" },
    { id: "book_5", title: "4000 Essential English Words 5" },
    { id: "book_6", title: "4000 Essential English Words 6" }
  ];

  const buttons = books.map(b => [
    Markup.button.callback(`➕ ${b.title}`, `add_sub_${targetId}_${b.id}`)
  ]);

  ctx.reply(text, Markup.inlineKeyboard(buttons));
});

// Obuna qo'shish va to'g'ri saqlash
bot.action(/add_sub_(\d+)_(book_\d+)/, (ctx) => {
  if (Number(ctx.from.id) !== ADMIN_ID) return;

  const targetId = Number(ctx.match[1]);
  const bookKey = ctx.match[2];

  const bookTitles = {
    book_1: "4000 Essential English Words 1",
    book_2: "4000 Essential English Words 2",
    book_3: "4000 Essential English Words 3",
    book_4: "4000 Essential English Words 4",
    book_5: "4000 Essential English Words 5",
    book_6: "4000 Essential English Words 6"
  };

  const users = getUsers();
  const user = users.find(u => Number(u.id) === targetId);

  if (user) {
    if (!user.subscriptions) user.subscriptions = [];

    const expireDate = new Date();
    expireDate.setDate(expireDate.getDate() + 30); // 30 kun berish

    const existingIndex = user.subscriptions.findIndex(s => s.book_id === bookKey);
    if (existingIndex !== -1) {
      user.subscriptions[existingIndex].expires_at = expireDate.toISOString();
    } else {
      user.subscriptions.push({
        book_id: bookKey,
        book_title: bookTitles[bookKey],
        expires_at: expireDate.toISOString()
      });
    }

    saveUsers(users); // Bazaga saqlash

    ctx.answerCbQuery("✅ Obuna saqlandi!");
    ctx.reply(`✅ Muvaffaqiyatli saqlandi!\n\n👤 Foydalanuvchi: (${targetId})\n⭐ Status: Premium\n📚 Aktiv kitoblari:\n1. 📙 ${bookTitles[bookKey]} (30 kun)`);
  } else {
    ctx.answerCbQuery("❌ Foydalanuvchi topilmadi.");
  }
});

// Botni xavfsiz ishga tushirish
bot.launch().then(() => {
  console.log("Bot muvaffaqiyatli ishga tushdi!");
}).catch(err => {
  console.error("Botni ishga tushirishda xatolik:", err);
});

// Qayta ishga tushishda (SIGINT/SIGTERM) xatolik bermaslik uchun
const stopBot = (reason) => {
  try {
    bot.stop(reason);
  } catch (e) {
    // Bot hali ishga tushmagan bo'lsa xatolikni e'tiborsiz qoldiramiz
  }
};

process.once('SIGINT', () => stopBot('SIGINT'));
process.once('SIGTERM', () => stopBot('SIGTERM'));
