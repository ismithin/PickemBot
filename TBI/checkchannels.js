const { SlashCommandBuilder } = require('discord.js');
const { createUserChannels } = require('../index'); // Adjust the path as necessary

module.exports = {
    data: new SlashCommandBuilder()
        .setName('checkchannels')
        .setDescription('Creates private channels for each member, if they do not already exist.')
        .setDefaultMemberPermissions(0), // Only admins can use this command
    async execute(interaction) {
        const { client } = interaction;

        // Check if the user executing the command is an admin
        if (!interaction.member.permissions.has('ADMINISTRATOR')) {
            return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
        }

        try {
            // Call the createUserChannels function
            await createUserChannels(interaction.guild, client);

            return interaction.reply({ content: 'Checked and created channels for members.', ephemeral: true });
        } catch (error) {
            console.error('Error executing checkchannels command:', error);
            return interaction.reply({ content: 'There was an error executing the command. Please try again later.', ephemeral: true });
        }
    },
};
