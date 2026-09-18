const { Telegraf, Markup } = require('telegraf');
const fs = require('fs');
const path = require('path');

// Bot token va Admin ID (O'zingiznikiga almashtiring yoki process.env dan oling)
const BOT_TOKEN = process.env.BOT_TOKEN || "BOT_TOKENINGIZNI_YOZING";
const ADMIN_ID = Number(process.env.ADMIN_ID) || 123456789; // O'zingizning Telegram ID ingiz

const bot = new Telegraf(BOT_TOKEN);
const DB_FILE = path.join(__dirname, 'users.json');

// ==========================================
// BAZA BILAN ISHLASH FUNKSIYALARI
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
      username: userObj.username ? `@${userObj.username}` : users[idx].username
    };
  } else {
    users.push({
      id: Number(userObj.id),
      first_name: userObj.first_name || '',
      last_name: userObj.last_name || '',
      username: userObj.username ? `@${userObj.username}` : 'Mavjud emas',
      lang: 'uz',
      subscriptions: [], // Har bir kitob obunasi ob'ekt sifatida saqlanadi
      joined_at: new Date().toISOString()
    });
  }
  saveUsers(users);
}

// Qolgan kunlarni hisoblash
function getRemainingDays(expiresAt) {
  const now = new Date();
  const exp = new Date(expiresAt);
  const diffTime = exp - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
}

// Muddati tugagan obunalarni avtomatik tozalash
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

// Obuna qo'shish yoki uzaytirish
function addSubscription(userId, bookId, bookTitle, days) {
  const users = getUsers();
  const user = users.find(u => Number(u.id) === Number(userId));
  if (!user) return;

  if (!user.subscriptions) user.subscriptions = [];

  const daysNum = Number(days);
  const existingSubIndex = user.subscriptions.findIndex(s => s.book_id === bookId);

  if (existingSubIndex !== -1) {
    const currentExp = new Date(user.subscriptions[existingSubIndex].expires_at);
    const baseDate = currentExp > new Date() ? currentExp : new Date();
    baseDate.setDate(baseDate.getDate() + daysNum);
    user.subscriptions[existingSubIndex].expires_at = baseDate.toISOString();
  } else {
    const expireDate = new Date();
    expireDate.setDate(expireDate.getDate() + daysNum);
    user.subscriptions.push({
      book_id: bookId,
      book_title: bookTitle,
      expires_at: expireDate.toISOString()
    });
  }

  saveUsers(users);
}

// ==========================================
// TIZIM MENYULARI (REPLY KEYBOARDS)
// ==========================================

function getMainKeyboard(ctx) {
  const user = getUser(ctx.from.id);
  const isAdmin = Number(ctx.from.id) === ADMIN_ID;

  const buttons = [
    ['📚 Kitoblar', '📊 Mening obunam'],
    ['🌐 Tilni o\'zgartirish', '✍️ Adminga yozish']
  ];

  if (isAdmin) {
    buttons.push(['⚙️ Admin Panel']);
  }

  return Markup.keyboard(buttons).resize();
}

// ==========================================
// BOT LOGIKASI HODISALARI
// ==========================================

bot.start((ctx) => {
  updateUser(ctx.from);
  ctx.reply(`Assalomu alaykum, ${ctx.from.first_name}! Botga xush kelibsiz.`, getMainKeyboard(ctx));
});

// Middleware: Har bir xabarda foydalanuvchini bazaga tekshiradi
bot.use((ctx, next) => {
  if (ctx.from) {
    updateUser(ctx.from);
  }
  return next();
});

// 📊 MENING OBUNAM (Har bir kitob alohida ko'rsatiladi va eskirganlari avto tozalanadi)
bot.hears(['📊 Mening obunam', '📊 My Subscription', '📊 Моя подписка'], (ctx) => {
  const user = cleanExpiredSubscriptions(ctx.from.id);

  if (!user || !user.subscriptions || user.subscriptions.length === 0) {
    return ctx.reply("❌ Sizda hozircha hech qanday faol Premium obuna mavjud emas.");
  }

  let text = "📊 *Sizning obunangiz:*\n\n⭐ *Status:* Premium\n📚 *Kitoblar:*\n\n";

  user.subscriptions.forEach((sub, index) => {
    const daysLeft = getRemainingDays(sub.expires_at);
    text += `${index + 1}. 📙 *${sub.book_title}*\n⏳ *Qolgan muddat:* ${daysLeft} kun\n_________________________\n\n`;
  });

  ctx.replyWithMarkdown(text);
});

// 📚 KITOBLAR BO'LIMI
bot.hears(['📚 Kitoblar', '📚 Books'], (ctx) => {
  const user = cleanExpiredSubscriptions(ctx.from.id);
  
  // Kitoblar ro'yxati va ularga kirish tugmalari (Misol tariqasida)
  ctx.reply("📚 Mavjud kitoblar ro'yxati:", Markup.inlineKeyboard([
    [Markup.button.callback("📙 4000 Essential English Words 1", "book_1")],
    [Markup.button.callback("📙 4000 Essential English Words 2", "book_2")]
  ]));
});

// 🌐 TILNI O'ZGARTIRISH
bot.hears(['🌐 Tilni o\'zgartirish', '🌐 Change Language'], (ctx) => {
  ctx.reply("Tilni tanlang:", Markup.inlineKeyboard([
    [Markup.button.callback("🇺🇿 O'zbekcha", "set_lang_uz")],
    [Markup.button.callback("🇬🇧 English", "set_lang_en")]
  ]));
});

bot.action('set_lang_uz', (ctx) => {
  const u = getUser(ctx.from.id) || { id: ctx.from.id };
  u.lang = 'uz';
  updateUser(u);
  ctx.answerCbQuery("O'zbek tili tanlandi");
  ctx.reply("Til O'zbekchaga o'zgartirildi!", getMainKeyboard(ctx));
});

bot.action('set_lang_en', (ctx) => {
  const u = getUser(ctx.from.id) || { id: ctx.from.id };
  u.lang = 'en';
  updateUser(u);
  ctx.answerCbQuery("English chosen");
  ctx.reply("Language changed to English!", getMainKeyboard(ctx));
});

// ==========================================
// ADMIN PANEL BO'LIMI
// ==========================================

bot.hears('⚙️ Admin Panel', (ctx) => {
  if (Number(ctx.from.id) !== ADMIN_ID) return;

  ctx.reply("⚙️ *Admin Paneliga xush kelibsiz!*", {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [Markup.button.callback("👥 Obunachilar Ro'yxati", "admin_users_list")],
      [Markup.button.callback("➕ Obuna Qo'shish", "admin_add_sub")]
    ])
  });
});

// Admin: Obunachilarni ko'rish
bot.action('admin_users_list', (ctx) => {
  if (Number(ctx.from.id) !== ADMIN_ID) return;

  const users = getUsers();
  if (users.length === 0) {
    return ctx.reply("Hozircha hech qanday foydalanuvchi yo'q.");
  }

  let text = `📊 *Jami foydalanuvchilar:* ${users.length} ta\n\nBatafsil ko'rish uchun tanlang:`;
  const buttons = users.map(u => [
    Markup.button.callback(`${u.first_name} (${u.username || u.id})`, `admin_user_info_${u.id}`)
  ]);

  ctx.replyWithMarkdown(text, Markup.inlineKeyboard(buttons));
});

// Admin: Muayyan foydalanuvchi va uning har bir kitobi obunasi haqida ma'lumot
bot.action(/admin_user_info_(\d+)/, (ctx) => {
  if (Number(ctx.from.id) !== ADMIN_ID) return;

  const targetUserId = ctx.match[1];
  const user = cleanExpiredSubscriptions(targetUserId);

  if (!user) {
    return ctx.reply("Foydalanuvchi topilmadi.");
  }

  let text = `👤 *Foydalanuvchi:* ${user.first_name} ${user.last_name || ''}\n🆔 *ID:* \`${user.id}\`\n🔗 *Username:* ${user.username}\n\n`;

  const buttons = [];

  if (!user.subscriptions || user.subscriptions.length === 0) {
    text += "❌ *Aktiv kitob obunalari yo'q.*";
  } else {
    text += "📚 *Obuna bo'lingan kitoblar:*\n\n";
    user.subscriptions.forEach((sub, idx) => {
      const days = getRemainingDays(sub.expires_at);
      text += `${idx + 1}. 📙 *${sub.book_title}*\n⏳ *Qolgan kun:* ${days} kun\n\n`;
      
      // Har bir kitob uchun alohida O'chirish tugmasi
      buttons.push([
        Markup.button.callback(`❌ O'chirish: ${sub.book_title}`, `remove_sub_${user.id}_${sub.book_id}`)
      ]);
    });
  }

  buttons.push([Markup.button.callback("⬅️ Orqaga", "admin_users_list")]);

  ctx.replyWithMarkdown(text, Markup.inlineKeyboard(buttons));
});

// Admin: Tanlangan kitob obunasini muayyan foydalanuvchidan olib tashlash
bot.action(/remove_sub_(\d+)_(.+)/, (ctx) => {
  if (Number(ctx.from.id) !== ADMIN_ID) return;

  const targetUserId = ctx.match[1];
  const bookId = ctx.match[2];

  const users = getUsers();
  const user = users.find(u => Number(u.id) === Number(targetUserId));

  if (user && user.subscriptions) {
    user.subscriptions = user.subscriptions.filter(s => s.book_id !== bookId);
    saveUsers(users);

    ctx.answerCbQuery("✅ Kitob obunasi o'chirildi!");
    ctx.reply(`✅ Foydalanuvchidan (\`${targetUserId}\`) \`${bookId}\` kitob obunasi olib tashlandi.`);
  } else {
    ctx.answerCbQuery("❌ Obuna topilmadi.");
  }
});

// Botni ishga tushirish
bot.launch().then(() => {
  console.log("Bot muvaffaqiyatli ishga tushdi!");
}).catch(err => {
  console.error("Botni yurgazishda xatolik:", err);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
