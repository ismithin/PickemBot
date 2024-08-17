const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('whatchannels')
        .setDescription('Lists all channel IDs in the specified category.'),
    async execute(interaction) {
        try {
            // Fetch guild and category from environment variables
            const guildId = process.env.GUILD_ID;
            const categoryId = process.env.CATEGORY_ID;

            // Fetch the guild and category
            const guild = await interaction.client.guilds.fetch(guildId);
            const category = await guild.channels.fetch(categoryId);

            if (category.type !== 'GUILD_CATEGORY') {
                await interaction.reply('The specified channel is not a category.');
                return;
            }

            // Collect all channel IDs in the category
            const channelIds = category.children.keyArray();

            // Send the list of channel IDs to the user
            await interaction.reply(`Channels in category: ${channelIds.join(', ')}`);
        } catch (error) {
            console.error('Error fetching channels:', error);
            await interaction.reply('There was an error fetching the channels. Please try again later.');
        }
    },
};
