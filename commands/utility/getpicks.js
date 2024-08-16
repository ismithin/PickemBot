// getpicks.js
const picksData = require('../../picksData');
const { exportPicksToCSV } = require('../../index');
const { Client, Events, SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('getpicks')
        .setDescription('Export the picks data to a CSV file.'),
    async execute(interaction) {
        try {
            // Call the function and pass client as an argument
            await exportPicksToCSV(interaction.client);

            await interaction.reply({ content: 'Picks have been exported to CSV and sent to the designated user.', ephemeral: true });
        } catch (error) {
            console.error('Error exporting picks to CSV:', error);
            await interaction.reply({ content: 'There was an error exporting the picks to CSV. Please try again later.', ephemeral: true });
        }
    },
};