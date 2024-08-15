require('dotenv').config();

const { SlashCommandBuilder } = require('discord.js');
const { createButtonsFromMatchups } = require('../../index.js'); // Adjust the path if necessary

module.exports = {
    data: new SlashCommandBuilder()
        .setName('createpicks')
        .setDescription('Manually create pickem buttons for the week.'),
    async execute(interaction) {
        try {
            // Send an initial response to acknowledge the interaction
            await interaction.reply({ content: 'Creating picks...', ephemeral: true });

            // Call the existing function to create the poll
            await createButtonsFromMatchups(interaction.client); // Replace with actual IDs

            // After completing the task, update the initial response
            await interaction.editReply({ content: 'Pickem buttons created successfully!' });
        } catch (error) {
            console.error('Error creating pickem buttons:', error);
            await interaction.editReply({ content: 'There was an error creating the pickem buttons. Please try again later.' });
        }
    },
};
