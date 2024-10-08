require('dotenv').config();

const fs = require('node:fs');
const path = require('node:path');
const picksData = require('./picksData');
const emojis = require('./emojis.json');
const userList = require('./users.json');
const { Client, Collection, Events, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits, PermissionOverWrites } = require('discord.js');
//const { CronJob } = require('cron');

//#region Client and Config Setup
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Variables
const token = process.env.BOT_TOKEN;
const guildId = process.env.GUILD_ID;
const matchupChannelId = process.env.MATCHUP_CHANNEL_ID; // Channel where the manager posts the matchup matchup
const selectionChannelId = process.env.SELECTION_CHANNEL_ID; // Channel where the poll will be posted
const commandChannelId = process.env.COMMAND_CHANNEL_ID;
const userId = process.env.USER_ID;
const ericChannelID = process.env.ERIC_PICK_CHANNEL;

const restrictedCommands = ['createpicks', 'getpicks'];

client.commands = new Collection();

const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

module.exports = {
    createButtonsFromMatchups,
    exportPicksToCSV,
    disableButtons,
};

for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        // Set a new item in the Collection with the key as the command name and the value as the exported module
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
        } else {
            console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
        }
    }
}
//#endregion

//#region Client Ready Event
client.once('ready', async () => {
    console.log('NFL Pick\'Em Bot is online!');
    //scheduleLockTime();
});
//#endregion

//#region Interaction Handling
client.on(Events.InteractionCreate, async interaction => {
    if (interaction.isButton()) {
        await handleButtonInteraction(interaction);
    } else if (interaction.isChatInputCommand()) {
        await handleCommandInteraction(interaction);
    }
});

// Button Interaction Handling
// Button Interaction Handling
async function handleButtonInteraction(interaction) {
    try {
        // Defer the update to acknowledge the interaction
        await interaction.deferUpdate();

        const [team] = interaction.customId.split('-win');
        const userId = interaction.user.id;

        // Use the original message content as the key
        const matchup = interaction.message.content.split('\n')[0];

        if (!picksData[userId]) {
            picksData[userId] = {};
        }

        // Update the pick for the current matchup
        picksData[userId][matchup] = team;

        // Fetch the original message to update
        const message = await interaction.message.fetch();

        // Modify the button styles based on the user's pick
        const components = message.components.map(row => {
            return new ActionRowBuilder().addComponents(
                row.components.map(button => {
                    if (button.customId === interaction.customId) {
                        return new ButtonBuilder()
                            .setCustomId(button.customId)
                            .setLabel(button.label)
                            .setStyle(ButtonStyle.Primary) // Selected button
                            .setEmoji(button.emoji)
                            .setDisabled(false);
                    } else {
                        return new ButtonBuilder()
                            .setCustomId(button.customId)
                            .setLabel(button.label)
                            .setStyle(ButtonStyle.Secondary) // Other button
                            .setEmoji(button.emoji)
                            .setDisabled(false);
                    }
                })
            );
        });

        // Update the message components
        await message.edit({ components: components });

    } catch (error) {
        console.error('Error handling button interaction:', error);
        if (!interaction.replied) {
            // Send an ephemeral error message
            await interaction.followUp({ content: 'There was an error handling your selection. Please try again later.', ephemeral: true });
        }
    }
}


//Command Interaction Handling
async function handleCommandInteraction(interaction) {

    const command = client.commands.get(interaction.commandName);

    if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
    }

    if (restrictedCommands.includes(interaction.commandName) && interaction.channel.id !== commandChannelId) {
        await interaction.reply({ content: 'This command cannot be used in this channel.', ephemeral: true });
        return;
    }

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
        } else {
            await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
        }
    }
}
//#endregion

//#region Functions
async function createButtonsFromMatchups() {
    let matchupOrder = [];
    try {
        const userChannels = JSON.parse(await fs.promises.readFile('./pickchannels.json', 'utf8'));
        const matchupChannel = await client.channels.fetch(matchupChannelId);
        const matchupMessages = await matchupChannel.messages.fetch({ limit: 1 });
        const matchupMessage = matchupMessages.first();

        if (matchupMessage) {
            // Split the message content into individual matchups
            matchupOrder = matchupMessage.content.split('\n').map(line => line.trim());
            //console.log('Matchups Order:', matchupOrder);

            // Save matchup order to picksData for consistency
            picksData.matchupOrder = matchupOrder;

            // Pre-fill picksData for each user and matchup
            const userList = require('./users.json');
            for (const userId of Object.keys(userList)) {
                if (!picksData[userId]) {
                    picksData[userId] = {};
                }
                for (const matchup of matchupOrder) {
                    // Initialize with a default value like 'No pick'
                    if (!picksData[userId][matchup]) {
                        picksData[userId][matchup] = 'No pick';
                    }
                }
            }
            for (const matchup of matchupOrder) {
                const [home, away] = matchup.split(' @ ');

                //for (const [channelName, channelId] of Object.entries(userChannels)) {
                const selectionChannel = await client.channels.fetch(selectionChannelId);

                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`${home}-win`)
                            .setLabel(home)
                            .setStyle(ButtonStyle.Primary)
                            .setEmoji({ id: emojis[home] }),
                        new ButtonBuilder()
                            .setCustomId(`${away}-win`)
                            .setLabel(away)
                            .setStyle(ButtonStyle.Primary)
                            .setEmoji({ id: emojis[away] }),
                    );

                await selectionChannel.send({ content: `${home} @ ${away}`, components: [row] });
                //}
            }
        } else {
            console.error('No matchup message found in the channel.');
        }
    } catch (error) {
        console.error('Failed to create buttons from matchups:', error);
    }
}

async function exportPicksToCSV(client) {
    if (Object.keys(picksData).length === 0) {
        console.error('No picks available to export.');
        //Can I edit the reply to this as well, currently only way to see no picks available is the console log.
        return; // Exit the function early if there are no picks
    }

    const rows = [];

    // Load the user list from users.json
    const userList = require('./users.json');

    // Get the user IDs in the desired order
    const orderedUserIds = Object.keys(userList);

    // Get the matchup order from picksData
    const matchupOrder = picksData.matchupOrder;

    if (!matchupOrder || matchupOrder.length === 0) {
        console.error('No matchups available for exporting.');
        return;
    }

    // Add the header row (first cell empty, followed by user names from userList)
    const header = ['Matchup', ...orderedUserIds.map(userId => userList[userId] || userId)];
    rows.push(header.join(','));

    // Add each matchup as a row
    matchupOrder.forEach(matchup => {
        const row = [matchup];

        // Add each user's pick for this matchup, following the order in orderedUserIds
        for (const userId of orderedUserIds) {
            row.push(picksData[userId]?.[matchup] || 'No pick'); // Add each user's pick for this matchup
        }

        rows.push(row.join(','));
    });

    // Create the CSV string
    const csvContent = rows.join('\n');

    // Define the path to save the CSV file
    const filePath = path.join(__dirname, 'nfl_picks.csv');

    // Write the CSV to a file
    fs.writeFileSync(filePath, csvContent, 'utf8');
    console.log('Picks exported to CSV:', filePath);

    // Send the CSV to a specific channel
    const csvChannelId = process.env.CSV_CHANNEL_ID;
    const channel = await client.channels.fetch(csvChannelId);

    if (channel && channel.isTextBased()) {
        await channel.send({
            content: 'Here is the exported CSV file for this week.',
            files: [filePath]
        });
    } else {
        console.error('Failed to fetch the channel or the channel is not text-based. Could not send CSV file.');
    }

    console.log('picksData after /getpicks:', picksData);

    // Clear picksData after exporting
    for (const key in picksData) {
        if (Object.prototype.hasOwnProperty.call(picksData, key)) {
            delete picksData[key];
        }
    }

    console.log('picksData after /getpicks:', picksData);

}

async function disableButtons(client) {
    try {
        const userChannels = JSON.parse(await fs.promises.readFile('./pickchannels.json', 'utf8'));

        //for (const [channelName, channelId] of Object.entries(userChannels)) {
        //const channel = await client.channels.fetch(channelId);
        const channel = await client.channels.fetch(selectionChannelId);


        if (channel && channel.isTextBased()) {
            const messages = await channel.messages.fetch({ limit: 100 });

            messages.forEach(async (message) => {
                if (message.components.length > 0) {
                    const disabledRow = message.components.map(row =>
                        new ActionRowBuilder().addComponents(
                            row.components.map(button =>
                                ButtonBuilder.from(button).setDisabled(true)
                            )
                        )
                    );

                    await message.edit({ components: disabledRow });
                }
            });
        }
        //}
    } catch (error) {
        console.error('Failed to disable buttons in channels:', error);
    }
}
//#endregion

//Yet to be finished or implemented
/*
//Command for channel check and creation.
async function createUserChannels(guild, client) {
    // Fetch or create the category
    let category = guild.channels.cache.find(c => c.name === 'test-personal-picks' && c.type === ChannelType.GuildCategory);

    if (!category) {
        category = await guild.channels.create({
            name: 'test-personal-picks',
            type: ChannelType.GuildCategory,
        });
        console.log('Created category "test-personal-picks"');
    }
    else {
        console.log('test-personal-picks category already exists.');
    }

    const existingChannels = guild.channels.cache.filter(channel => channel.parentId === category.id);

    for (const [userId, userName] of Object.entries(userList)) {
        // Modify this line to append "-picks" to the username
        const channelName = `${userName.toLowerCase().replace(/ /g, '-')}-picks`;
        const existingChannel = existingChannels.find(channel => channel.name === channelName);

        if (!existingChannel) {
            await guild.channels.create({
                name: channelName,
                type: ChannelType.GuildText,
                parent: category.id,
                permissionOverwrites: [
                    {
                        id: userId,
                        allow: ['VIEW_CHANNEL', 'SEND_MESSAGES'],
                    },
                    {
                        id: guild.id, // @everyone role
                        deny: ['VIEW_CHANNEL'],
                    },
                    {
                        id: process.env.BOT_ID,
                        allow: ['VIEW_CHANNEL', 'SEND_MESSAGES'],
                    },
                ],
            });
            console.log(`Created private channel for ${userName}`);
        } else {
            console.log(`Channel already exists for ${userName}`);
        }
    }
}

 Schedule a job to lock the polls and export picks at 11:59 AM on Sundays

function scheduleLockTime() {
    const job = new CronJob('59 11 * * 0', async () => {
        const selectionChannel = await client.channels.fetch(selectionChannelId);
        const messages = await selectionChannel.messages.fetch({ limit: 100 });

        messages.forEach(async (message) => {
            if (message.components.length > 0) {
                const disabledRow = message.components[0].components.map(button =>
                    ButtonBuilder.from(button).setDisabled(true)
                );

                await message.edit({ components: [new ActionRowBuilder().addComponents(disabledRow)] });
            }
        });

        console.log('Polls locked!');

        // Export picks to CSV after locking
        exportPicksToCSV();
    });

    job.start();
}

async function getCategoryByName(guild, categoryName) {
    try {
        // Fetch all categories in the guild
        const categories = await guild.channels.fetch();
        console.log("Categories:", categories);

        // Find the category with the given name
        const targetCategory = categories.find(category => category.type === 'GUILD_CATEGORY' && category.name === categoryName);

        if (!targetCategory) {
            console.error(`Category with name "${categoryName}" not found.`);
            return null;
        }

        return targetCategory;
    } catch (error) {
        console.error('Failed to fetch categories:', error);
        return null;
    }
}
*/

client.login(token);