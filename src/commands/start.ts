import { Guild, GuildMember, TextChannel, type CommandInteraction } from "discord.js";
import { activeCategories } from "..";
import { getAllUsersInCategory } from "../utils";

export async function startCommand(interaction: CommandInteraction) {
    const { options, member, guild, channel: interactionChannel } = interaction;

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

    if (activeCategories.has(category.id)) {
        return interaction.reply({ content: 'このカテゴリー内では既に/startが実行されています。', ephemeral: true });
    }
    
    const minutes = Number(options.get('minutes')?.value);
    if (isNaN(minutes) || minutes < 1) {
        return interaction.reply({ content: 'minutesは1以上の整数で指定してください。', ephemeral: true });
    }

    const groupSize = Number(options.get('usersize')?.value) || null;
    if (groupSize && (isNaN(groupSize) || groupSize < 2)) {
        return interaction.reply({ content: 'usersizeは2以上の整数で指定してください。', ephemeral: true });
    }

    const role = await guild.roles.create({
        name: 'ShuffleTalkUser-' + category.id,
        color: 'Blue',
        permissions: []
    });

    const users = getAllUsersInCategory(guild, category.id);
    users.forEach(user => user.roles.add(role));

    interaction.reply({ content: `${role.toString()} <t:${Math.floor(Date.now() / 1000) + 10}:R>に**${category.name}**でシャッフルを**${minutes}分**おきに開始します。` });
    await Bun.sleep(10000);
    
    let noticeTimer: Timer | null = null;
    const shuffleTimer = setInterval(() => {
        if (!shuffleUsers(guild, category.id, groupSize)) {
            interactionChannel.send({ content: '参加者がいないか、VCが存在しません。セッションを停止します。' });
            clearInterval(shuffleTimer);
            noticeTimer && clearTimeout(noticeTimer);
            role.delete().catch(() => {
                interactionChannel?.send({ content: 'ロールの削除に失敗しました。手動で削除してください。' });
            });
            activeCategories.delete(category.id);
            return;
        }
        noticeTimer = setTimeout(() => {
            interactionChannel.send(`${role.toString()} **<t:${Math.floor(Date.now() / 1000) + 30}:R>**にシャッフルを開始します。`);
        }, minutes * 60000 - 30000);
    }, minutes * 60000);

    activeCategories.set(category.id, { shuffleTimer, noticeTimer, role, interactionChannel });
}

function shuffleUsers(guild: Guild, categoryId: string, groupSize: number | null) {
    const users = getAllUsersInCategory(guild, categoryId);
    const channels = guild.channels.cache
        .filter((channel) => channel.parentId === categoryId)
        .filter((channel) => channel.isVoiceBased());

    if (users.size === 0 || channels.size === 0) return false;

    const shuffledUsers = [...users.values()].sort(() => Math.random() - 0.5);
    const calculatedGroupSize = Math.trunc(shuffledUsers.length / channels.size);
    groupSize = groupSize || calculatedGroupSize < 2 ? 2 : calculatedGroupSize;

    for (const [_, channel] of channels) {
        for (let i = 0; i < groupSize; i++) {
            const user = shuffledUsers.pop();
            if (!user) break;
            user.voice.setChannel(channel);
        }
        if (shuffledUsers.length === 1) {
            shuffledUsers[0].voice.setChannel(channel);
            break;
        }
        if (shuffledUsers.length === 0) break;
    }

    return true;
}
