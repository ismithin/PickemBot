const { exportPicksToCSV, disableButtons } = require('../../index');
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('getpicks')
        .setDescription('Export the picks data to a CSV file and disable all buttons.'),
    async execute(interaction) {
        try {
            // Send an initial response to acknowledge the interaction
            await interaction.deferReply({ ephemeral: true });

            // Disable all buttons after exporting the picks
            await disableButtons(interaction.client);

            // Export the picks to a CSV file
            await exportPicksToCSV(interaction.client);

            // Send a final confirmation message
            await interaction.editReply({ content: 'Picks have been exported to CSV, and all buttons have been disabled.', ephemeral: true });
        } catch (error) {
            console.error('Error exporting picks or disabling buttons:', error);
            await interaction.editReply({ content: 'There was an error exporting the picks to CSV or disabling the buttons. Please try again later.', ephemeral: true });
        }
    },
};
