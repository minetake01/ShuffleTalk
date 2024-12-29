import { Client, GatewayIntentBits, Role, TextChannel, ApplicationCommandOptionType } from 'discord.js';
import { startCommand } from './commands/start';
import { stopCommand } from './commands/stop';

const client = new Client({ intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers
] });

// 状態管理用
export const activeCategories = new Map<string, { shuffleTimer: Timer, noticeTimer: Timer | null, role: Role, interactionChannel: TextChannel}>();

client.once('ready', async () => {
    console.log(`Logged in as ${client.user?.tag}`);

    // コマンドの登録
    await client.application?.commands.set([
        {
            name: 'start',
            description: 'シャッフルを開始します。',
            options: [
                {
                    name: 'minutes',
                    description: 'シャッフルの間隔(分)',
                    type: ApplicationCommandOptionType.Integer,
                    required: true
                },
                {
                    name: 'usersize',
                    description: 'グループの人数',
                    type: ApplicationCommandOptionType.Integer,
                    required: false
                }
            ]
        },
        {
            name: 'stop',
            description: 'シャッフルを停止します。'
        }
    ]);
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    switch (interaction.commandName) {
        case 'start': startCommand(interaction); break;
        case 'stop': stopCommand(interaction); break;
    }
});

// セッション中にVCに参加した場合にロールを付与、退出した場合に剥奪する
client.on('voiceStateUpdate', (oldState, newState) => {
    const { member, channel: newChannel } = newState;
    const { channel: oldChannel } = oldState;

    // ミュートなど同一チャンネル内での変更の場合は無視
    if (oldChannel?.id === newChannel?.id) return;

    // カテゴリー内でのチャンネル移動の場合は無視
    if (oldChannel?.parentId && activeCategories.has(oldChannel.parentId) && newChannel?.parentId && activeCategories.has(newChannel.parentId)) return;

    const channelId = newChannel?.id || oldChannel?.id;

    const categoryId = newState.guild.channels.cache.get(channelId!)?.parentId;
    if (!categoryId || !activeCategories.has(categoryId)) return;

    const { role } = activeCategories.get(categoryId)!;

    if (newChannel) {
        member!.roles.add(role).catch(console.error);
    } else if (oldChannel) {
        member!.roles.remove(role).catch(console.error);
    }
});

client.login(process.env.DISCORD_TOKEN);
