const { Telegraf, Markup } = require('telegraf');
const express = require('express');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Maxfiy o'zgaruvchilar
const BOT_TOKEN = process.env.BOT_TOKEN;
const WEB_APP_URL = process.env.WEB_APP_URL || 'https://t.me/your_bot/app';
const PAYMENT_BOT_URL = process.env.PAYMENT_BOT_URL || 'https://t.me/your_payment_bot';
const ADMIN_USERNAME = (process.env.ADMIN_USERNAME || 'Server_9401').replace('@', '');
const ADMIN_ID = Number(process.env.ADMIN_ID) || 651936747;

const bot = new Telegraf(BOT_TOKEN);

// Foydalanuvchilarni saqlash uchun sodda JSON ma'lumotlar bazasi
const DB_FILE = path.join(__dirname, 'users.json');

function getUsers() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify([]));
  }
  try {
    const data = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
}

function saveUser(user) {
  const users = getUsers();
  const existingIndex = users.findIndex((u) => u.id === user.id);
  
  const userData = {
    id: user.id,
    first_name: user.first_name || '',
    last_name: user.last_name || '',
    username: user.username ? `@${user.username}` : "Mavjud emas",
    joined_at: existingIndex !== -1 ? users[existingIndex].joined_at : new Date().toISOString()
  };

  if (existingIndex !== -1) {
    users[existingIndex] = userData;
  } else {
    users.push(userData);
  }

  fs.writeFileSync(DB_FILE, JSON.stringify(users, null, 2));
}

// Admin holatlarini saqlash
const adminStates = {};

// Express HTTP Server (Render uchun)
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
  saveUser(ctx.from); // Foydalanuvchi ma'lumotlarini bazaga saqlash

  const isUserAdmin = ctx.from.id === ADMIN_ID;

  let keyboard = [
    [Markup.button.webApp('🚀 Web App-ni ochish', WEB_APP_URL)],
    ['💳 Obunalar', '📖 Yordam'],
    ['📞 Kontakt']
  ];

  if (isUserAdmin) {
    keyboard.push(['⚙️ Admin Panel']);
  }

  ctx.reply(
    `Xush kelibsiz, ${ctx.from.first_name}!\n\n"My Vocabularies" botiga xush kelibsiz. Kerakli bo'limni tanlang:`,
    Markup.keyboard(keyboard).resize()
  );
});

// 💳 Obunalar
bot.hears('💳 Obunalar', (ctx) => {
  saveUser(ctx.from);
  ctx.reply(`📊 **Sizning obuna holatingiz:** Noma'lum\n\nObunani faollashtirish yoki uzaytirish uchun rasmiy toʻlov botimizga oʻting:`, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [Markup.button.url('💳 Toʻlov qilish botiga oʻtish', PAYMENT_BOT_URL)]
    ])
  });
});

// 📖 Yordam
bot.hears('📖 Yordam', (ctx) => {
  saveUser(ctx.from);
  ctx.reply(`📖 **Botdan foydalanish yo'riqnomasi:**\n\n1. **🚀 Web App** tugmasini bosing va lug'at bo'limiga o'ting.\n2. So'zlarni yodlang va mashqlarni bajaring.\n3. Obuna muddatini uzaytirish uchun **💳 Obunalar** bo'limidan foydalaning.`, { parse_mode: 'Markdown' });
});

// 📞 Kontakt
bot.hears('📞 Kontakt', (ctx) => {
  saveUser(ctx.from);
  ctx.reply("📞 **Qo'llab-quvvatlash xizmati**\n\nSavollar yoki takliflar bo'lsa, adminga murojaat qiling:", {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [Markup.button.url("💬 Admin bilan bog'lanish", `https://t.me/${ADMIN_USERNAME}`)]
    ])
  });
});

// ⚙️ Admin Panel
bot.hears('⚙️ Admin Panel', (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;

  ctx.reply("🛠 **Admin Panel:**\n\nKerakli bo'limni tanlang:", {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [Markup.button.callback('📊 Statistika & Foydalanuvchilar', 'admin_stats')],
      [Markup.button.callback('📢 Barchaga Xabar Yuborish', 'admin_broadcast_start')],
      [Markup.button.callback('👤 Alohida Foydalanuvchiga Xabar', 'admin_single_start')]
    ])
  });
});

// Admin callback handlerlar
bot.action('admin_stats', (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;
  ctx.answerCbQuery();

  const users = getUsers();
  let userListText = `📊 **Jami foydalanuvchilar soni:** ${users.length} ta\n\n**Foydalanuvchilar ro'yxati:**\n`;

  users.slice(0, 20).forEach((u, i) => {
    userListText += `${i + 1}. **${u.first_name} ${u.last_name}** | ID: \`${u.id}\` | Username: ${u.username}\n`;
  });

  if (users.length > 20) {
    userListText += `\n*...va yana ${users.length - 20} ta foydalanuvchi.*`;
  }

  ctx.reply(userListText, { parse_mode: 'Markdown' });
});

bot.action('admin_broadcast_start', (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;
  ctx.answerCbQuery();

  adminStates[ctx.from.id] = { action: 'awaiting_broadcast_message' };
  ctx.reply("📢 **Barcha obunchilarga yubormoqchi bo'lgan xabaringizni matn yoki media ko'rinishida yuboring:**");
});

bot.action('admin_single_start', (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;
  ctx.answerCbQuery();

  adminStates[ctx.from.id] = { action: 'awaiting_target_user_id' };
  ctx.reply("👤 **Xabar yubormoqchi bo'lgan foydalanuvchining Telegram ID raqamini kiriting:**");
});

// Admin matn kiritishlarini ushlash
bot.on('message', async (ctx, next) => {
  saveUser(ctx.from);

  const state = adminStates[ctx.from.id];
  if (!state || ctx.from.id !== ADMIN_ID) return next();

  // 1. Ommaviy xabar yuborish
  if (state.action === 'awaiting_broadcast_message') {
    delete adminStates[ctx.from.id];
    const users = getUsers();
    let count = 0;

    ctx.reply("🚀 Xabar yuborish boshlandi...");

    for (const u of users) {
      try {
        await ctx.copyMessage(u.id);
        count++;
      } catch (err) {
        console.log(`User ${u.id} ga xabar yetib bormadi.`);
      }
    }

    return ctx.reply(`✅ Xabar muvaffaqiyatli ${count} ta foydalanuvchiga yetkazildi!`);
  }

  // 2. Alohida foydalanuvchi ID sini qabul qilish
  if (state.action === 'awaiting_target_user_id') {
    const targetId = Number(ctx.message.text);
    if (!targetId || isNaN(targetId)) {
      return ctx.reply("❌ Noto'g'ri ID raqam! Qaytadan faqat son kiriting:");
    }

    adminStates[ctx.from.id] = { action: 'awaiting_single_message', targetId: targetId };
    return ctx.reply(`Siz ID: \`${targetId}\` ni tanladingiz.\n\nEndi ushbu foydalanuvchiga yubormoqchi bo'lgan xabaringizni kiriting:`, { parse_mode: 'Markdown' });
  }

  // 3. Alohida foydalanuvchiga xabar yuborish
  if (state.action === 'awaiting_single_message') {
    const targetId = state.targetId;
    delete adminStates[ctx.from.id];

    try {
      await ctx.copyMessage(targetId);
      return ctx.reply(`✅ ID: \`${targetId}\` bo'lgan foydalanuvchiga xabar muvaffaqiyatli yuborildi!`, { parse_mode: 'Markdown' });
    } catch (err) {
      return ctx.reply(`❌ Xabar yuborib bo'lmadi. Foydalanuvchi botni bloklagan bo'lishi mumkin.`);
    }
  }

  return next();
});

// Botni ishga tushirish
bot.launch();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
