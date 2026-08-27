require("dotenv").config();

const fs = require("fs");
const path = require("path");
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  Client,
  ContainerBuilder,
  EmbedBuilder,
  Events,
  GatewayIntentBits,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags,
  ModalBuilder,
  Partials,
  PermissionFlagsBits,
  SeparatorBuilder,
  SectionBuilder,
  StringSelectMenuBuilder,
  TextDisplayBuilder,
  TextInputBuilder,
  TextInputStyle,
  ThumbnailBuilder,
} = require("discord.js");
const config = require("./config.json");

const dropDataPath = path.join(__dirname, "drop-data.json");
const giveawayDataPath = path.join(__dirname, "giveaway-data.json");
const inviteDataPath = path.join(__dirname, "invite-data.json");
const blacklistDataPath = path.join(__dirname, "blacklist-data.json");
const cennikDataPath = path.join(__dirname, "cennik-data.json");
const settlementDataPath = path.join(__dirname, "settlement-data.json");
const inviteCache = new Map();
const dayMs = 24 * 60 * 60 * 1000;
const customEmojiIds = {
  logo2: "1542436323908919426",
  statystyki: "1542438501251809344",
  solana: "1542438531367043162",
  skrill: "1542438655539290172",
  serce: "1542438751958204436",
  revolut: "1542438853908897812",
  regulamin: "1542439000361541794",
  pytanie: "1542439223309631508",
  puchar: "1542439339609296957",
  psc: "1542439416344346634",
  kudka: "1542439488196976701",
  gift: "1542439593020882944",
  powitanie: "1542439715243032588",
  portfel: "1542439825808818216",
  pin: "1542439945921105921",
  pp: "1542440041429598238",
  osoby: "1542440123763920906",
  osoba: "1542440220664799272",
  nitro: "1542440390953668629",
  nie: "1542440473241591878",
  middleman: "1542440690598944778",
  megafon: "1542440781313482842",
  lupa: "1542440903266934855",
  ltc: "1542441026348781638",
  like: "1542441179881144350",
  zarowka: "1542441266883854376",
  kursor: "1542441416553136158",
  ksiazka: "1542441497637421066",
  kosz: "1542441603489337355",
  konkurs: "1542441732124311552",
  kasa: "1542441858146504724",
  kalendarz: "1542441964874629160",
  info: "1542442089223036938",
  gwiazdka: "1542442170211106826",
  folder: "1542442290096640060",
  eth: "1542442466068799488",
  dzwonek: "1542442530065485854",
  kredka1: "1542442635632050216",
  dislike: "1542442729064370206",
  dc: "1542442818667290635",
  gwiady: "1542442893623693343",
  data: "1542442987261268008",
  zegar: "1542451426393849997",
  tickety: "1542451555247202385",
  blik: "1542451594837360710",
  crypto: "1542451618576990288",
  boost: "1542451640592769034",
  przecena: "1542451691054436352",
};
const ce = (name) => ({ name, id: customEmojiIds[name] });
const et = (name) => `<:${name}:${customEmojiIds[name]}>`;
const dropRewards = [
  { label: "zniżka 25%", chance: 1, percent: 25 },
  { label: "zniżka 10%", chance: 5, percent: 10 },
  { label: "zniżka 5%", chance: 10, percent: 5 },
];

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

const ticketTypes = {
  zakup: {
    label: "Chce Zakupic Produkt",
    description: "Kliknij, aby zakupic produkt!",
    emoji: ce("kasa"),
    channelPrefix: "zakup",
    modalTitle: "Zakup produktu",
    questions: [
      ["product", "Jaki produkt chcesz zakupic?"],
      ["amount", "Ile sztuk chcesz zakupic?"],
      ["payment", "Jakiej metody platnosci uzyjesz?"],
    ],
  },
  partnerstwo: {
    label: "Chce Nawiazac Partnerstwo",
    description: "Kliknij, jesli chcesz nawiazac partnerstwo!",
    emoji: ce("osoby"),
    channelPrefix: "partnerstwo",
    modalTitle: "Partnerstwo",
    questions: [
      ["members", "Ile osob jest na serwerze?"],
      ["server", "Link do serwera"],
    ],
  },
  middleman: {
    label: "Middleman",
    description: "Kliknij, jesli potrzebujesz mm do transakcji!",
    emoji: ce("middleman"),
    channelPrefix: "middleman",
    modalTitle: "Middleman",
    questions: [
      ["item", "Przedmiot middlemana"],
      ["price", "Kwota"],
      ["payment", "Metoda platnosci"],
      ["person", "Z kim chcesz middlemana?"],
    ],
  },
  pomoc: {
    label: "Potrzebuje Pomocy",
    description: "Kliknij, jesli masz pytanie lub problem!",
    emoji: ce("pytanie"),
    channelPrefix: "pomoc",
    modalTitle: "Pomoc",
    questions: [["problem", "Opisz swoj problem"]],
  },
  reklamacja: {
    label: "Chce Zlozyc Reklamacje",
    description: "Kliknij, aby zlozyc reklamacje",
    emoji: ce("info"),
    channelPrefix: "reklamacja",
    modalTitle: "Reklamacja",
    questions: [
      ["closedAt", "Data zamkniecia ticketa zamowienia"],
      ["product", "Zakupiony produkt"],
      ["seller", "Sprzedawca"],
    ],
  },
  oszust: {
    label: "Zglos Oszusta",
    description: "Zostales oscamowany? Zglos oszusta!",
    emoji: ce("lupa"),
    channelPrefix: "oszust",
    modalTitle: "Zgloszenie oszusta",
    questions: [
      ["situation", "Opisz sytuacje zgloszenia"],
      ["reportedUser", "Kogo chcesz zglosic?"],
    ],
  },
};

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Zalogowano jako ${readyClient.user.tag}.`);
  cacheAllGuildInvites();
  scheduleStoredGiveaways();
  updateConfiguredReactionCountChannel();
});

client.on(Events.GuildMemberAdd, async (member) => {
  try {
    const inviteInfo = await trackInviteJoin(member);
    await sendInviteJoinMessage(member, inviteInfo);
    await sendWelcomeMessage(member);
  } catch (error) {
    console.error("Blad przy wysylaniu przylotu:", error);
  }
});

client.on(Events.GuildMemberRemove, async (member) => {
  try {
    trackInviteLeave(member);
    await sendLeaveMessage(member);
  } catch (error) {
    console.error("Blad przy wysylaniu odlotu:", error);
  }
});

client.on(Events.InviteCreate, async (invite) => {
  await cacheGuildInvites(invite.guild).catch(() => null);
});

client.on(Events.InviteDelete, async (invite) => {
  await cacheGuildInvites(invite.guild).catch(() => null);
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;

  if (["!hxw1", "!hxw2", "!hxw3", "!stickiLegitki", "!legit"].includes(message.content)) {
    try {
      if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        await message.reply("Tylko administracja moze wyslac ten panel.");
        return;
      }

      if (message.content === "!hxw1") {
        await sendTicketPanel(message.channel);
      } else if (message.content === "!hxw2") {
        await sendVerificationPanel(message.channel);
      } else if (message.content === "!hxw3") {
        await sendOpinionPanel(message.channel);
      } else if (message.content === "!stickiLegitki") {
        await refreshLegitSticky(message.channel);
      } else {
        await sendLegitReactionPanel(message.channel);
      }

      await message.delete().catch(() => null);
    } catch (error) {
      console.error(error);
      await message.reply("Cos poszlo nie tak przy wysylaniu panelu.").catch(() => null);
    }

    return;
  }

  if (message.channel.id === config.restockChannelId) {
    await handleRestockMessage(message);
    return;
  }

  await handleCountedChannelMessage(message);
});

client.on(Events.MessageReactionAdd, async (reaction, user) => {
  await handleReactionCountUpdate(reaction, user);
});

client.on(Events.MessageReactionRemove, async (reaction, user) => {
  await handleReactionCountUpdate(reaction, user);
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand() && interaction.commandName === "ticket-panel") {
      const image = interaction.options.getAttachment("obrazek")?.url || config.panelImageUrl;

      await sendTicketPanel(interaction.channel, image);

      await interaction.reply({
        content: "Panel ticketow zostal wyslany.",
        ephemeral: true,
      });
      return;
    }

    if (interaction.isChatInputCommand() && interaction.commandName === "drop-panel") {
      const image =
        interaction.options.getString("obrazek-link") ||
        interaction.options.getAttachment("obrazek")?.url ||
        config.dropImageUrl;

      await sendDropPanel(interaction.channel, image);

      await interaction.reply({
        content: "Panel drop zostal wyslany.",
        ephemeral: true,
      });
      return;
    }

    if (interaction.isChatInputCommand() && interaction.commandName === "konkurs") {
      await createGiveaway(interaction);
      return;
    }

    if (interaction.isChatInputCommand() && interaction.commandName === "zapro") {
      await showInviteStats(interaction);
      return;
    }

    if (interaction.isChatInputCommand() && interaction.commandName === "legit") {
      await sendLegitReactionPanel(interaction.channel);

      await interaction.reply({
        content: "Panel legit został wysłany.",
        ephemeral: true,
      });
      return;
    }

    if (
      interaction.isChatInputCommand() &&
      ["blacklista", "bl"].includes(interaction.commandName)
    ) {
      await handleBlacklistCommand(interaction);
      return;
    }

    if (interaction.isChatInputCommand() && interaction.commandName === "cennik") {
      await handleCennikCommand(interaction);
      return;
    }

    if (interaction.isChatInputCommand() && interaction.commandName === "rozliczenia") {
      await handleSettlementsCommand(interaction);
      return;
    }

    if (interaction.isChatInputCommand() && interaction.commandName === "panel-rozliczen") {
      await sendSettlementPanelCommand(interaction);
      return;
    }

    if (interaction.isChatInputCommand() && interaction.commandName === "reset-saldo") {
      await resetSettlementBalance(interaction);
      return;
    }

    if (interaction.isChatInputCommand() && interaction.commandName === "lc") {
      await showLegitCheckModal(interaction);
      return;
    }

    if (interaction.isChatInputCommand() && interaction.commandName === "close") {
      await closeTicket(interaction);
      return;
    }

    if (interaction.isChatInputCommand() && interaction.commandName === "claim") {
      await claimTicket(interaction);
      return;
    }

    if (interaction.isStringSelectMenu() && interaction.customId === "ticket_select") {
      await showTicketModal(interaction);
      return;
    }

    if (interaction.isStringSelectMenu() && interaction.customId === "cennik_select_category") {
      await showCennikCategory(interaction);
      return;
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith("ticket_modal:")) {
      await createTicket(interaction);
      return;
    }

    if (interaction.isModalSubmit() && interaction.customId === "lc_modal") {
      await submitLegitCheck(interaction);
      return;
    }

    if (interaction.isButton() && interaction.customId === "ticket_close") {
      await closeTicket(interaction);
      return;
    }

    if (interaction.isButton() && interaction.customId === "ticket_delete") {
      await deleteTicket(interaction);
      return;
    }

    if (interaction.isButton() && interaction.customId === "ticket_claim") {
      await claimTicket(interaction);
      return;
    }

    if (interaction.isButton() && interaction.customId === "restock_ping_role") {
      await giveRestockPingRole(interaction);
      return;
    }

    if (interaction.isButton() && interaction.customId.startsWith("settlement_")) {
      await handleSettlementPanelButton(interaction);
      return;
    }

    if (interaction.isButton() && interaction.customId.startsWith("blacklist_evidence:")) {
      await showBlacklistEvidence(interaction);
      return;
    }

    if (interaction.isButton() && interaction.customId.startsWith("blacklist_remove:")) {
      await removeBlacklistFromButton(interaction);
      return;
    }

    if (interaction.isButton() && interaction.customId === "verify_start") {
      await showVerificationModal(interaction);
      return;
    }

    if (interaction.isModalSubmit() && interaction.customId === "verify_modal") {
      await verifyCaptcha(interaction);
      return;
    }

    if (interaction.isButton() && interaction.customId === "opinion_start") {
      await showOpinionModal(interaction);
      return;
    }

    if (interaction.isModalSubmit() && interaction.customId === "opinion_modal") {
      await submitOpinion(interaction);
      return;
    }


    if (interaction.isButton() && interaction.customId === "drop_roll") {
      await rollDrop(interaction);
      return;
    }

    if (interaction.isButton() && interaction.customId === "drop_inventory") {
      await showDropInventory(interaction);
      return;
    }

    if (interaction.isButton() && interaction.customId.startsWith("giveaway_join:")) {
      await joinGiveaway(interaction);
    }
  } catch (error) {
    console.error(error);

    const payload = {
      content: getInteractionErrorMessage(interaction),
      ephemeral: true,
    };

    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(payload).catch(() => null);
    } else {
      await interaction.reply(payload).catch(() => null);
    }
  }
});

function getInteractionErrorMessage(interaction) {
  if (interaction.isButton?.() && interaction.customId?.startsWith("opinion_")) {
    return "Cos poszlo nie tak przy obsludze opinii.";
  }

  if (interaction.isModalSubmit?.() && interaction.customId?.startsWith("opinion_")) {
    return "Cos poszlo nie tak przy wysylaniu opinii.";
  }

  if (interaction.isButton?.() && interaction.customId?.startsWith("verify_")) {
    return "Cos poszlo nie tak przy weryfikacji.";
  }

  if (interaction.isModalSubmit?.() && interaction.customId?.startsWith("verify_")) {
    return "Cos poszlo nie tak przy weryfikacji.";
  }

  if (interaction.isButton?.() && interaction.customId?.startsWith("blacklist_")) {
    return "Cos poszlo nie tak przy obsludze blacklisty.";
  }

  if (
    interaction.isChatInputCommand?.() &&
    ["blacklista", "bl"].includes(interaction.commandName)
  ) {
    return "Cos poszlo nie tak przy obsludze blacklisty.";
  }

  if (
    interaction.isChatInputCommand?.() &&
    interaction.commandName === "cennik"
  ) {
    return "Cos poszlo nie tak przy obsludze cennika.";
  }

  if (interaction.isStringSelectMenu?.() && interaction.customId === "cennik_select_category") {
    return "Cos poszlo nie tak przy obsludze cennika.";
  }

  if (
    interaction.isChatInputCommand?.() &&
    ["rozliczenia", "panel-rozliczen"].includes(interaction.commandName)
  ) {
    return "Cos poszlo nie tak przy liczeniu rozliczen.";
  }

  if (interaction.isButton?.() && interaction.customId?.startsWith("settlement_")) {
    return "Cos poszlo nie tak przy panelu rozliczen.";
  }

  if (
    interaction.isChatInputCommand?.() &&
    ["lc", "reset-saldo"].includes(interaction.commandName)
  ) {
    return "Cos poszlo nie tak przy obsludze rozliczen.";
  }

  if (interaction.isModalSubmit?.() && interaction.customId === "lc_modal") {
    return "Cos poszlo nie tak przy wysylaniu legit-checka.";
  }

  return "Cos poszlo nie tak przy obsludze ticketow.";
}

async function sendTicketPanel(channel, image = config.panelImageUrl) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId("ticket_select")
    .setPlaceholder(`💡 × Wybierz Interesującą Cię Kategorie Ticketa!`)
    .addOptions(
      Object.entries(ticketTypes).map(([value, type]) => ({
        label: type.label,
        description: type.description,
        emoji: type.emoji,
        value,
      })),
    );

  const panel = new ContainerBuilder()
    .setAccentColor(config.panelColor)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          "```                    🖤︲Crystal Shop × ᴛɪᴄᴋᴇᴛʏ      ```",
          "",
          `> ${et("kasa")} ︲**Chcesz coś zakupić** lub **potrzebujesz pomocy** od **administracji**? A może chcesz **partnerstwo** lub **cokolwiek innego?**`,
          "",
          "> <:strzalka:1542459023817838602> ︲**Wybierz** kategorię z listy **poniżej**, a my się tym **zajmiemy**!",
        ].join("\n"),
      ),
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addActionRowComponents(new ActionRowBuilder().addComponents(menu));

  if (image && /^https?:\/\//i.test(image)) {
    panel
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(
          new MediaGalleryItemBuilder().setURL(image),
        ),
      );
  }

  panel
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`> ${et("logo2")} © 2026 Crystal Shop × Panel Ticketów`),
    );

  await channel.send({
    components: [panel],
    flags: MessageFlags.IsComponentsV2,
  });
}

async function sendCennikPanel(channel, image = config.cennikImageUrl || config.panelImageUrl) {
  const data = readCennikData();
  const categories = Object.entries(data.categories);

  const menu = new StringSelectMenuBuilder()
    .setCustomId("cennik_select_category")
    .setPlaceholder(`💡・ Wybierz interesującą Cię kategorię!`);

  if (categories.length) {
    menu.addOptions(
      categories.slice(0, 25).map(([key, item]) => ({
        label: item.label?.slice(0, 100) || key,
        description: (item.description || "Kliknij, aby sprawdzić cennik.").slice(0, 100),
        emoji: item.emoji || ce("logo2"),
        value: key.slice(0, 100),
      })),
    );
  } else {
    menu
      .setDisabled(true)
      .addOptions({
        label: "Brak kategorii",
        description: "Dodaj kategorię komendą /cennik dodaj.",
        emoji: ce("nie"),
        value: "empty",
      });
  }

  const panel = new ContainerBuilder()
    .setAccentColor(config.panelColor)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          "``` 🖤 ・ Crystal Shop × PRODUKTY```",
          "",
          `${et("kasa")} ・ Szukasz **tanich streamingów albo kont?** A może chcesz kupić **nitro boost?** Albo **bota i hosting?** U nas **znajdziesz wszystko w najlepszych cenach!**`,
          "",
          "<:strzalka:1542459023817838602>・ **Wybierz kategorię** produktu, która Cię **interesuje!**",
        ].join("\n"),
      ),
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addActionRowComponents(new ActionRowBuilder().addComponents(menu));

  const normalizedImage = normalizeImageUrl(image);
  if (normalizedImage) {
    panel
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(
          new MediaGalleryItemBuilder().setURL(normalizedImage),
        ),
      );
  }

  panel
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`${et("logo2")} © 2026 Crystal Shop × Oferta`),
    );

  await channel.send({
    components: [panel],
    flags: MessageFlags.IsComponentsV2,
  });
}

async function handleCennikCommand(interaction) {
  const subcommand = interaction.options.getSubcommand();

  if (subcommand === "panel") {
    const image =
      interaction.options.getString("obrazek-link") ||
      interaction.options.getAttachment("obrazek")?.url ||
      config.cennikImageUrl ||
      config.panelImageUrl;

    await sendCennikPanel(interaction.channel, image);
    await interaction.reply({ content: "Panel cennika został wysłany.", ephemeral: true });
    return;
  }

  if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({
      content: "Tylko administracja może zarządzać cennikiem.",
      ephemeral: true,
    });
    return;
  }

  if (subcommand === "dodaj") {
    await addCennikCategory(interaction);
    return;
  }

  if (subcommand === "edytuj") {
    await editCennikCategory(interaction);
    return;
  }

  if (subcommand === "podglad") {
    await previewCennikCategory(interaction);
    return;
  }

  if (subcommand === "usun") {
    await deleteCennikCategory(interaction);
    return;
  }

  if (subcommand === "lista") {
    await listCennikCategories(interaction);
  }
}

async function addCennikCategory(interaction) {
  const key = normalizeCennikKey(interaction.options.getString("klucz"));
  const label = interaction.options.getString("nazwa").trim();
  const title = interaction.options.getString("tytul").trim();
  const description = interaction.options.getString("opis")?.trim() || "";
  const emoji = interaction.options.getString("emoji")?.trim() || et("logo2");
  const data = readCennikData();

  if (!key) {
    await interaction.reply({ content: "Klucz cennika jest niepoprawny.", ephemeral: true });
    return;
  }

  if (data.categories[key]) {
    await interaction.reply({
      content: `Kategoria \`${key}\` już istnieje.`,
      ephemeral: true,
    });
    return;
  }

  await interaction.reply({
    content: "⌛ Wyślij teraz treść cennika na ten kanał. Masz 120 sekund. Twoja wiadomość zostanie usunięta.",
    ephemeral: true,
  });

  const content = await collectCennikContent(interaction);
  if (!content) return;

  data.categories[key] = { key, label, title, description, emoji, content };
  writeCennikData(data);

  await interaction.followUp({
    components: [createCennikPreviewPanel(data.categories[key], `${et("like")} Dodano kategorię \`${label}\` (\`${key}\`).`)],
    flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
  });
}

async function editCennikCategory(interaction) {
  const key = normalizeCennikKey(interaction.options.getString("klucz"));
  const data = readCennikData();
  const item = data.categories[key];

  if (!item) {
    await interaction.reply({
      content: `Nie znaleziono kategorii \`${key}\`.`,
      ephemeral: true,
    });
    return;
  }

  const newTitle = interaction.options.getString("tytul");
  const newLabel = interaction.options.getString("nazwa");
  const newDesc = interaction.options.getString("opis");
  const newEmoji = interaction.options.getString("emoji");

  if (newTitle) item.title = newTitle.trim();
  if (newLabel) item.label = newLabel.trim();
  if (newDesc !== null && newDesc !== undefined) item.description = newDesc.trim();
  if (newEmoji) item.emoji = newEmoji.trim();

  await interaction.reply({
    content: "⌛ Wyślij nową treść cennika na ten kanał albo wpisz `pomijam`, żeby zostawić starą. Masz 120 sekund.",
    ephemeral: true,
  });

  const content = await collectCennikContent(interaction, true);
  if (content === null) return;
  if (content.toLowerCase() !== "pomijam") item.content = content;

  data.categories[key] = item;
  writeCennikData(data);

  await interaction.followUp({
    components: [createCennikPreviewPanel(item, `${et("like")} Zaktualizowano kategorię \`${key}\`.`)],
    flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
  });
}

async function previewCennikCategory(interaction) {
  const key = normalizeCennikKey(interaction.options.getString("klucz"));
  const item = readCennikData().categories[key];

  if (!item) {
    await interaction.reply({
      content: `Nie znaleziono kategorii \`${key}\`.`,
      ephemeral: true,
    });
    return;
  }

  await interaction.reply({
    components: [createCennikPreviewPanel(item, `${et("lupa")} Podgląd cennika \`${item.label}\` (\`${key}\`):`)],
    flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
  });
}

async function deleteCennikCategory(interaction) {
  const key = normalizeCennikKey(interaction.options.getString("klucz"));
  const data = readCennikData();

  if (!data.categories[key]) {
    await interaction.reply({
      content: `Nie znaleziono kategorii \`${key}\`.`,
      ephemeral: true,
    });
    return;
  }

  delete data.categories[key];
  writeCennikData(data);

  await interaction.reply({
    content: `${et("like")} Usunięto kategorię \`${key}\`.`,
    ephemeral: true,
  });
}

async function listCennikCategories(interaction) {
  const categories = Object.entries(readCennikData().categories);

  if (!categories.length) {
    await interaction.reply({
      content: "ℹ️ Brak kategorii w cenniku.",
      ephemeral: true,
    });
    return;
  }

  await interaction.reply({
    content: categories
      .map(([key, item], index) => `${index + 1}. \`${key}\` → **${item.label}** ${item.emoji || ""}`)
      .join("\n")
      .slice(0, 1900),
    ephemeral: true,
  });
}

async function showCennikCategory(interaction) {
  const selectedKey = interaction.values[0];
  const item = readCennikData().categories[selectedKey];

  if (!item) {
    await interaction.reply({
      content: "Nie znaleziono wybranego cennika.",
      ephemeral: true,
    });
    return;
  }

  await interaction.reply({
    components: [createCennikPreviewPanel(item)],
    flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
  });
}

function createCennikPreviewPanel(item, header = "") {
  return new ContainerBuilder()
    .setAccentColor(config.panelColor)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          header,
          header ? "" : null,
          `\`\`\` ${item.emoji || et("logo2")} ・ Crystal Shop × ${item.title || item.label}\`\`\``,
          "",
          (item.content || "Brak treści cennika.").slice(0, 3500),
          "",
          `> ${et("kasa")} ・ Chcesz dokonać zakupu? Stwórz ticket!`,
        ].filter((line) => line !== null).join("\n"),
      ),
    );
}

function collectCennikContent(interaction, allowSkip = false) {
  return new Promise((resolve) => {
    const filter = (message) => message.author.id === interaction.user.id;
    const collector = interaction.channel.createMessageCollector({ filter, time: 120000, max: 1 });

    collector.on("collect", async (message) => {
      const content = message.content.trim();
      await message.delete().catch(() => null);

      if (!content && !allowSkip) {
        await interaction.followUp({
          content: "Treść cennika nie może być pusta.",
          ephemeral: true,
        }).catch(() => null);
        resolve(null);
        return;
      }

      resolve(content);
    });

    collector.on("end", (collected, reason) => {
      if (reason === "time" && collected.size === 0) {
        interaction.followUp({
          content: "⏱️ Czas na wysłanie treści minął. Operacja anulowana.",
          ephemeral: true,
        }).catch(() => null);
        resolve(null);
      }
    });
  });
}

function normalizeCennikKey(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 80);
}

async function showLegitCheckModal(interaction) {
  const ownerId = getTicketOwnerId(interaction.channel.topic);
  if (!ownerId) {
    await interaction.reply({
      content: "Ta komenda działa tylko na kanale ticketa.",
      ephemeral: true,
    });
    return;
  }

  const sellerId = getTicketClaimerId(interaction.channel.topic);
  if (!sellerId) {
    await interaction.reply({
      content: "Najpierw ktoś z administracji musi kliknąć `Przejmij Ticketa`, wtedy bot będzie wiedział, którego sprzedawcę dać w legitce.",
      ephemeral: true,
    });
    return;
  }

  const modal = new ModalBuilder()
    .setCustomId("lc_modal")
    .setTitle("Wystaw legit-check");

  const product = new TextInputBuilder()
    .setCustomId("lc_product")
    .setLabel("Przedmiot")
    .setPlaceholder("Np. Nitro")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(120);

  const amount = new TextInputBuilder()
    .setCustomId("lc_amount")
    .setLabel("Kwota")
    .setPlaceholder("Np. 16")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(20);

  const payment = new TextInputBuilder()
    .setCustomId("lc_payment")
    .setLabel("Metoda płatności")
    .setPlaceholder("Np. LTC")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(80);

  modal.addComponents(
    new ActionRowBuilder().addComponents(product),
    new ActionRowBuilder().addComponents(amount),
    new ActionRowBuilder().addComponents(payment),
  );

  await interaction.showModal(modal);
}

async function submitLegitCheck(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const ownerId = getTicketOwnerId(interaction.channel.topic);
  const sellerId = getTicketClaimerId(interaction.channel.topic);
  const seller = await interaction.guild.members.fetch(sellerId).catch(() => null);

  if (!ownerId) {
    await interaction.editReply("Ta komenda działa tylko na kanale ticketa.");
    return;
  }

  if (!seller) {
    await interaction.editReply("Nie znalazłem osoby, która przejęła tego ticketa. Kliknij jeszcze raz `Przejmij Ticketa` i spróbuj ponownie.");
    return;
  }

  const product = sanitizeLegitField(interaction.fields.getTextInputValue("lc_product"));
  const amount = parseMoneyAmount(interaction.fields.getTextInputValue("lc_amount"));
  const payment = sanitizeLegitField(interaction.fields.getTextInputValue("lc_payment"));

  if (!product || amount === null || !payment) {
    await interaction.editReply("Uzupełnij poprawnie przedmiot, kwotę i metodę płatności.");
    return;
  }

  const legitText = `+rep ${seller} [${product}] [${formatMoney(amount)} PLN] [${payment}]`;
  const panel = createLegitCheckTicketPanel(interaction.user, seller, legitText);

  await interaction.channel.send({
    components: [panel],
    flags: MessageFlags.IsComponentsV2,
  });

  await interaction.channel.send({
    content: legitText,
    allowedMentions: { users: [seller.id] },
  });

  await interaction.editReply("Wysłano legit-check w tickecie. Klient może skopiować zwykłą legitkę z wiadomości pod panelem.");
}

function sanitizeLegitField(value) {
  return value
    .trim()
    .replace(/[\[\]\n\r]/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, 120);
}

function createLegitCheckTicketPanel(clientUser, sellerMember, legitText) {
  const panel = new ContainerBuilder()
    .setAccentColor(config.panelColor)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          "``` 🖤 ・ Crystal Shop × LEGIT CHECK```",
          "",
          `${et("osoba")} ・ **Klient:** ${clientUser}`,
          `${et("logo2")} ・ **Sprzedawca:** ${sellerMember}`,
          "",
          `${et("folder")} ・ **Skopiuj legitkę i wystaw ją na kanale legit-checków:**`,
          `\`\`\`${legitText}\`\`\``,
        ].join("\n"),
      ),
    );

  const image = normalizeImageUrl(config.ticketImageUrl || config.panelImageUrl);
  if (image) {
    panel
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(
          new MediaGalleryItemBuilder().setURL(image),
        ),
      );
  }

  return panel
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`${et("logo2")} © 2026 Crystal Shop × Legit Check`),
    );
}

async function handleSettlementsCommand(interaction) {
  if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({
      content: "Tylko administracja może sprawdzać rozliczenia.",
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply();

  const days = interaction.options.getInteger("dni") || 7;
  const commissionPercent = interaction.options.getNumber("prowizja") ?? 15;
  const selectedSeller = interaction.options.getUser("sprzedawca");
  const channel = await resolveSettlementChannel(interaction.guild);

  if (!channel?.messages?.fetch) {
    await interaction.editReply("Nie mogę znaleźć kanału legit-checków `1539171498449961017`.");
    return;
  }

  const since = Date.now() - days * dayMs;
  const entries = await collectLegitCheckEntries(channel, since);
  const settlementData = readSettlementData();
  const filteredEntries = selectedSeller
    ? entries.filter((entry) => entry.sellerId === selectedSeller.id)
    : entries;
  const resetFilteredEntries = filteredEntries.filter((entry) =>
    entry.createdTimestamp >= getSettlementResetTimestamp(settlementData, interaction.guild.id, entry.sellerId)
  );
  const rows = buildSettlementRows(resetFilteredEntries, commissionPercent);
  const panel = createSettlementsPanel({
    rows,
    entriesCount: resetFilteredEntries.length,
    skippedCount: entries.length - resetFilteredEntries.length,
    days,
    commissionPercent,
    channel,
    selectedSeller,
  });

  await interaction.editReply({
    components: [panel],
    flags: MessageFlags.IsComponentsV2,
  });
}

async function resetSettlementBalance(interaction) {
  if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({
      content: "Tylko administracja może resetować saldo.",
      ephemeral: true,
    });
    return;
  }

  const seller = interaction.options.getUser("sprzedawca");
  const data = readSettlementData();
  const guildId = interaction.guild.id;

  if (!data.guilds[guildId]) {
    data.guilds[guildId] = { globalResetAt: 0, sellerResetAt: {} };
  }

  if (!data.guilds[guildId].sellerResetAt || typeof data.guilds[guildId].sellerResetAt !== "object") {
    data.guilds[guildId].sellerResetAt = {};
  }

  if (seller) {
    data.guilds[guildId].sellerResetAt[seller.id] = Date.now();
  } else {
    data.guilds[guildId].globalResetAt = Date.now();
  }

  writeSettlementData(data);

  await interaction.reply({
    content: seller
      ? `Zresetowano saldo rozliczeń dla ${seller}. Od teraz liczą się tylko nowe legit-checki tej osoby.`
      : "Zresetowano saldo rozliczeń wszystkim. Od teraz liczą się tylko nowe legit-checki.",
    ephemeral: true,
  });
}

async function sendSettlementPanelCommand(interaction) {
  if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({
      content: "Tylko administracja może wysłać panel rozliczeń.",
      ephemeral: true,
    });
    return;
  }

  await interaction.channel.send({
    components: [createSettlementPublicPanel()],
    flags: MessageFlags.IsComponentsV2,
  });

  await interaction.reply({
    content: "Panel rozliczeń został wysłany.",
    ephemeral: true,
  });
}

function createSettlementPublicPanel() {
  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("settlement_my_balance")
      .setEmoji(ce("portfel"))
      .setLabel("Moje saldo")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("settlement_top")
      .setEmoji(ce("puchar"))
      .setLabel("Topka sprzedawców")
      .setStyle(ButtonStyle.Secondary),
  );

  return new ContainerBuilder()
    .setAccentColor(config.panelColor)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          "``` 💎 ・ Crystal Shop × ROZLICZENIA```",
          "",
          `${et("portfel")} ・ **Sprzedawco, sprawdź swoje aktualne saldo z legit-checków.**`,
          `${et("statystyki")} ・ Bot liczy kwoty z wiadomości \`+rep\` na kanale legit-checków.`,
          `${et("kasa")} ・ Domyślna prowizja sklepu: \`15%\`.`,
          "",
          `${et("kursor")} ・ Kliknij przycisk poniżej, żeby zobaczyć swoje saldo albo topkę sprzedawców.`,
        ].join("\n"),
      ),
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addActionRowComponents(buttons)
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`${et("serce")} © 2026 Crystal Shop × Panel Rozliczeń`),
    );
}

async function handleSettlementPanelButton(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const channel = await resolveSettlementChannel(interaction.guild);
  if (!channel?.messages?.fetch) {
    await interaction.editReply("Nie mogę znaleźć kanału legit-checków `1539171498449961017`.");
    return;
  }

  const days = 7;
  const commissionPercent = 15;
  const since = Date.now() - days * dayMs;
  const entries = await collectLegitCheckEntries(channel, since);
  const settlementData = readSettlementData();
  const resetEntries = entries.filter((entry) =>
    entry.createdTimestamp >= getSettlementResetTimestamp(settlementData, interaction.guild.id, entry.sellerId)
  );

  if (interaction.customId === "settlement_my_balance") {
    const member = interaction.member;
    const myEntries = resetEntries.filter((entry) => sellerMatchesUser(entry, interaction.user, member));
    const rows = buildSettlementRows(myEntries, commissionPercent);
    const row = rows[0] || {
      sellerLabel: interaction.user.toString(),
      count: 0,
      total: 0,
      commission: 0,
      afterCommission: 0,
      examples: [],
    };

    await interaction.editReply({
      components: [createSellerBalancePanel(row, days, commissionPercent)],
      flags: MessageFlags.IsComponentsV2,
    });
    return;
  }

  if (interaction.customId === "settlement_top") {
    const rows = buildSettlementRows(resetEntries, commissionPercent);
    await interaction.editReply({
      components: [createSellerTopPanel(rows, days, commissionPercent)],
      flags: MessageFlags.IsComponentsV2,
    });
  }
}

function createSellerBalancePanel(row, days, commissionPercent) {
  const examples = row.examples?.length
    ? row.examples.slice(0, 5).map((entry) =>
      `> ${et("gift")} ・ ${entry.product} — \`${formatMoney(entry.amount)} PLN\` (${entry.payment})`,
    ).join("\n")
    : "> Brak legit-checków w tym tygodniu.";

  return new ContainerBuilder()
    .setAccentColor(config.panelColor)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          "``` 💎 ・ Crystal Shop × TWOJE SALDO```",
          "",
          `${et("osoba")} ・ **Sprzedawca:** ${row.sellerLabel}`,
          `${et("kalendarz")} ・ **Okres:** ostatnie \`${days}\` dni`,
          `${et("folder")} ・ **Transakcje:** \`${row.count}\``,
          "",
          `${et("kasa")} ・ **Zarobiłeś:** \`${formatMoney(row.total)} PLN\``,
          `${et("statystyki")} ・ **Do oddania (${formatPercent(commissionPercent)}):** \`${formatMoney(row.commission)} PLN\``,
          `${et("like")} ・ **Zostaje Tobie:** \`${formatMoney(row.afterCommission)} PLN\``,
        ].join("\n"),
      ),
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(examples.slice(0, 3000)))
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`${et("serce")} © 2026 Crystal Shop × Saldo Sprzedawcy`),
    );
}

function createSellerTopPanel(rows, days, commissionPercent) {
  const topText = rows.length
    ? rows.slice(0, 10).map((row, index) => [
      `**${index + 1}. ${row.sellerLabel}**`,
      `> ${et("folder")} ・ Transakcje: \`${row.count}\``,
      `> ${et("kasa")} ・ Obrót: \`${formatMoney(row.total)} PLN\``,
      `> ${et("statystyki")} ・ Do oddania (${formatPercent(commissionPercent)}): \`${formatMoney(row.commission)} PLN\``,
    ].join("\n")).join("\n\n")
    : "> Brak legit-checków w tym tygodniu.";

  return new ContainerBuilder()
    .setAccentColor(config.panelColor)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          "``` 💎 ・ Crystal Shop × TOPKA SPRZEDAWCÓW```",
          "",
          `${et("kalendarz")} ・ **Okres:** ostatnie \`${days}\` dni`,
          `${et("puchar")} ・ **Ranking według obrotu z legit-checków:**`,
        ].join("\n"),
      ),
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(topText.slice(0, 3500)))
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`${et("serce")} © 2026 Crystal Shop × Topka Sprzedawców`),
    );
}

function sellerMatchesUser(entry, user, member) {
  if (entry.sellerId) return entry.sellerId === user.id;

  const sellerName = normalizeSellerName(entry.sellerLabel);
  const names = [
    user.username,
    user.globalName,
    member?.displayName,
    member?.nickname,
  ].filter(Boolean).map(normalizeSellerName);

  return names.includes(sellerName);
}

function normalizeSellerName(value) {
  return String(value || "")
    .replace(/^@/, "")
    .trim()
    .toLowerCase();
}

async function resolveSettlementChannel(guild) {
  return guild.channels.fetch("1539171498449961017").catch(() => null);
}

async function collectLegitCheckEntries(channel, sinceTimestamp) {
  const entries = [];
  let before;

  while (true) {
    const fetched = await channel.messages.fetch({ limit: 100, before }).catch(() => null);
    if (!fetched || fetched.size === 0) break;

    for (const message of fetched.values()) {
      if (message.createdTimestamp < sinceTimestamp) continue;

      const entry = parseLegitCheckContent(message.content);
      if (entry) {
        entries.push({
          ...entry,
          messageId: message.id,
          createdTimestamp: message.createdTimestamp,
          authorId: message.author.id,
        });
      }
    }

    const lastMessage = fetched.last();
    before = lastMessage.id;
    if (lastMessage.createdTimestamp < sinceTimestamp) break;
  }

  return entries;
}

function parseLegitCheckContent(content) {
  const bracketMatch = content?.trim().match(
    /^-?\+rep\s+(?:<@!?(?<sellerId>\d{17,20})>|@(?<sellerName>[^\s\[]+))\s+\[(?<product>[^\]\n]{1,120})\]\s+\[(?<amount>[\d\s,.]+)\s*(?:pln|zł|zl)?\]\s+\[(?<payment>[^\]\n]{1,80})\]/i,
  );

  if (bracketMatch?.groups) {
    const amount = parseMoneyAmount(bracketMatch.groups.amount);
    if (amount === null) return null;

    return {
      sellerId: bracketMatch.groups.sellerId || null,
      sellerLabel: bracketMatch.groups.sellerId ? `<@${bracketMatch.groups.sellerId}>` : `@${bracketMatch.groups.sellerName}`,
      product: bracketMatch.groups.product.trim(),
      amount,
      payment: bracketMatch.groups.payment.trim(),
    };
  }

  const looseMatch = content?.trim().match(
    /^-?\+rep\s+(?:<@!?(?<sellerId>\d{17,20})>|@(?<sellerName>\S+))\s+(?<rest>.+)$/i,
  );

  if (!looseMatch?.groups) return null;

  const parts = looseMatch.groups.rest.trim().split(/\s+/);
  const amountIndex = parts.findIndex((part) => parseMoneyAmount(part) !== null);
  if (amountIndex === -1) return null;

  const amount = parseMoneyAmount(parts[amountIndex]);
  if (amount === null) return null;

  const product = parts.slice(0, amountIndex).join(" ").trim();
  const payment = parts.slice(amountIndex + 1).join(" ").trim();

  if (!product || !payment) return null;

  return {
    sellerId: looseMatch.groups.sellerId || null,
    sellerLabel: looseMatch.groups.sellerId ? `<@${looseMatch.groups.sellerId}>` : `@${looseMatch.groups.sellerName}`,
    product,
    amount,
    payment,
  };
}

function parseMoneyAmount(value) {
  const normalized = value
    .replace(/\s/g, "")
    .replace(",", ".")
    .match(/\d+(?:\.\d{1,2})?/);

  if (!normalized) return null;

  const amount = Number(normalized[0]);
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}

function buildSettlementRows(entries, commissionPercent) {
  const sellers = new Map();

  for (const entry of entries) {
    const key = entry.sellerId || entry.sellerLabel.toLowerCase();
    const row = sellers.get(key) || {
      sellerLabel: entry.sellerLabel,
      count: 0,
      total: 0,
      commission: 0,
      afterCommission: 0,
      examples: [],
    };

    row.count += 1;
    row.total += entry.amount;
    row.examples.push(entry);
    sellers.set(key, row);
  }

  return [...sellers.values()]
    .map((row) => ({
      ...row,
      commission: row.total * (commissionPercent / 100),
      afterCommission: row.total * (1 - commissionPercent / 100),
    }))
    .sort((first, second) => second.total - first.total);
}

function createSettlementsPanel({ rows, entriesCount, skippedCount, days, commissionPercent, channel, selectedSeller }) {
  const total = rows.reduce((sum, row) => sum + row.total, 0);
  const commission = rows.reduce((sum, row) => sum + row.commission, 0);
  const sellerNet = rows.reduce((sum, row) => sum + row.afterCommission, 0);
  const sellerText = selectedSeller ? `\n${et("osoba")} ・ **Sprzedawca:** ${selectedSeller}` : "";
  const rowsText = rows.length
    ? rows.slice(0, 15).map((row, index) => [
      `**${index + 1}. ${row.sellerLabel}**`,
      `> ${et("folder")} ・ Transakcje: \`${row.count}\``,
      `> ${et("kasa")} ・ Zarobił: \`${formatMoney(row.total)} PLN\``,
      `> ${et("statystyki")} ・ Do oddania (${formatPercent(commissionPercent)}): \`${formatMoney(row.commission)} PLN\``,
      `> ${et("like")} ・ Zostaje: \`${formatMoney(row.afterCommission)} PLN\``,
    ].join("\n")).join("\n\n")
    : "> Brak legit-checków w tym okresie.";

  return new ContainerBuilder()
    .setAccentColor(config.panelColor)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          "``` 💎 ・ Crystal Shop × ROZLICZENIA SPRZEDAWCÓW```",
          "",
          `${et("kalendarz")} ・ **Okres:** ostatnie \`${days}\` dni`,
          `${et("pin")} ・ **Kanał:** ${channel}`,
          `${et("folder")} ・ **Policzone legit-checki:** \`${entriesCount}\`${sellerText}`,
          "",
          `${et("kasa")} ・ **Łączny obrót:** \`${formatMoney(total)} PLN\``,
          `${et("statystyki")} ・ **Dla Ciebie:** \`${formatMoney(commission)} PLN\``,
          `${et("like")} ・ **Dla sprzedawców po odjęciu:** \`${formatMoney(sellerNet)} PLN\``,
        ].join("\n"),
      ),
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(rowsText.slice(0, 3500)),
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `${et("logo2")} © 2026 Crystal Shop × Rozliczenia | Pominięte przez filtr sprzedawcy: ${skippedCount}`,
      ),
    );
}

function formatMoney(value) {
  return value.toFixed(2).replace(".", ",");
}

function formatPercent(value) {
  return Number.isInteger(value) ? `${value}%` : `${String(value).replace(".", ",")}%`;
}

async function sendVerificationPanel(channel, image = config.panelImageUrl) {
  const button = new ButtonBuilder()
    .setCustomId("verify_start")
    .setEmoji(ce("like"))
    .setLabel("Kliknij, aby się zweryfikować")
    .setStyle(ButtonStyle.Secondary);

  const panel = new ContainerBuilder()
    .setAccentColor(config.panelColor)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          "``` 🖤 ・ Crystal Shop × WERYFIKACJA```",
          "",
          `${et("like")} | **Witaj,** kliknij w **przycisk poniżej**, aby się **zweryfikować!** Dzięki temu uzyskasz pełny dostęp do **naszego serwera!**`,
          "",
          "<:strzalka:1542459023817838602>| **pssst!** Nie sprzedamy Cię jako membersa / **nie dodamy** Cię nigdzie!",
        ].join("\n"),
      ),
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addActionRowComponents(new ActionRowBuilder().addComponents(button));

  if (image && /^https?:\/\//i.test(image)) {
    panel
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(
          new MediaGalleryItemBuilder().setURL(image),
        ),
      );
  }

  panel
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`${et("serce")} | © 2026 Crystal Shop × Weryfikacja`),
    );

  await channel.send({
    components: [panel],
    flags: MessageFlags.IsComponentsV2,
  });
}

async function showVerificationModal(interaction) {
  const modal = new ModalBuilder()
    .setCustomId("verify_modal")
    .setTitle("🖤 Weryfikacja — captcha");

  const answer = new TextInputBuilder()
    .setCustomId("verify_answer")
    .setLabel("Potwierdź, że nie jesteś botem: ile to 6 + 7?")
    .setPlaceholder("Wpisz wynik liczbą")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(10);

  modal.addComponents(new ActionRowBuilder().addComponents(answer));
  await interaction.showModal(modal);
}

async function verifyCaptcha(interaction) {
  const roleId = config.verificationRoleId;
  const answer = interaction.fields.getTextInputValue("verify_answer").trim();

  if (answer !== "13") {
    await interaction.reply({
      content: "Niepoprawna odpowiedź. Spróbuj ponownie.",
      ephemeral: true,
    });
    return;
  }

  const role = interaction.guild.roles.cache.get(roleId);
  if (!role) {
    await interaction.reply({
      content: "Nie znaleziono roli weryfikacji. Sprawdź ID roli w configu.",
      ephemeral: true,
    });
    return;
  }

  if (interaction.member.roles.cache.has(roleId)) {
    await interaction.reply({
      content: "Jesteś już zweryfikowany.",
      ephemeral: true,
    });
    return;
  }

  await interaction.member.roles.add(role, "Poprawna captcha weryfikacji");
  await interaction.reply({
    content: `Zweryfikowano! Nadano rolę ${role}.`,
    ephemeral: true,
  });
}

async function sendOpinionPanel(channel) {
  const button = new ButtonBuilder()
    .setCustomId("opinion_start")
    .setEmoji(ce("kredka1"))
    .setLabel("Wystaw opinię")
    .setStyle(ButtonStyle.Secondary);

  const panel = new ContainerBuilder()
    .setAccentColor(config.panelColor)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          "``` 🖤 ・ Crystal Shop × WYSTAW OPINIĘ```",
          "",
          "<:strzalka:1542459023817838602>・ Chcesz podzielić się **opinią** o naszym **serwerze?**",
          "<:strzalka:1542459023817838602>・ **Będziemy mega wdzięczni** za **wystawienie nam** opinii - buduje to **zaufanie** do nas!",
          "<:strzalka:1542459023817838602>・ **Kliknij** przycisk poniżej, aby wystawić opinię.",
        ].join("\n"),
      ),
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addActionRowComponents(new ActionRowBuilder().addComponents(button))
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent("© 2026 Crystal Shop × OPINIE"),
    );

  await channel.send({
    components: [panel],
    flags: MessageFlags.IsComponentsV2,
  });
}

async function showOpinionModal(interaction) {
  const modal = new ModalBuilder()
    .setCustomId("opinion_modal")
    .setTitle("Wystaw opinię");

  const opinion = new TextInputBuilder()
    .setCustomId("opinion_text")
    .setLabel("Treść opinii")
    .setPlaceholder("Napisz swoją opinię...")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(1000);

  const wait = new TextInputBuilder()
    .setCustomId("opinion_wait")
    .setLabel("Czas oczekiwania 1-5")
    .setPlaceholder("Np. 5")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(1);

  const quality = new TextInputBuilder()
    .setCustomId("opinion_quality")
    .setLabel("Jakość usługi 1-5")
    .setPlaceholder("Np. 5")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(1);

  const order = new TextInputBuilder()
    .setCustomId("opinion_order")
    .setLabel("Przebieg zamówienia 1-5")
    .setPlaceholder("Np. 5")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(1);

  modal.addComponents(
    new ActionRowBuilder().addComponents(opinion),
    new ActionRowBuilder().addComponents(wait),
    new ActionRowBuilder().addComponents(quality),
    new ActionRowBuilder().addComponents(order),
  );

  await interaction.showModal(modal);
}

async function submitOpinion(interaction) {
  const opinion = interaction.fields.getTextInputValue("opinion_text").trim();
  const wait = parseRating(interaction.fields.getTextInputValue("opinion_wait"));
  const quality = parseRating(interaction.fields.getTextInputValue("opinion_quality"));
  const order = parseRating(interaction.fields.getTextInputValue("opinion_order"));

  if (!wait || !quality || !order) {
    await interaction.reply({
      content: "Oceny muszą być liczbami od 1 do 5.",
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  const embed = new EmbedBuilder()
    .setColor(config.panelColor)
    .setDescription(
      [
        "``` 🖤 ・ Crystal Shop × OPINIE```",
        "",
        `${et("osoba")} ・ **Twórcą opinii jest:**`,
        `${interaction.user}`,
        "",
        `${et("dc")} ・ **Treść opinii:**`,
        `\`${opinion.replace(/`/g, "'").slice(0, 1000)}\``,
        "",
        `${et("statystyki")} ・ **Czas oczekiwania:** \`${formatStars(wait)}\``,
        `${et("kredka1")} ・ **Jakość usługi:** \`${formatStars(quality)}\``,
        `${et("folder")} ・ **Przebieg zamówienia:** \`${formatStars(order)}\``,
      ].join("\n"),
    );

  const image = normalizeImageUrl(config.panelImageUrl);
  if (image) {
    embed.setImage(image);
  }

  await deleteOpinionPanels(interaction.channel).catch((error) => {
    console.error("Nie udalo sie usunac starego panelu opinii:", error.message);
  });

  await interaction.channel.send({ embeds: [embed] });

  await sendOpinionPanel(interaction.channel).catch((error) => {
    console.error("Nie udalo sie wyslac nowego panelu opinii:", error.message);
  });

  await updateCountChannelName(interaction.channel, "opinion").catch((error) => {
    console.error("Nie udalo sie zaktualizowac licznika opinii:", error.message);
  });

  await interaction.editReply({
    content: "Dzięki! Twoja opinia została wysłana.",
  });
}

async function deleteOpinionPanels(channel) {
  const messages = await channel.messages.fetch({ limit: 50 }).catch(() => null);
  if (!messages) return;

  const panelMessages = messages.filter((message) =>
    message.author.id === client.user.id &&
    message.components.some((component) => hasComponentCustomId(component, "opinion_start")),
  );

  for (const message of panelMessages.values()) {
    await message.delete().catch(() => null);
  }
}

function hasComponentCustomId(component, customId) {
  if (component.customId === customId) return true;

  if (Array.isArray(component.components)) {
    return component.components.some((child) => hasComponentCustomId(child, customId));
  }

  if (component.accessory) {
    return hasComponentCustomId(component.accessory, customId);
  }

  return false;
}

function hasComponentText(component, text) {
  if (component.content?.includes(text)) return true;

  if (Array.isArray(component.components)) {
    return component.components.some((child) => hasComponentText(child, text));
  }

  if (component.accessory) {
    return hasComponentText(component.accessory, text);
  }

  return false;
}

function parseRating(value) {
  const rating = Number(value.trim());
  return Number.isInteger(rating) && rating >= 1 && rating <= 5 ? rating : null;
}

function formatStars(count) {
  return "⭐".repeat(count);
}

async function handleCountedChannelMessage(message) {
  if (isLegitChannel(message.channel)) {
    await sendLegitSaleNotification(message);
    await refreshLegitSticky(message.channel);
    return;
  }

  if (isOpinionCountChannel(message.channel)) {
    await updateCountChannelName(message.channel, "opinion");
  }
}

async function sendLegitSaleNotification(message) {
  const entry = parseLegitCheckContent(message.content);
  if (!entry || !config.legitNotifyChannelId) return;

  const channel = await message.guild.channels.fetch(config.legitNotifyChannelId).catch(() => null);
  if (!channel?.send) return;

  const sellerText = entry.sellerId ? `<@${entry.sellerId}>` : entry.sellerLabel;

  await channel.send({
    content: `${sellerText} + ${formatMoney(entry.amount)} PLN `,
    allowedMentions: entry.sellerId ? { users: [entry.sellerId] } : { parse: [] },
  }).catch((error) => {
    console.error("Nie udalo sie wyslac powiadomienia o legit-checku:", error.message);
  });
}

async function refreshLegitSticky(channel) {
  await deleteLegitStickyPanels(channel);
  await sendLegitStickyPanel(channel);
  await updateCountChannelName(channel, "legit");
}

async function deleteLegitStickyPanels(channel) {
  const messages = await channel.messages.fetch({ limit: 50 }).catch(() => null);
  if (!messages) return;

  const panelMessages = messages.filter((message) =>
    message.author.id === client.user.id &&
    message.components.some((component) => hasComponentText(component, "Crystal Shop × LEGIT CHECK")),
  );

  for (const message of panelMessages.values()) {
    await message.delete().catch(() => null);
  }
}

async function sendLegitStickyPanel(channel) {
  const panel = new ContainerBuilder()
    .setAccentColor(config.panelColor)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          "``` 🖤 ・ Crystal Shop × LEGIT CHECK```",
          "",
          "<:strzalka:1542459023817838602>× **Wzór:**",
          "`+rep @seller [ZAKUPIONA RZECZ] [KWOTA PLN] [METODA PŁATNOŚCI]`",
          "",
          "<:strzalka:1542459023817838602>× **Przykład:**",
          "`+rep @seller [Nitro] [16 PLN] [LTC]`",
        ].join("\n"),
      ),
    );

  const image = normalizeImageUrl(config.inviteImageUrl || config.panelImageUrl);
  if (image) {
    panel
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(
          new MediaGalleryItemBuilder().setURL(image),
        ),
      );
  }

  await channel.send({
    components: [panel],
    flags: MessageFlags.IsComponentsV2,
  });
}

async function sendLegitReactionPanel(channel) {
  const yesEmoji = formatCustomEmoji("TAK", config.reactionYesEmojiId, true);
  const noEmoji = formatCustomEmoji("nie", config.reactionNoEmojiId, true);

  const panel = new ContainerBuilder()
    .setAccentColor(config.panelColor)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          "``` 💎 ・ Crystal Shop × CZY JESTEŚMY LEGIT```",
          "",
          `${yesEmoji} × Uważasz, że **jesteśmy LEGIT?** Zostaw reakcję ${yesEmoji} **pod tą wiadomością!**`,
          `${noEmoji} × Twierdzisz, że **nie jesteśmy LEGIT?** Zareaguj ${noEmoji} **pod tą wiadomością!**`,
          "",
          `<:strzalka:1542459023817838602>・ **Wystawienie reakcji** ${et("nie")} **bez dowodu** skutkuje **natychmiastową przerwą na 7 dni!**`,
        ].join("\n"),
      ),
    );

  const image = normalizeImageUrl(config.panelImageUrl);
  if (image) {
    panel
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(
          new MediaGalleryItemBuilder().setURL(image),
        ),
      );
  }

  panel
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`${et("logo2")} © 2026 Crystal Shop × Zaznacz Reakcję`),
    );

  const panelMessage = await channel.send({
    components: [panel],
    flags: MessageFlags.IsComponentsV2,
  });

  await panelMessage.react(yesEmoji).catch((error) => {
    console.error("Nie udalo sie dodac reakcji TAK:", error.message);
  });

  await panelMessage.react(noEmoji).catch((error) => {
    console.error("Nie udalo sie dodac reakcji nie:", error.message);
  });

  await updateReactionCountChannelName(channel).catch((error) => {
    console.error("Nie udalo sie zaktualizowac licznika reakcji:", error.message);
  });
}

async function handleRestockMessage(message) {
  const content = message.content.trim();
  const firstImage = [...message.attachments.values()]
    .find((attachment) => attachment.contentType?.startsWith("image/"))
    ?.url;

  if (!content && !firstImage) return;

  await message.delete().catch((error) => {
    console.error("Nie udalo sie usunac wiadomosci restock:", error.message);
  });

  await sendRestockPanel(message.channel, message.member, content, firstImage);
}

async function sendRestockPanel(channel, member, content, imageUrl) {
  const orderUrl = `https://discord.com/channels/${channel.guild.id}/${config.restockOrderChannelId}`;
  const pingRole = config.restockPingRoleId ? `<@&${config.restockPingRoleId}>` : "`Brak roli`";
  const author = member || { id: null, toString: () => "`Nieznany autor`", user: { username: "unknown" } };
  const safeContent = (content || "*Dodano nowy restock.*").slice(0, 3000);

  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setEmoji(ce("kasa"))
      .setLabel("Złóż Zamówienie")
      .setStyle(ButtonStyle.Link)
      .setURL(orderUrl),
    new ButtonBuilder()
      .setCustomId("restock_ping_role")
      .setEmoji(ce("pin"))
      .setLabel("Otrzymuj Pingi")
      .setStyle(ButtonStyle.Secondary),
  );

  const panel = new ContainerBuilder()
    .setAccentColor(config.panelColor)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          "``` 💎 ・ Crystal Shop × RESTOCK```",
          "",
          `${et("osoba")} ・ **Utworzył:** ${author} \`${author.user?.username || "unknown"}\``,
          `${et("pin")} ・ **Ping:** ${pingRole}`,
          "",
          safeContent,
        ].join("\n"),
      ),
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addActionRowComponents(buttons);

  const image = normalizeImageUrl(imageUrl || config.panelImageUrl);
  if (image) {
    panel
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(
          new MediaGalleryItemBuilder().setURL(image),
        ),
      );
  }

  panel
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`${et("logo2")} © 2026 Crystal Shop × Restock`),
    );

  await channel.send({
    components: [panel],
    flags: MessageFlags.IsComponentsV2,
    allowedMentions: {
      users: author.id ? [author.id] : [],
      roles: config.restockPingRoleId ? [config.restockPingRoleId] : [],
    },
  });
}

async function giveRestockPingRole(interaction) {
  const roleId = config.restockPingRoleId;
  if (!roleId) {
    await interaction.reply({
      content: "Nie ustawiono roli pingów restock w configu.",
      ephemeral: true,
    });
    return;
  }

  const role = interaction.guild.roles.cache.get(roleId);
  if (!role) {
    await interaction.reply({
      content: "Nie znaleziono roli pingów restock. Sprawdź ID roli w configu.",
      ephemeral: true,
    });
    return;
  }

  if (interaction.member.roles.cache.has(roleId)) {
    await interaction.reply({
      content: `Masz już rolę ${role}.`,
      ephemeral: true,
    });
    return;
  }

  await interaction.member.roles.add(role, "Kliknięcie przycisku Otrzymuj Pingi przy restocku");

  await interaction.reply({
    content: `Gotowe, dostałeś rolę ${role}.`,
    ephemeral: true,
  });
}

async function handleBlacklistCommand(interaction) {
  if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({
      content: "Tylko administracja może dodawać i usuwać blacklistę.",
      ephemeral: true,
    });
    return;
  }

  const subcommand = interaction.options.getSubcommand();

  if (subcommand === "dodaj") {
    await addBlacklistEntry(interaction);
    return;
  }

  if (subcommand === "usuń" || subcommand === "usun") {
    await removeBlacklistByCommand(interaction);
  }
}

async function addBlacklistEntry(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const target = interaction.options.getUser("osoba");
  const reason = interaction.options.getString("powod")?.trim() || "Brak powodu.";
  const evidence = [];

  for (let index = 1; index <= 5; index += 1) {
    const attachment = interaction.options.getAttachment(`plik${index}`);
    if (!attachment) continue;

    evidence.push({
      name: attachment.name || `dowod-${index}`,
      url: attachment.url,
      contentType: attachment.contentType || null,
    });
  }

  const member = await interaction.guild.members.fetch(target.id).catch(() => null);
  const role = config.blacklistRoleId
    ? interaction.guild.roles.cache.get(config.blacklistRoleId)
    : null;

  if (member && role && !member.roles.cache.has(role.id)) {
    await member.roles.add(role, "Dodanie na blacklistę").catch((error) => {
      console.error("Nie udalo sie dodac roli blacklisty:", error.message);
    });
  }

  const panelMessage = await sendBlacklistPanel(interaction.channel, {
    target,
    moderator: interaction.user,
    reason,
    evidence,
    createdAt: Date.now(),
  });

  const data = readBlacklistData();
  data.entries[panelMessage.id] = {
    messageId: panelMessage.id,
    channelId: panelMessage.channel.id,
    guildId: interaction.guild.id,
    userId: target.id,
    userTag: target.tag,
    moderatorId: interaction.user.id,
    moderatorTag: interaction.user.tag,
    reason,
    evidence,
    createdAt: Date.now(),
  };
  writeBlacklistData(data);

  await interaction.editReply(`Dodano ${target} na blacklistę.`);
}

async function sendBlacklistPanel(channel, entry) {
  const displayDate = new Date(entry.createdAt).toLocaleString("pl-PL", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("blacklist_remove:pending")
      .setEmoji(ce("nie"))
      .setLabel("Usuń Blacklistę")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId("blacklist_evidence:pending")
      .setEmoji(ce("info"))
      .setLabel("Sprawdź Dodane Dowody")
      .setStyle(ButtonStyle.Secondary),
  );

  const info = new SectionBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          "``` 🖤 ・ Crystal Shop × BLACKLISTA```",
          "",
          `<:strzalka:1542459023817838602>・ ${et("osoba")} **Użytkownik:** ${entry.target}`,
          `<:strzalka:1542459023817838602>・ ${et("dc")} **ID:** \`${entry.target.id}\``,
          `<:strzalka:1542459023817838602>・ ${et("data")} **Data Dodania:** \`${displayDate}\``,
          `<:strzalka:1542459023817838602>・ ${et("info")} **Powód:** \`${entry.reason.replace(/`/g, "'").slice(0, 900)}\``,
        ].join("\n"),
      ),
    )
    .setThumbnailAccessory(
      new ThumbnailBuilder().setURL(entry.target.displayAvatarURL({ size: 256 })),
    );

  const panel = new ContainerBuilder()
    .setAccentColor(config.panelColor)
    .addSectionComponents(info)
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addActionRowComponents(buttons)
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `${et("logo2")} © 2026 Crystal Shop × Blacklista | Wystawione przez: ${entry.moderator.username}`,
      ),
    );

  const panelMessage = await channel.send({
    components: [panel],
    flags: MessageFlags.IsComponentsV2,
  });

  buttons.components[0].setCustomId(`blacklist_remove:${panelMessage.id}`);
  buttons.components[1].setCustomId(`blacklist_evidence:${panelMessage.id}`);

  await panelMessage.edit({
    components: [panel],
    flags: MessageFlags.IsComponentsV2,
  });

  return panelMessage;
}

async function showBlacklistEvidence(interaction) {
  const messageId = interaction.customId.split(":")[1];
  const entry = readBlacklistData().entries[messageId];

  if (!entry) {
    await interaction.reply({
      content: "Nie znaleziono dowodów dla tej blacklisty.",
      ephemeral: true,
    });
    return;
  }

  if (!entry.evidence.length) {
    await interaction.reply({
      content: "Do tej blacklisty nie dodano żadnych dowodów.",
      ephemeral: true,
    });
    return;
  }

  const embeds = entry.evidence.map((file, index) => {
    const embed = new EmbedBuilder()
      .setColor(config.panelColor)
      .setTitle(`Dowód ${index + 1}`)
      .setDescription(`[Otwórz plik](${file.url})`);

    if (file.contentType?.startsWith("image/")) {
      embed.setImage(file.url);
    }

    return embed;
  });

  await interaction.reply({
    embeds,
    ephemeral: true,
  });
}

async function removeBlacklistFromButton(interaction) {
  if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({
      content: "Tylko administracja może usuwać blacklistę.",
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  const messageId = interaction.customId.split(":")[1];
  const data = readBlacklistData();
  const entry = data.entries[messageId];

  if (!entry) {
    await interaction.editReply("Nie znaleziono tej blacklisty w zapisie.");
    return;
  }

  await removeBlacklistRole(interaction.guild, entry.userId);
  delete data.entries[messageId];
  writeBlacklistData(data);

  await interaction.message.delete().catch((error) => {
    console.error("Nie udalo sie usunac panelu blacklisty:", error.message);
  });

  await interaction.editReply("Blacklista została usunięta.");
}

async function removeBlacklistByCommand(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const target = interaction.options.getUser("osoba");
  const data = readBlacklistData();
  const removedEntries = Object.values(data.entries).filter((entry) =>
    entry.guildId === interaction.guild.id && entry.userId === target.id
  );

  for (const entry of removedEntries) {
    const channel = await client.channels.fetch(entry.channelId).catch(() => null);
    const message = await channel?.messages.fetch(entry.messageId).catch(() => null);

    if (message) {
      await message.delete().catch((error) => {
        console.error("Nie udalo sie usunac wiadomosci blacklisty:", error.message);
      });
    }

    delete data.entries[entry.messageId];
  }

  await removeBlacklistRole(interaction.guild, target.id);
  writeBlacklistData(data);

  await interaction.editReply(
    removedEntries.length
      ? `Usunięto ${target} z blacklisty.`
      : `${target} nie miał zapisanej blacklisty, ale rola została sprawdzona.`,
  );
}

async function removeBlacklistRole(guild, userId) {
  if (!config.blacklistRoleId) return;

  const member = await guild.members.fetch(userId).catch(() => null);
  if (!member?.roles.cache.has(config.blacklistRoleId)) return;

  await member.roles.remove(config.blacklistRoleId, "Usunięcie z blacklisty").catch((error) => {
    console.error("Nie udalo sie usunac roli blacklisty:", error.message);
  });
}

async function updateCountChannelName(channel, type) {
  const baseName = type === "opinion" ? config.opinionCountChannelName : config.legitCountChannelName;
  if (!baseName || !channel?.setName) return;

  const count = await countUserVisibleMessages(channel, type);
  const nextName = `${baseName}${count}`;

  if (channel.name === nextName) return;

  await channel.setName(nextName, `Aktualizacja licznika ${type}`).catch((error) => {
    console.error(`Nie udalo sie zaktualizowac licznika ${type}:`, error.message);
  });
}

async function handleReactionCountUpdate(reaction, user) {
  if (user?.bot) return;

  if (reaction.partial) {
    await reaction.fetch().catch(() => null);
  }

  if (reaction.message?.partial) {
    await reaction.message.fetch().catch(() => null);
  }

  const channel = reaction.message?.channel;
  if (!isReactionCountChannel(channel)) return;
  if (!isYesReaction(reaction)) return;

  await updateReactionCountChannelName(channel).catch((error) => {
    console.error("Nie udalo sie zaktualizowac licznika reakcji:", error.message);
  });
}

async function updateReactionCountChannelName(channel) {
  const baseName = config.reactionCountChannelName;
  if (!baseName || !channel?.setName) return;

  const count = await countYesReactions(channel);
  const nextName = `${baseName}${count}`;

  if (channel.name === nextName) return;

  await channel.setName(nextName, "Aktualizacja licznika reakcji TAK").catch((error) => {
    console.error("Nie udalo sie zaktualizowac licznika reakcji TAK:", error.message);
  });
}

async function updateConfiguredReactionCountChannel() {
  if (!config.reactionCountChannelId) return;

  const channel = await client.channels.fetch(config.reactionCountChannelId).catch(() => null);
  if (!channel) return;

  await updateReactionCountChannelName(channel).catch((error) => {
    console.error("Nie udalo sie zaktualizowac startowego licznika reakcji:", error.message);
  });
}

async function countYesReactions(channel) {
  let count = 0;
  let before;

  while (true) {
    const fetched = await channel.messages.fetch({ limit: 100, before }).catch(() => null);
    if (!fetched || fetched.size === 0) break;

    for (const message of fetched.values()) {
      const yesReaction = message.reactions.cache.find((reaction) => isYesReaction(reaction));
      if (!yesReaction) continue;

      count += Math.max(yesReaction.count - (yesReaction.me ? 1 : 0), 0);
    }

    before = fetched.last().id;
  }

  return count;
}

async function countUserVisibleMessages(channel, type) {
  let count = 0;
  let before;

  while (true) {
    const fetched = await channel.messages.fetch({ limit: 100, before }).catch(() => null);
    if (!fetched || fetched.size === 0) break;

    for (const message of fetched.values()) {
      if (type === "opinion") {
        if (isOpinionCountedMessage(message)) count += 1;
      } else if (isLegitCountedMessage(message)) {
        count += 1;
      }
    }

    before = fetched.last().id;
  }

  return count;
}

function isOpinionCountedMessage(message) {
  if (message.author.id === client.user.id) {
    return isOpinionResultMessage(message);
  }

  return !message.author.bot;
}

function isOpinionResultMessage(message) {
  return message.author.id === client.user.id &&
    message.embeds.some((embed) => embed.description?.includes("Crystal Shop × OPINIE"));
}

function isLegitCountedMessage(message) {
  return !message.author.bot;
}

function isReactionCountChannel(channel) {
  if (!channel) return false;

  if (config.reactionCountChannelId && channel.id === config.reactionCountChannelId) {
    return true;
  }

  return channel.name?.startsWith(config.reactionCountChannelName);
}

function isYesReaction(reaction) {
  return reaction?.emoji?.id === config.reactionYesEmojiId;
}

function formatCustomEmoji(name, id, animated = false) {
  return `<${animated ? "a" : ""}:${name}:${id}>`;
}

function isLegitChannel(channel) {
  if (!channel) return false;

  if (config.legitCountChannelId && channel.id === config.legitCountChannelId) {
    if (config.legitCountChannelId !== config.opinionCountChannelId) return true;
    return channel.name?.startsWith(config.legitCountChannelName);
  }

  return channel.name?.startsWith(config.legitCountChannelName);
}

function isOpinionCountChannel(channel) {
  if (!channel) return false;

  if (config.opinionCountChannelId && channel.id === config.opinionCountChannelId) {
    if (config.legitCountChannelId !== config.opinionCountChannelId) return true;
    return channel.name?.startsWith(config.opinionCountChannelName);
  }

  return channel.name?.startsWith(config.opinionCountChannelName);
}

async function sendDropPanel(channel, image = config.dropImageUrl) {
  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("drop_roll")
      .setEmoji(ce("gift"))
      .setLabel("Wylosuj zniżkę")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("drop_inventory")
      .setEmoji(ce("folder"))
      .setLabel("Ekwipunek")
      .setStyle(ButtonStyle.Secondary),
  );

  const panel = new ContainerBuilder()
    .setAccentColor(config.panelColor)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          "``` 🖤 ・ Crystal Shop × WYLOSUJ ZNIŻKĘ```",
          "",
          `${et("gift")} ・ **Witaj** w systemie **dropów!** Raz na **24h** możesz wylosować zniżkę, dzięki której kupisz u nas **produkty** taniej o tyle **%**, ile **wylosowałeś!**`,
        ].join("\n"),
      ),
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addActionRowComponents(buttons);

  const normalizedImage = normalizeImageUrl(image);
  if (normalizedImage && normalizedImage !== "WKLEJ_TUTAJ_LINK_DO_OBRAZKA_DROP") {
    panel
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(
          new MediaGalleryItemBuilder().setURL(normalizedImage),
        ),
      );
  }

  panel
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`${et("logo2")} © 2026 Crystal Shop × Wylosuj Zniżkę`),
    );

  await channel.send({
    components: [panel],
    flags: MessageFlags.IsComponentsV2,
  });
}

async function sendWelcomeMessage(member) {
  if (!isRealDiscordId(config.welcomeChannelId)) return;

  const channel = member.guild.channels.cache.get(config.welcomeChannelId);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setColor(config.panelColor)
    .setDescription(
      [
        `\`\`\` 👋 ${config.serverBrandName || member.guild.name} × WITAMY\`\`\``,
        "",
        `> ${et("powitanie")} × **Dzięki za dołączenie na serwer ${config.serverBrandName || member.guild.name}**`,
        `> ${et("zegar")} × **Dołączono na serwer <t:${Math.floor(Date.now() / 1000)}:R>**`,
        `> ${et("osoby")} × **Aktualnie jest nas łącznie: \`${member.guild.memberCount} osób!\`**`,
      ].join("\n"),
    );

  embed.setThumbnail(member.user.displayAvatarURL({ size: 256 }));

  await channel.send({
    content: `${member}`,
    embeds: [embed],
  });
}

async function sendLeaveMessage(member) {
  if (!isRealDiscordId(config.leaveChannelId)) return;

  const channel = member.guild.channels.cache.get(config.leaveChannelId);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setColor(config.panelColor)
    .setDescription(
      [
        `\`\`\` 🛫 ${config.serverBrandName || member.guild.name} × ŻEGNAMY\`\`\``,
        "",
        `> ${et("powitanie")} × **${member.user.tag} opuścił serwer ${config.serverBrandName || member.guild.name}.**`,
        `> ${et("zegar")} × **Odlot nastąpił <t:${Math.floor(Date.now() / 1000)}:R>**`,
        `> ${et("osoby")} × **Aktualnie jest nas łącznie: \`${member.guild.memberCount} osób!\`**`,
      ].join("\n"),
    );

  embed.setThumbnail(member.user.displayAvatarURL({ size: 256 }));

  await channel.send({ embeds: [embed] });
}

async function showInviteStats(interaction) {
  const startedAt = Date.now();
  const target = interaction.options.getUser("uzytkownik") || interaction.user;
  const stats = getInviteUser(readInviteData(), interaction.guild.id, target.id);
  const currentJoins = await countCurrentInviteUses(interaction.guild, target.id);

  if (currentJoins === null) {
    await interaction.reply({
      content: "Nie mogę sprawdzić zaproszeń. Bot potrzebuje uprawnienia **Zarządzanie serwerem**.",
      ephemeral: true,
    });
    return;
  }

  const joins = Math.max(stats.joins || 0, currentJoins);
  const leaves = stats.leaves || 0;
  const total = Math.max(joins - leaves, 0);
  const generatedIn = Date.now() - startedAt;

  const embed = new EmbedBuilder()
    .setColor(config.panelColor)
    .setAuthor({
      name: target.username,
      iconURL: target.displayAvatarURL({ size: 128 }),
    })
    .setDescription(
      [
        `*Liczba zaproszeń została wygenerowana w ${generatedIn}ms.*`,
        "",
        `${et("like")} **${joins}** dołączeń`,
        `${et("nie")} **${leaves}** wyjść`,
        "",
        `Masz **${total}** zaproszeń! ${et("like")}`,
      ].join("\n"),
    )
    .setThumbnail(target.displayAvatarURL({ size: 256 }))
    .setFooter({
      text: `Crystal Shop · Zapytane przez ${interaction.user.username} · ${formatShortDate(new Date())}`,
      iconURL: interaction.client.user.displayAvatarURL({ size: 64 }),
    });

  await interaction.reply({ embeds: [embed] });
}

async function cacheAllGuildInvites() {
  for (const guild of client.guilds.cache.values()) {
    await cacheGuildInvites(guild).catch((error) => {
      console.error(`Nie udalo sie zapisac invite cache dla ${guild.name}:`, error.message);
    });
  }
}

async function cacheGuildInvites(guild) {
  const invites = await guild.invites.fetch();
  inviteCache.set(guild.id, new Map(invites.map((invite) => [invite.code, invite.uses || 0])));
}

async function trackInviteJoin(member) {
  const oldInvites = inviteCache.get(member.guild.id) || new Map();
  const newInvites = await member.guild.invites.fetch().catch(() => null);
  if (!newInvites) return null;

  const usedInvite = newInvites.find((invite) => (invite.uses || 0) > (oldInvites.get(invite.code) || 0));
  inviteCache.set(member.guild.id, new Map(newInvites.map((invite) => [invite.code, invite.uses || 0])));

  if (!usedInvite?.inviter) return null;

  if (usedInvite.code?.toLowerCase() === config.vanityInviteCode?.toLowerCase()) {
    return null;
  }

  const data = readInviteData();
  const userStats = getInviteUser(data, member.guild.id, usedInvite.inviter.id);
  userStats.joins += 1;
  const totalInvites = Math.max((userStats.joins || 0) - (userStats.leaves || 0), 0);

  data.guilds[member.guild.id].members[member.id] = {
    inviterId: usedInvite.inviter.id,
    inviteCode: usedInvite.code,
  };
  writeInviteData(data);

  return {
    code: usedInvite.code,
    inviter: usedInvite.inviter,
    totalInvites,
  };
}

async function sendInviteJoinMessage(member, inviteInfo) {
  if (!inviteInfo || !isRealDiscordId(config.inviteJoinChannelId)) return;

  const channel = member.guild.channels.cache.get(config.inviteJoinChannelId);
  if (!channel) return;

  const rulesUrl = `https://discord.com/channels/${member.guild.id}/${config.rulesChannelId}`;
  const panel = new ContainerBuilder()
    .setAccentColor(config.panelColor)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent("``` 💎 ・ CrystalShop × ZAPROSZENIE```"),
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            [
              `• ${et("osoba")} ・ ${member} dołączył na serwer dzięki ${inviteInfo.inviter} z użyciem kodu zaproszenia: \`${inviteInfo.code}\``,
              `• ${et("lupa")} ・ ${inviteInfo.inviter} posiada aktualnie: \`${inviteInfo.totalInvites}\` zaproszeń`,
            ].join("\n"),
          ),
        )
        .setThumbnailAccessory(
          new ThumbnailBuilder().setURL(inviteInfo.inviter.displayAvatarURL({ size: 256 })),
        ),
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            [
              `${et("regulamin")} ・ **Sprawdź nasz regulamin**`,
              "Zanim zrobisz ticketa prosimy - obczaj nasz regulamin.",
            ].join("\n"),
          ),
        )
        .setButtonAccessory(
          new ButtonBuilder()
            .setLabel("Obczaj Regulamin!")
            .setEmoji(ce("lupa"))
            .setStyle(ButtonStyle.Link)
            .setURL(rulesUrl),
        ),
    );

  const image = normalizeImageUrl(config.inviteImageUrl || config.panelImageUrl);
  if (image) {
    panel
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(
          new MediaGalleryItemBuilder().setURL(image),
        ),
      );
  }

  panel
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`${et("serce")} © 2026 CrystalShop × Zaproszenie`),
    );

  await channel.send({
    components: [panel],
    flags: MessageFlags.IsComponentsV2,
  });
}

function trackInviteLeave(member) {
  const data = readInviteData();
  const guildData = getInviteGuild(data, member.guild.id);
  const memberInvite = guildData.members[member.id];

  if (!memberInvite?.inviterId) return;

  const userStats = getInviteUser(data, member.guild.id, memberInvite.inviterId);
  userStats.leaves += 1;
  delete guildData.members[member.id];
  writeInviteData(data);
}

async function countCurrentInviteUses(guild, userId) {
  const invites = await guild.invites.fetch().catch(() => null);
  if (!invites) return null;

  inviteCache.set(guild.id, new Map(invites.map((invite) => [invite.code, invite.uses || 0])));

  return invites
    .filter((invite) => invite.inviter?.id === userId)
    .reduce((total, invite) => total + (invite.uses || 0), 0);
}

async function createGiveaway(interaction) {
  const prize = interaction.options.getString("nagroda");
  const winnersCount = interaction.options.getInteger("zwyciezcy");
  const durationInput = interaction.options.getString("czas");
  const durationMs = parseDuration(durationInput);

  if (!durationMs) {
    await interaction.reply({
      content: "Podaj poprawny czas, np. `30m`, `2h`, `1d`.",
      ephemeral: true,
    });
    return;
  }

  const endsAt = Date.now() + durationMs;
  const image = normalizeImageUrl(config.giveawayImageUrl);

  const message = await interaction.channel.send({
    components: [createGiveawayPanel({ prize, winnersCount, endsAt, participantsCount: 0, image, giveawayId: "pending" })],
    flags: MessageFlags.IsComponentsV2,
  });

  const data = readGiveawayData();
  data.giveaways[message.id] = {
    id: message.id,
    channelId: message.channel.id,
    guildId: interaction.guild.id,
    prize,
    winnersCount,
    endsAt,
    image: image || null,
    participants: [],
    ended: false,
  };
  writeGiveawayData(data);
  await message.edit({
    components: [createGiveawayPanel({ prize, winnersCount, endsAt, participantsCount: 0, image, giveawayId: message.id })],
    flags: MessageFlags.IsComponentsV2,
  });
  scheduleGiveawayEnd(message.id, durationMs);

  await interaction.reply({
    content: "Konkurs zostal wyslany.",
    ephemeral: true,
  });
}

async function joinGiveaway(interaction) {
  const giveawayId = interaction.customId.split(":")[1];
  const data = readGiveawayData();
  const giveaway = data.giveaways[giveawayId];

  if (!giveaway || giveaway.ended || giveaway.endsAt <= Date.now()) {
    await interaction.reply({
      content: "Ten konkurs jest juz zakonczony.",
      ephemeral: true,
    });
    return;
  }

  if (giveaway.participants.includes(interaction.user.id)) {
    await interaction.reply({
      content: "Juz bierzesz udzial w tym konkursie.",
      ephemeral: true,
    });
    return;
  }

  giveaway.participants.push(interaction.user.id);
  writeGiveawayData(data);

  await interaction.update({
    embeds: [],
    components: [createGiveawayPanel({
      prize: giveaway.prize,
      winnersCount: giveaway.winnersCount,
      endsAt: giveaway.endsAt,
      participantsCount: giveaway.participants.length,
      image: giveaway.image,
      giveawayId: giveaway.id,
    })],
    flags: MessageFlags.IsComponentsV2,
  });

  await interaction.followUp({
    content: "Dołączono do konkursu. Powodzenia!",
    ephemeral: true,
  });
}

function createGiveawayPanel({ prize, winnersCount, endsAt, participantsCount, image, giveawayId, disabled = false, winners = [] }) {
  const winnersLine = winners.length
    ? `> ${et("puchar")} ・ **Zwycięzcy:** ${winners.map((winnerId) => `<@${winnerId}>`).join(", ")}`
    : null;

  const panel = new ContainerBuilder()
    .setAccentColor(config.panelColor)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          "``` 💎 ・ Crystal Shop × KONKURS```",
          "",
          `> <:strzalka:1542459023817838602>・ **Nagrodą W Konkursie Jest:** \`${prize}\``,
          `> <:strzalka:1542459023817838602>・ **Nagrodę Może Wygrać:** \`${winnersCount} ${formatPolishPeople(winnersCount)}\``,
          `> <:strzalka:1542459023817838602>・ **Koniec:** <t:${Math.floor(endsAt / 1000)}:R> (<t:${Math.floor(endsAt / 1000)}:F>)`,
          winnersLine ? "" : null,
          winnersLine,
        ].filter(Boolean).join("\n"),
      ),
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addActionRowComponents(createGiveawayButtons(giveawayId, disabled, participantsCount));

  if (image && /^https?:\/\//i.test(image)) {
    panel
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(
          new MediaGalleryItemBuilder().setURL(image),
        ),
      );
  }

  return panel
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`${et("kudka")} © 2026 Crystal Shop`),
    );
}

function createGiveawayButtons(giveawayId, disabled = false, participantsCount = 0) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`giveaway_join:${giveawayId}`)
      .setEmoji(ce("konkurs"))
      .setLabel(disabled ? "Konkurs zakończony!" : "Kliknij, aby dołączyć do konkursu!")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(`giveaway_count:${giveawayId}`)
      .setEmoji(ce("osoby"))
      .setLabel(`W konkursie wzięło udział ${participantsCount} osób!`)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),
  );
}

function scheduleStoredGiveaways() {
  const data = readGiveawayData();

  for (const giveaway of Object.values(data.giveaways)) {
    if (giveaway.ended) continue;

    const delay = giveaway.endsAt - Date.now();
    if (delay <= 0) {
      endGiveaway(giveaway.id).catch((error) => console.error("Blad przy konczeniu konkursu:", error));
    } else {
      scheduleGiveawayEnd(giveaway.id, delay);
    }
  }
}

function scheduleGiveawayEnd(giveawayId, delay) {
  setTimeout(() => {
    endGiveaway(giveawayId).catch((error) => console.error("Blad przy konczeniu konkursu:", error));
  }, Math.min(delay, 2_147_483_647));
}

async function endGiveaway(giveawayId) {
  const data = readGiveawayData();
  const giveaway = data.giveaways[giveawayId];

  if (!giveaway || giveaway.ended) return;

  giveaway.ended = true;
  const winners = pickWinners(giveaway.participants, giveaway.winnersCount);
  giveaway.winners = winners;
  writeGiveawayData(data);

  const channel = await client.channels.fetch(giveaway.channelId).catch(() => null);
  if (!channel) return;

  const message = await channel.messages.fetch(giveaway.id).catch(() => null);
  if (message) {
    await message.edit({
      embeds: [],
      components: [createGiveawayPanel({
        prize: giveaway.prize,
        winnersCount: giveaway.winnersCount,
        endsAt: giveaway.endsAt,
        participantsCount: giveaway.participants.length,
        image: giveaway.image,
        giveawayId: giveaway.id,
        disabled: true,
        winners,
      })],
      flags: MessageFlags.IsComponentsV2,
    }).catch(() => null);
  }

  if (winners.length) {
    await channel.send(`${et("konkurs")} Konkurs zakończony! Nagroda: **${giveaway.prize}**. Zwycięzcy: ${winners.map((winnerId) => `<@${winnerId}>`).join(", ")}`);
  } else {
    await channel.send(`${et("konkurs")} Konkurs **${giveaway.prize}** zakończony, ale nikt nie wziął udziału.`);
  }
}

function pickWinners(participants, winnersCount) {
  return [...participants]
    .sort(() => Math.random() - 0.5)
    .slice(0, winnersCount);
}

async function rollDrop(interaction) {
  const data = readDropData();
  const userData = getDropUser(data, interaction.user.id);
  const now = Date.now();

  pruneExpiredDrops(userData, now);

  if (userData.nextRollAt && userData.nextRollAt > now) {
    await interaction.reply({
      embeds: [createDropCooldownEmbed(interaction.user, userData.nextRollAt)],
      ephemeral: true,
    });
    writeDropData(data);
    return;
  }

  userData.nextRollAt = now + dayMs;
  const reward = drawDropReward();

  if (reward) {
    userData.items.push({
      label: reward.label,
      percent: reward.percent,
      expiresAt: now + dayMs,
    });
  }

  writeDropData(data);

  await interaction.reply({
    embeds: [reward ? createDropWinEmbed(interaction.user, reward, userData.nextRollAt) : createDropMissEmbed(interaction.user, userData.nextRollAt)],
    ephemeral: true,
  });
}

async function showDropInventory(interaction) {
  const data = readDropData();
  const userData = getDropUser(data, interaction.user.id);
  const now = Date.now();

  pruneExpiredDrops(userData, now);
  writeDropData(data);

  const activeItems = userData.items
    .filter((item) => item.expiresAt > now)
    .sort((first, second) => second.percent - first.percent);

  const description = [
    "```              Crystal Shop ╱ EKWIPUNEK```",
    "",
    `> ${et("gift")} · **Twoje aktywne zniżki:**`,
    activeItems.length
      ? activeItems.map((item, index) => `> ${index + 1}. ${item.label} → wygasa <t:${Math.floor(item.expiresAt / 1000)}:R>`).join("\n")
      : "> Brak aktywnych zniżek. Spróbuj szczęścia w dropie!",
    "",
    `> ${et("pin")} · Pokaż ten panel podczas tworzenia zamówienia, aby skorzystać z rabatu!`,
    "",
    `-# ${et("logo2")} © 2026 Crystal Shop ∿ Ekwipunek`,
  ].join("\n");

  await interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(config.panelColor)
        .setDescription(description),
    ],
    ephemeral: true,
  });
}

function createDropMissEmbed(user, nextRollAt) {
  return new EmbedBuilder()
    .setColor(config.panelColor)
    .setDescription(
      [
        "```              Crystal Shop ╱ DROP```",
        "",
        `> ${et("nie")} · Niestety ${user}, tym razem **nic nie wygrałeś.**`,
        `> ${et("pin")} · Kolejna próba: <t:${Math.floor(nextRollAt / 1000)}:R>.`,
        "",
        `-# ${et("logo2")} © 2026 Crystal Shop ∿ Drop`,
      ].join("\n"),
    );
}

function createDropWinEmbed(user, reward, nextRollAt) {
  return new EmbedBuilder()
    .setColor(config.panelColor)
    .setDescription(
      [
        "```              Crystal Shop ╱ DROP```",
        "",
        `> ${et("like")} · Gratulacje ${user}, wygrałeś **${reward.label}!**`,
        `> ${et("gift")} · Zniżka wygasa za **24 godziny** — znajdziesz ją w ekwipunku.`,
        `> ${et("pin")} · Kolejna próba: <t:${Math.floor(nextRollAt / 1000)}:R>.`,
        "",
        `-# ${et("logo2")} © 2026 Crystal Shop ∿ Drop`,
      ].join("\n"),
    );
}

function createDropCooldownEmbed(user, nextRollAt) {
  return new EmbedBuilder()
    .setColor(config.panelColor)
    .setDescription(
      [
        "```              Crystal Shop ╱ DROP```",
        "",
        `> ${et("nie")} · ${user}, **nie możesz teraz losować**.`,
        `> ${et("pin")} · Możesz wylosować za <t:${Math.floor(nextRollAt / 1000)}:R>.`,
        "",
        `-# ${et("logo2")} © 2026 Crystal Shop ∿ Drop`,
      ].join("\n"),
    );
}

function drawDropReward() {
  const roll = Math.random() * 100;
  let threshold = 0;

  for (const reward of dropRewards) {
    threshold += reward.chance;
    if (roll < threshold) {
      return reward;
    }
  }

  return null;
}

function readDropData() {
  if (!fs.existsSync(dropDataPath)) {
    return { users: {} };
  }

  try {
    const data = JSON.parse(fs.readFileSync(dropDataPath, "utf8"));
    return {
      users: data.users && typeof data.users === "object" ? data.users : {},
    };
  } catch (error) {
    console.error("Nie udalo sie odczytac drop-data.json:", error);
    return { users: {} };
  }
}

function writeDropData(data) {
  fs.writeFileSync(dropDataPath, JSON.stringify(data, null, 2));
}

function readGiveawayData() {
  if (!fs.existsSync(giveawayDataPath)) {
    return { giveaways: {} };
  }

  try {
    const data = JSON.parse(fs.readFileSync(giveawayDataPath, "utf8"));
    return {
      giveaways: data.giveaways && typeof data.giveaways === "object" ? data.giveaways : {},
    };
  } catch (error) {
    console.error("Nie udalo sie odczytac giveaway-data.json:", error);
    return { giveaways: {} };
  }
}

function writeGiveawayData(data) {
  fs.writeFileSync(giveawayDataPath, JSON.stringify(data, null, 2));
}

function readInviteData() {
  if (!fs.existsSync(inviteDataPath)) {
    return { guilds: {} };
  }

  try {
    const data = JSON.parse(fs.readFileSync(inviteDataPath, "utf8"));
    return {
      guilds: data.guilds && typeof data.guilds === "object" ? data.guilds : {},
    };
  } catch (error) {
    console.error("Nie udalo sie odczytac invite-data.json:", error);
    return { guilds: {} };
  }
}

function writeInviteData(data) {
  fs.writeFileSync(inviteDataPath, JSON.stringify(data, null, 2));
}

function readBlacklistData() {
  if (!fs.existsSync(blacklistDataPath)) {
    return { entries: {} };
  }

  try {
    const data = JSON.parse(fs.readFileSync(blacklistDataPath, "utf8"));
    return {
      entries: data.entries && typeof data.entries === "object" ? data.entries : {},
    };
  } catch (error) {
    console.error("Nie udalo sie odczytac blacklist-data.json:", error);
    return { entries: {} };
  }
}

function writeBlacklistData(data) {
  fs.writeFileSync(blacklistDataPath, JSON.stringify(data, null, 2));
}

function readCennikData() {
  if (!fs.existsSync(cennikDataPath)) {
    const defaults = createDefaultCennikData();
    writeCennikData(defaults);
    return defaults;
  }

  try {
    const data = JSON.parse(fs.readFileSync(cennikDataPath, "utf8"));
    return {
      categories: data.categories && typeof data.categories === "object" ? data.categories : {},
    };
  } catch (error) {
    console.error("Nie udalo sie odczytac cennik-data.json:", error);
    return createDefaultCennikData();
  }
}

function writeCennikData(data) {
  fs.writeFileSync(cennikDataPath, JSON.stringify(data, null, 2));
}

function readSettlementData() {
  if (!fs.existsSync(settlementDataPath)) {
    return { guilds: {} };
  }

  try {
    const data = JSON.parse(fs.readFileSync(settlementDataPath, "utf8"));
    return {
      guilds: data.guilds && typeof data.guilds === "object" ? data.guilds : {},
    };
  } catch (error) {
    console.error("Nie udalo sie odczytac settlement-data.json:", error);
    return { guilds: {} };
  }
}

function writeSettlementData(data) {
  fs.writeFileSync(settlementDataPath, JSON.stringify(data, null, 2));
}

function getSettlementResetTimestamp(data, guildId, sellerId) {
  const guildData = data.guilds[guildId];
  if (!guildData) return 0;

  const globalResetAt = Number(guildData.globalResetAt) || 0;
  const sellerResetAt = sellerId ? Number(guildData.sellerResetAt?.[sellerId]) || 0 : 0;

  return Math.max(globalResetAt, sellerResetAt);
}

function createDefaultCennikData() {
  return {
    categories: {
      cennik_robux: {
        key: "cennik_robux",
        label: "Robux",
        title: "Cennik Robux",
        description: "Robuxy",
        emoji: et("kasa"),
        content: [
          `> ${et("kasa")} ・ **1,000 Robux** ➔ **21 PLN**`,
          `> ${et("kasa")} ・ **2,000 Robux** ➔ **38 PLN**`,
          `> ${et("kasa")} ・ **5,000 Robux** ➔ **75 PLN**`,
          `> ${et("kasa")} ・ **10,000 Robux** ➔ **140 PLN**`,
        ].join("\n"),
      },
      cennik_sab: {
        key: "cennik_sab",
        label: "SAB",
        title: "Cennik SAB",
        description: "Przedmioty SAB",
        emoji: et("gift"),
        content: [
          `> ${et("gift")} ・ **Dragon Base** ➔ **60 PLN**`,
          `> ${et("gift")} ・ **Dragon Gold** ➔ **65 PLN**`,
          `> ${et("gift")} ・ **Dragon Diax** ➔ **70 PLN**`,
          `> ${et("gift")} ・ **Garama** ➔ **5 PLN**`,
        ].join("\n"),
      },
      cennik_jailbreak: {
        key: "cennik_jailbreak",
        label: "Jailbreak",
        title: "Cennik Jailbreak",
        description: "Przedmioty Jailbreak",
        emoji: et("gift"),
        content: [
          `> ${et("gift")} ・ **Skorpion** ➔ **30 PLN**`,
          `> ${et("gift")} ・ **Proto-08** ➔ **120 PLN**`,
          `> ${et("gift")} ・ **Drip** ➔ **80 PLN**`,
          `> ${et("gift")} ・ **Hypergreen 5** ➔ **95 PLN**`,
        ].join("\n"),
      },
      cennik_ps99: {
        key: "cennik_ps99",
        label: "PS99",
        title: "Cennik PS99",
        description: "Przedmioty Pet Simulator 99",
        emoji: et("gift"),
        content: [
          `> ${et("gift")} ・ **Titanic Legionar Bear** ➔ **16 PLN**`,
          `> ${et("gift")} ・ **Titanic North Pole Unicorn** ➔ **16 PLN**`,
          `> ${et("gift")} ・ **Titanic Werewolf** ➔ **15 PLN**`,
        ].join("\n"),
      },
      cennik_gag2: {
        key: "cennik_gag2",
        label: "GAG2",
        title: "Cennik GAG2",
        description: "Przedmioty Grow a Garden 2",
        emoji: et("gift"),
        content: [
          `> **${et("gift")} ・ PETY:**`,
          `> ${et("gift")} ・ **Black Dragon** ➔ **150 PLN**`,
          `> ${et("gift")} ・ **Ice Serpent** ➔ **150 PLN**`,
          `> ${et("gift")} ・ **Racoon** ➔ **6 PLN**`,
          "",
          `> **${et("gift")} ・ SEEDY:**`,
          `> ${et("gift")} ・ **Star Fruit Seed** ➔ **2 PLN**`,
          `> ${et("gift")} ・ **Sun Bloom Seed** ➔ **0.50 PLN**`,
        ].join("\n"),
      },
    },
  };
}

function getInviteGuild(data, guildId) {
  if (!data.guilds[guildId]) {
    data.guilds[guildId] = {
      users: {},
      members: {},
    };
  }

  if (!data.guilds[guildId].users || typeof data.guilds[guildId].users !== "object") {
    data.guilds[guildId].users = {};
  }

  if (!data.guilds[guildId].members || typeof data.guilds[guildId].members !== "object") {
    data.guilds[guildId].members = {};
  }

  return data.guilds[guildId];
}

function getInviteUser(data, guildId, userId) {
  const guildData = getInviteGuild(data, guildId);

  if (!guildData.users[userId]) {
    guildData.users[userId] = {
      joins: 0,
      leaves: 0,
    };
  }

  guildData.users[userId].joins = Number(guildData.users[userId].joins) || 0;
  guildData.users[userId].leaves = Number(guildData.users[userId].leaves) || 0;

  return guildData.users[userId];
}

function parseDuration(input) {
  const match = input?.trim().toLowerCase().match(/^(\d+)\s*(m|h|d)$/);
  if (!match) return null;

  const amount = Number(match[1]);
  const unit = match[2];
  const multipliers = {
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: dayMs,
  };

  return amount > 0 ? amount * multipliers[unit] : null;
}

function formatPolishPeople(count) {
  if (count === 1) return "osoba";
  if ([2, 3, 4].includes(count)) return "osoby";
  return "osób";
}

function normalizeImageUrl(url) {
  if (!url || url.startsWith("WKLEJ_")) return null;
  return url
    .replace(/\\&/g, "&")
    .replace(/[?&]=$/, "")
    .trim();
}

function isRealDiscordId(value) {
  return typeof value === "string" && /^\d{17,20}$/.test(value);
}

function formatShortDate(date) {
  return `Dziś o ${date.toLocaleTimeString("pl-PL", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function getDropUser(data, userId) {
  if (!data.users[userId]) {
    data.users[userId] = {
      nextRollAt: 0,
      items: [],
    };
  }

  if (!Array.isArray(data.users[userId].items)) {
    data.users[userId].items = [];
  }

  return data.users[userId];
}

function pruneExpiredDrops(userData, now = Date.now()) {
  userData.items = userData.items.filter((item) => item.expiresAt > now);
}

async function showTicketModal(interaction) {
  const type = ticketTypes[interaction.values[0]];

  if (!type) {
    await interaction.reply({ content: "Nie znaleziono tej kategorii.", ephemeral: true });
    return;
  }

  const modal = new ModalBuilder()
    .setCustomId(`ticket_modal:${interaction.values[0]}`)
    .setTitle(type.modalTitle);

  for (const [id, label] of type.questions) {
    const input = new TextInputBuilder()
      .setCustomId(id)
      .setLabel(label.slice(0, 45))
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(500);

    if (["problem", "situation"].includes(id)) {
      input.setStyle(TextInputStyle.Paragraph);
    }

    modal.addComponents(new ActionRowBuilder().addComponents(input));
  }

  await interaction.showModal(modal);
}

async function createTicket(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const typeKey = interaction.customId.split(":")[1];
  const type = ticketTypes[typeKey];

  if (!type) {
    await interaction.editReply("Nie znaleziono tej kategorii.");
    return;
  }

  const existing = interaction.guild.channels.cache.find(
    (channel) => channel.topic?.includes(`ticket-owner:${interaction.user.id}`) && channel.name.startsWith(type.channelPrefix),
  );

  if (existing) {
    await interaction.editReply(`Masz juz otwarty taki ticket: ${existing}`);
    return;
  }

  const ticketRoute = getTicketRoute(interaction.guild, typeKey);
  const channel = await interaction.guild.channels.create({
    name: `${type.channelPrefix}-${interaction.user.username}`.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 90),
    type: ChannelType.GuildText,
    parent: ticketRoute.categoryId,
    topic: `ticket-owner:${interaction.user.id};ticket-type:${typeKey}`,
    lockPermissions: true,
  });

  await channel.permissionOverwrites.edit(interaction.user.id, {
    ViewChannel: true,
    SendMessages: true,
    ReadMessageHistory: true,
    AttachFiles: true,
  }).catch(() => null);

  for (const roleId of ticketRoute.roleIds) {
    await channel.permissionOverwrites.edit(roleId, {
      ViewChannel: true,
      SendMessages: true,
      ReadMessageHistory: true,
      ManageMessages: true,
    }).catch(() => null);
  }

  const answers = type.questions.map(([id, label]) => ({
    id,
    label,
    value: interaction.fields.getTextInputValue(id),
  }));

  const answerLines = answers.map((answer) => {
    const value = answer.value.replace(/`/g, "'").slice(0, 500);
    return `${getTicketAnswerIcon(answer.id)} **${getTicketAnswerLabel(answer.id, answer.label)}:** \`${value}\``;
  });

  const displayName = interaction.member?.displayName || interaction.user.username;
  const mentionLine = [
    interaction.user.toString(),
    ...ticketRoute.roleIds.map((roleId) => `<@&${roleId}>`),
  ].join(" ");
  const panel = createTicketOpenPanel(interaction.user, displayName, type.label, answerLines, mentionLine);

  await channel.send({
    components: [panel],
    flags: MessageFlags.IsComponentsV2,
  });

  await interaction.editReply(`Utworzono ticket: ${channel}`);
}

function createTicketOpenPanel(user, displayName, typeLabel, answerLines, mentionLine) {
  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket_close")
      .setEmoji(ce("nie"))
      .setLabel("Zamknij Ticketa")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("ticket_claim")
      .setEmoji(ce("kudka"))
      .setLabel("Przejmij Ticketa")
      .setStyle(ButtonStyle.Secondary),
  );

  const info = new SectionBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          "``` 🎟️ Crystal Shop × TICKETY```",
          "",
          `${et("dzwonek")} ・ ${mentionLine}`,
          "",
          `${et("kasa")} **INFORMACJE O UŻYTKOWNIKU:**`,
          `**Ping:** ${user}`,
          `**Nick:** \`${displayName}\``,
          `**ID:** \`${user.id}\``,
          `${et("osoba")} **Wybrana kategoria:** \`${typeLabel}\``,
          ...answerLines,
        ].join("\n"),
      ),
    )
    .setThumbnailAccessory(
      new ThumbnailBuilder().setURL(user.displayAvatarURL({ size: 256 })),
    );

  return new ContainerBuilder()
    .setAccentColor(config.panelColor)
    .addSectionComponents(info)
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addActionRowComponents(buttons)
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`${et("logo2")} © 2026 Crystal Shop × Ticket`),
    );
}

function getTicketAnswerIcon(id) {
  const icons = {
    product: et("gift"),
    amount: et("folder"),
    payment: et("portfel"),
    members: et("osoby"),
    server: et("dc"),
    item: et("gift"),
    price: et("kasa"),
    person: et("osoba"),
    problem: et("kredka1"),
    closedAt: et("data"),
    seller: et("osoba"),
    situation: et("kredka1"),
    reportedUser: et("lupa"),
  };

  return icons[id] || et("pin");
}

function getTicketAnswerLabel(id, fallback) {
  const labels = {
    product: "Zakup",
    amount: "Ilość",
    payment: "Metoda płatności",
    members: "Liczba osób",
    server: "Serwer",
    item: "Przedmiot",
    price: "Kwota",
    person: "Osoba",
    problem: "Problem",
    closedAt: "Data zamknięcia",
    seller: "Sprzedawca",
    situation: "Sytuacja",
    reportedUser: "Zgłaszany użytkownik",
  };

  return labels[id] || fallback;
}

async function closeTicket(interaction) {
  const ownerId = getTicketOwnerId(interaction.channel.topic);
  const supportRoleIds = getTicketRoute(interaction.guild, getTicketTypeKey(interaction.channel)).roleIds;
  const supportRole = supportRoleIds[0] ? interaction.guild.roles.cache.get(supportRoleIds[0]) : null;
  const canClose =
    interaction.user.id === ownerId ||
    interaction.member.permissions.has(PermissionFlagsBits.ManageChannels) ||
    supportRoleIds.some((roleId) => interaction.member.roles.cache.has(roleId));

  if (!ownerId) {
    await interaction.reply({ content: "Ta komenda dziala tylko na kanale ticketa.", ephemeral: true });
    return;
  }

  if (!canClose) {
    await interaction.reply({ content: "Nie masz uprawnien do zamkniecia tego ticketa.", ephemeral: true });
    return;
  }

  const transcript = await createTicketTranscript(interaction.channel);
  await sendLog(interaction, "zamknal", transcript ? [transcript] : []);

  await interaction.reply({
    content: `Ticket zamkniety przez ${interaction.user}.`,
  });

  setTimeout(() => {
    interaction.channel.delete("Zamknieto ticket").catch(() => null);
  }, 5000);
}

async function claimTicket(interaction) {
  if (!getTicketOwnerId(interaction.channel.topic)) {
    await interaction.reply({ content: "Ta komenda dziala tylko na kanale ticketa.", ephemeral: true });
    return;
  }

  const supportRoleIds = getTicketRoute(interaction.guild, getTicketTypeKey(interaction.channel)).roleIds;
  const canClaim =
    interaction.member.permissions.has(PermissionFlagsBits.ManageChannels) ||
    supportRoleIds.some((roleId) => interaction.member.roles.cache.has(roleId));

  if (!canClaim) {
    await interaction.reply({ content: "Tylko administracja moze przejac ticket.", ephemeral: true });
    return;
  }

  await saveTicketClaimer(interaction.channel, interaction.user.id);

  if (interaction.isButton()) {
    await interaction.reply({ content: `Ticket przejety przez ${interaction.user}.` });
  } else {
    await interaction.reply({ content: `Ticket przejety przez ${interaction.user}.` });
  }

  await sendLog(interaction, "przejal");
}

async function deleteTicket(interaction) {
  if (!interaction.member.roles.cache.has(config.supportRoleId)) {
    await interaction.reply({ content: "Tylko administracja moze usunac ticket.", ephemeral: true });
    return;
  }

  await interaction.reply("Ticket zostanie usuniety za 5 sekund.");
  await sendLog(interaction, "usunal");

  setTimeout(() => {
    interaction.channel.delete("Usunieto ticket").catch(() => null);
  }, 5000);
}

async function sendLog(interaction, action, files = []) {
  if (!config.logChannelId || config.logChannelId === "ID_KANALU_LOGOW") return;

  const logChannel = interaction.guild.channels.cache.get(config.logChannelId);
  if (!logChannel) return;

  await logChannel.send({
    embeds: [
      new EmbedBuilder()
        .setColor(config.panelColor)
        .setDescription(`${interaction.user} ${action} ticket ${interaction.channel.name}.`)
        .setTimestamp(),
    ],
    files,
  }).catch(() => null);
}

async function findTicketControlMessage(channel) {
  const messages = await channel.messages.fetch({ limit: 50 }).catch(() => null);
  if (!messages) return null;

  return messages.find((message) =>
    message.author.id === client.user.id &&
    message.components.some((row) => row.components.some((component) => component.customId === "ticket_claim")),
  ) || null;
}

async function createTicketTranscript(channel) {
  const messages = [];
  let before;

  while (messages.length < 500) {
    const fetched = await channel.messages.fetch({ limit: 100, before }).catch(() => null);
    if (!fetched || fetched.size === 0) break;

    messages.push(...fetched.values());
    before = fetched.last().id;
  }

  const lines = [
    `Transkrypt ticketa: #${channel.name}`,
    `Kanal ID: ${channel.id}`,
    `Wygenerowano: ${new Date().toLocaleString("pl-PL", { timeZone: "Europe/Warsaw" })}`,
    "",
  ];

  for (const message of messages.reverse()) {
    const time = message.createdAt.toLocaleString("pl-PL", { timeZone: "Europe/Warsaw" });
    const author = `${message.author.tag} (${message.author.id})`;
    const content = message.content || "[brak tresci tekstowej]";

    lines.push(`[${time}] ${author}: ${content}`);

    for (const attachment of message.attachments.values()) {
      lines.push(`  Zalacznik: ${attachment.name || "plik"} - ${attachment.url}`);
    }

    for (const embed of message.embeds) {
      if (embed.title) lines.push(`  Embed title: ${embed.title}`);
      if (embed.description) lines.push(`  Embed opis: ${embed.description.replace(/\n/g, " ")}`);
    }

    lines.push("");
  }

  const safeName = channel.name.replace(/[^a-z0-9-]/gi, "-").slice(0, 80) || "ticket";

  return {
    attachment: Buffer.from(lines.join("\n"), "utf8"),
    name: `transcript-${safeName}.txt`,
  };
}

function getTicketRoute(guild, typeKey) {
  const configuredCategoryId = config.ticketCategoryIds?.[typeKey] || config.ticketCategoryId;
  const configuredCategory = configuredCategoryId ? guild.channels.cache.get(configuredCategoryId) : null;
  const configuredRoleId = config.ticketRoleIds?.[typeKey] || config.supportRoleId;
  const fallbackCategory = config.ticketCategoryId ? guild.channels.cache.get(config.ticketCategoryId) : null;

  return {
    categoryId:
      configuredCategory?.type === ChannelType.GuildCategory
        ? configuredCategoryId
        : fallbackCategory?.type === ChannelType.GuildCategory
          ? config.ticketCategoryId
          : null,
    roleIds: [configuredRoleId].filter((roleId) => roleId && guild.roles.cache.has(roleId)),
  };
}

function getTicketTypeKey(channel) {
  const topicType = channel.topic?.match(/ticket-type:([a-z0-9_-]+)/i)?.[1];
  if (topicType && ticketTypes[topicType]) return topicType;

  return Object.entries(ticketTypes).find(([, type]) => channel.name?.startsWith(`${type.channelPrefix}-`))?.[0] || null;
}

function getTicketOwnerId(topic) {
  return topic?.match(/ticket-owner:(\d{17,20})/)?.[1] || null;
}

function getTicketClaimerId(topic) {
  return topic?.match(/ticket-claimed:(\d{17,20})/)?.[1] || null;
}

async function saveTicketClaimer(channel, userId) {
  if (!channel?.setTopic) return;

  const currentTopic = channel.topic || "";
  const nextTopic = currentTopic.includes("ticket-claimed:")
    ? currentTopic.replace(/ticket-claimed:\d{17,20}/, `ticket-claimed:${userId}`)
    : `${currentTopic};ticket-claimed:${userId}`;

  await channel.setTopic(nextTopic.slice(0, 1024), "Przejeto ticket").catch(() => null);
}

  if (!process.env.DISCORD_TOKEN) {
  throw new Error("Brakuje DISCORD_TOKEN w pliku .env.");
}

client.login(process.env.DISCORD_TOKEN);
