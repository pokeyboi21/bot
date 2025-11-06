require("dotenv").config();
const fs = require("fs");
const { Client, GatewayIntentBits, AttachmentBuilder } = require("discord.js");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

const PREFIX = process.env.PREFIX || "!";

// ---------- FILE PATHS ----------
const storageFile = "./storage.json";
const finesFile = "./fines.json";

// ---------- LOAD EXISTING DATA ----------
let storage = {};
let fines = {};

if (fs.existsSync(storageFile)) {
    storage = JSON.parse(fs.readFileSync(storageFile, "utf8"));
}
if (fs.existsSync(finesFile)) {
    fines = JSON.parse(fs.readFileSync(finesFile, "utf8"));
}

// ---------- SAVE FUNCTIONS ----------
function saveStorage() {
    fs.writeFileSync(storageFile, JSON.stringify(storage, null, 2));
}

function saveFines() {
    fs.writeFileSync(finesFile, JSON.stringify(fines, null, 2));
}

// ---------- DISCORD READY ----------
client.on("ready", () => {
    console.log(`${client.user.tag} is online and data loaded!`);
});

// ---------- MESSAGE HANDLER ----------
client.on("messageCreate", async (message) => {
    if (!message.content.startsWith(PREFIX) || message.author.bot) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    const officeRole = "[🔒] Office Access";
    const clubhouseRole = "[🗝️] Clubhouse Access";

    // ---------- HELP ----------
    if (command === "help") {
        const helpMessage = `
**Available Commands:**

🗝️ **Clubhouse Access**
• \`!storage add <item> <amount>\` — Add items to storage  
• \`!storage remove <item> <amount>\` — Remove items from storage  
• \`!storage show\` — Show everything in storage  

🔒 **Office Access**
• \`!fine add <member> <amount>\` — Add fine  
• \`!fine remove <member> <amount>\` — Remove fine  
• \`!fine show\` — Show all fines  

📢 **Everyone**
• \`!announce <message>\` — Send announcement to 『📂』𝐂𝐥𝐮𝐛-𝐀𝐧𝐧𝐨𝐮𝐧𝐜𝐞𝐦𝐞𝐧𝐭𝐬
• \`!help\` — Show this list
        `;
        return message.channel.send(helpMessage);
    }

    // ---------- STORAGE ----------
    if (command === "storage") {
        if (
            !message.member.roles.cache.some(
                (role) => role.name === clubhouseRole,
            )
        ) {
            return message.reply(
                `You need the **${clubhouseRole}** role to use storage commands.`,
            );
        }

        const action = args[0];

        if (action === "add" || action === "remove") {
            const item = args[1];
            const amount = parseInt(args[2]) || 1;

            if (!item) return message.reply("Type an item to add/remove.");

            if (action === "add") {
                storage[item] = (storage[item] || 0) + amount;
                saveStorage();
                message.channel.send(
                    `Added **${amount} ${item}** to storage. Total: **${storage[item]}**`,
                );
            } else if (action === "remove") {
                if (!storage[item])
                    return message.reply(`${item} is not in storage.`);
                storage[item] -= amount;
                if (storage[item] <= 0) delete storage[item];
                saveStorage();
                message.channel.send(
                    `Removed **${amount} ${item}** from storage. Total: **${storage[item] || 0}**`,
                );
            }
        } else if (action === "show") {
            if (Object.keys(storage).length === 0)
                return message.channel.send("Storage is empty.");

            let list = "**📦 Storage:**\n";
            for (const key in storage) list += `• ${key}: ${storage[key]}\n`;
            message.channel.send(list);

            // Backup storage to channel
            const fileData = JSON.stringify(storage, null, 2);
            fs.writeFileSync(storageFile, fileData);
            const attachment = new AttachmentBuilder(storageFile);
            const backupChannel = message.guild.channels.cache.find(
                (ch) => ch.name === "『📂』𝐁𝐨𝐭-𝐈𝐧𝐯𝐞𝐧𝐭𝐨𝐫𝐲-𝐅𝐢𝐥𝐞𝐬",
            );
            if (backupChannel) {
                backupChannel.send({
                    content: "📦 **Updated Storage File:**",
                    files: [attachment],
                });
            }
        } else {
            message.reply("Use `add`, `remove`, or `show`.");
        }
    }

    // ---------- FINES ----------
    else if (command === "fine") {
        if (
            !message.member.roles.cache.some((role) => role.name === officeRole)
        ) {
            return message.reply(
                `You need the **${officeRole}** role to manage fines.`,
            );
        }

        const action = args[0];
        const member = args[1];
        const amount = parseInt(args[2]);

        const finesChannel = message.guild.channels.cache.find(
            (ch) => ch.name === "『💳』𝐂𝐥𝐮𝐛-𝐅𝐢𝐧𝐞𝐬",
        );

        if (action === "add") {
            if (!member || isNaN(amount))
                return message.reply("Usage: !fine add <member> <amount>");
            fines[member] = (fines[member] || 0) + amount;
            saveFines();
            message.channel.send(
                `Added $${amount} fine to **${member}**. Total: $${fines[member]}`,
            );
            if (finesChannel)
                finesChannel.send(
                    `💳 Added $${amount} fine to **${member}**. Total: $${fines[member]}`,
                );
        } else if (action === "remove") {
            if (!member || isNaN(amount))
                return message.reply("Usage: !fine remove <member> <amount>");
            if (!fines[member]) return message.reply(`${member} has no fines.`);
            fines[member] -= amount;
            if (fines[member] <= 0) delete fines[member];
            saveFines();
            message.channel.send(
                `Removed $${amount} fine from **${member}**. Total: $${fines[member] || 0}`,
            );
            if (finesChannel)
                finesChannel.send(
                    `💳 Removed $${amount} fine from **${member}**. Total: $${fines[member] || 0}`,
                );
        } else if (action === "show") {
            if (Object.keys(fines).length === 0)
                return message.channel.send("No fines.");

            let list = "**💸 Fines:**\n";
            for (const key in fines) list += `• ${key}: $${fines[key]}\n`;
            message.channel.send(list);
        } else {
            message.reply("Use `add`, `remove`, or `show`.");
        }
    }

    // ---------- ANNOUNCE ----------
    else if (command === "announce") {
        const announcement = args.join(" ");
        if (!announcement)
            return message.reply("Please type an announcement message.");

        const channel = message.guild.channels.cache.find(
            (ch) => ch.name === "『📂』𝐂𝐥𝐮𝐛-𝐀𝐧𝐧𝐨𝐮𝐧𝐜𝐞𝐦𝐞𝐧𝐭𝐬",
        );
        if (!channel) return message.reply("Announcement channel not found.");

        channel.send(`📢 **Announcement:** ${announcement}`);
        message.reply("Announcement sent!");
    }

    // ---------- UNKNOWN ----------
    else {
        message.reply("Unknown command. Type `!help` for a list of commands.");
    }
});

client.login(process.env.DISCORD_TOKEN);

const express = require("express");
const app = express();

// Test route
app.get("/", (req, res) => res.send("Server is online!"));

// Dynamic port for Replit
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Crash protection
process.on("uncaughtException", (err) =>
    console.error("Uncaught Exception:", err),
);
process.on("unhandledRejection", (err) =>
    console.error("Unhandled Rejection:", err),
);
