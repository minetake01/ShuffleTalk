import { GuildMember, TextChannel, type CommandInteraction } from "discord.js";
import { activeCategories } from "..";
import { getAllUsersInCategory } from "../utils";

export async function stopCommand(interaction: CommandInteraction) {
    const { member, guild, channel: interactionChannel } = interaction;

    // DMからのコマンドは無視
    if (!guild || !(member instanceof GuildMember)) return;
    if (!(interactionChannel instanceof TextChannel)) {
        return interaction.reply({ content: 'テキストチャンネルでコマンドを実行してください。', ephemeral: true });
    }
    
    const masterVC = member.voice.channel;

    if (!masterVC) {
        return interaction.reply({ content: 'VCに参加してからコマンドを実行してください。', ephemeral: true });
    }

    const category = masterVC.parent;
    if (!category) {
        return interaction.reply({ content: 'このVCはカテゴリー内にありません。', ephemeral: true });
    }

    if (!activeCategories.has(category.id)) {
        return interaction.reply({ content: 'このカテゴリー内でアクティブなセッションはありません。', ephemeral: true });
    }

    const { shuffleTimer, noticeTimer, role } = activeCategories.get(category.id)!;

    clearInterval(shuffleTimer);
    noticeTimer && clearTimeout(noticeTimer);

    await role.delete().catch(() => {
        interaction.reply({ content: 'ロールの削除に失敗しました。手動で削除してください。', ephemeral: true });
    });

    activeCategories.delete(category.id);

    const users = getAllUsersInCategory(guild, category.id);
    users.forEach(user => {
        user.voice.setChannel(masterVC).catch(console.error);
    });

    interaction.reply({ content: 'セッションを停止しました。' });
}