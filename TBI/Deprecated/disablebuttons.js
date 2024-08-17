// disablebuttons.js
const { SlashCommandBuilder } = require('discord.js');
const { disableButtons } = require('../../index'); // Adjust the path to where your disableButtons function is located

module.exports = {
    data: new SlashCommandBuilder()
        .setName('disablebuttons')
        .setDescription('Disable buttons in all pick channels.'),
    async execute(interaction) {
        try {
            // Send an initial response to acknowledge the interaction
            await interaction.reply({ content: 'Disabling Buttons...', ephemeral: true });
            await disableButtons(interaction.client);

            await interaction.editReply({ content: 'All buttons in pick channels have been disabled.', ephemeral: true });
        } catch (error) {
            console.error('Error disabling buttons:', error);
            await interaction.reply({ content: 'There was an error disabling the buttons. Please try again later.', ephemeral: true });
        }
    },
};
