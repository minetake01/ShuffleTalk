import type { Guild } from "discord.js";

export function getAllUsersInCategory(guild: Guild, categoryId: string) {
    return guild.channels.cache
        .filter(channel => channel.parentId === categoryId)
        .filter(channel => channel.isVoiceBased())
        .flatMap(channel => channel.members);
}