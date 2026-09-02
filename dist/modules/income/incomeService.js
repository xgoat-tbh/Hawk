import { getDb } from '../../core/database/pool.js';
import { getEconomyConfig } from '../../core/database/repositories/economyConfigRepo.js';
import { getBalance, ensureBalance, addCash, removeCash, transferCash } from '../economy/economyService.js';
export function checkCooldown(lastTime, cooldownSeconds) {
    if (!lastTime)
        return { onCooldown: false, remaining: 0 };
    const elapsed = (Date.now() - lastTime.getTime()) / 1000;
    if (elapsed < cooldownSeconds)
        return { onCooldown: true, remaining: Math.ceil(cooldownSeconds - elapsed) };
    return { onCooldown: false, remaining: 0 };
}
async function updateCooldown(guildId, userId, field) {
    const db = getDb();
    await db `
        UPDATE economy_balances 
        SET ${db(field)} = NOW() 
        WHERE guild_id = ${guildId} AND user_id = ${userId}
    `;
}
export async function executeWork(guildId, userId) {
    await ensureBalance(guildId, userId);
    const balance = await getBalance(guildId, userId);
    const config = await getEconomyConfig(guildId);
    const cooldown = checkCooldown(balance.workLast, config.workCooldown);
    if (cooldown.onCooldown) {
        return { success: false, earned: 0, message: '', cooldown: cooldown.remaining };
    }
    const earned = Math.floor(Math.random() * (250 - 50 + 1)) + 50;
    const messages = [
        "You worked as a waiter and earned",
        "You mowed lawns and earned",
        "You delivered pizzas and earned",
        "You walked dogs and earned",
        "You sold lemonade and earned",
        "You worked at a tech support desk and earned",
        "You helped people cross the street and earned",
        "You washed cars and earned",
        "You wrote some code and earned",
        "You babysat for a neighbor and earned",
        "You cleaned windows and earned",
        "You painted a house and earned",
        "You tutored some students and earned",
        "You drove a taxi and earned",
        "You did some freelance writing and earned"
    ];
    const message = messages[Math.floor(Math.random() * messages.length)];
    await addCash(guildId, userId, earned);
    await updateCooldown(guildId, userId, 'work_last');
    return { success: true, earned, message: `${message} ${earned}` };
}
export async function executeSlut(guildId, userId) {
    await ensureBalance(guildId, userId);
    const balance = await getBalance(guildId, userId);
    const config = await getEconomyConfig(guildId);
    const cooldown = checkCooldown(balance.slutLast, config.slutCooldown);
    if (cooldown.onCooldown) {
        return { success: false, amount: 0, message: '', cooldown: cooldown.remaining };
    }
    await updateCooldown(guildId, userId, 'slut_last');
    const isSuccess = Math.random() < 0.60;
    if (isSuccess) {
        const earned = Math.floor(Math.random() * (400 - 100 + 1)) + 100;
        const messages = [
            "You danced on a pole and earned",
            "You had a great night out and came back with",
            "Someone tipped you well, you earned",
            "You worked the corner and earned",
            "A sugar daddy gave you"
        ];
        const message = messages[Math.floor(Math.random() * messages.length)];
        await addCash(guildId, userId, earned);
        return { success: true, amount: earned, message: `${message} ${earned}` };
    }
    else {
        const lost = Math.floor(Math.random() * (200 - 50 + 1)) + 50;
        const actualLost = Math.min(lost, balance.cash);
        const messages = [
            "You got caught by the cops and had to pay a fine of",
            "You got mugged in an alley and lost",
            "Your pimp took a cut of",
            "You tripped and dropped",
            "Someone scammed you out of"
        ];
        const message = messages[Math.floor(Math.random() * messages.length)];
        if (actualLost > 0) {
            await removeCash(guildId, userId, actualLost);
        }
        return { success: false, amount: actualLost, message: `${message} ${actualLost}` };
    }
}
export async function executeCrime(guildId, userId) {
    await ensureBalance(guildId, userId);
    const balance = await getBalance(guildId, userId);
    const config = await getEconomyConfig(guildId);
    const cooldown = checkCooldown(balance.crimeLast, config.crimeCooldown);
    if (cooldown.onCooldown) {
        return { success: false, amount: 0, message: '', cooldown: cooldown.remaining };
    }
    await updateCooldown(guildId, userId, 'crime_last');
    const isSuccess = Math.random() < 0.40;
    if (isSuccess) {
        const earned = Math.floor(Math.random() * (800 - 250 + 1)) + 250;
        const messages = [
            "You robbed a convenience store and got away with",
            "You hacked a bank and transferred",
            "You stole a car and chopped it for",
            "You embezzled funds and gained",
            "You pulled off a heist and earned"
        ];
        const message = messages[Math.floor(Math.random() * messages.length)];
        await addCash(guildId, userId, earned);
        return { success: true, amount: earned, message: `${message} ${earned}` };
    }
    else {
        const lost = Math.floor(Math.random() * (500 - 100 + 1)) + 100;
        const actualLost = Math.min(lost, balance.cash);
        const messages = [
            "You got caught by the cops and fined",
            "The store owner chased you away and you dropped",
            "Your hacking was traced, paying hush money of",
            "You crashed the stolen car and paid damages of",
            "Your crew betrayed you and took"
        ];
        const message = messages[Math.floor(Math.random() * messages.length)];
        if (actualLost > 0) {
            await removeCash(guildId, userId, actualLost);
        }
        return { success: false, amount: actualLost, message: `${message} ${actualLost}` };
    }
}
export async function executeRob(guildId, attackerId, victimId) {
    if (attackerId === victimId) {
        return { success: false, amount: 0, message: '', error: 'You cannot rob yourself.' };
    }
    await ensureBalance(guildId, attackerId);
    await ensureBalance(guildId, victimId);
    const attackerBalance = await getBalance(guildId, attackerId);
    const victimBalance = await getBalance(guildId, victimId);
    const config = await getEconomyConfig(guildId);
    const cooldown = checkCooldown(attackerBalance.robLast, config.robCooldown);
    if (cooldown.onCooldown) {
        return { success: false, amount: 0, message: '', cooldown: cooldown.remaining };
    }
    if (victimBalance.cash <= 0) {
        return { success: false, amount: 0, message: '', error: 'Target has no cash to rob.' };
    }
    await updateCooldown(guildId, attackerId, 'rob_last');
    const totalCash = attackerBalance.cash + victimBalance.cash;
    let successRate = 0.5;
    if (totalCash > 0) {
        successRate = (attackerBalance.cash / totalCash) * 0.7;
    }
    // Clamp to 20%-80%
    successRate = Math.max(0.2, Math.min(0.8, successRate));
    const isSuccess = Math.random() < successRate;
    if (isSuccess) {
        // Steal 10-50% of victim's cash
        const stealPercent = (Math.floor(Math.random() * (50 - 10 + 1)) + 10) / 100;
        const stealAmount = Math.floor(victimBalance.cash * stealPercent);
        if (stealAmount > 0) {
            await transferCash(guildId, victimId, attackerId, stealAmount);
        }
        return { success: true, amount: stealAmount, message: `You successfully robbed <@${victimId}> and got away with ${stealAmount}!` };
    }
    else {
        // Pay 10-30% of own cash to victim
        const failPercent = (Math.floor(Math.random() * (30 - 10 + 1)) + 10) / 100;
        const payAmount = Math.floor(attackerBalance.cash * failPercent);
        if (payAmount > 0) {
            await transferCash(guildId, attackerId, victimId, payAmount);
        }
        return { success: false, amount: payAmount, message: `You got caught trying to rob <@${victimId}> and had to pay them ${payAmount} in compensation.` };
    }
}
export async function addIncomeRole(guildId, roleId, amount) {
    const db = getDb();
    await db `
        INSERT INTO income_roles (guild_id, role_id, income_amount)
        VALUES (${guildId}, ${roleId}, ${amount})
        ON CONFLICT (guild_id, role_id) DO UPDATE SET income_amount = EXCLUDED.income_amount
    `;
}
export async function removeIncomeRole(guildId, roleId) {
    const db = getDb();
    await db `
        DELETE FROM income_roles WHERE guild_id = ${guildId} AND role_id = ${roleId}
    `;
}
export async function updateIncomeRole(guildId, roleId, amount) {
    const db = getDb();
    await db `
        UPDATE income_roles SET income_amount = ${amount}
        WHERE guild_id = ${guildId} AND role_id = ${roleId}
    `;
}
export async function listIncomeRoles(guildId) {
    const db = getDb();
    const rows = await db `
        SELECT role_id, income_amount FROM income_roles WHERE guild_id = ${guildId}
    `;
    return rows.map(r => ({ roleId: r.role_id, incomeAmount: r.income_amount }));
}
export async function collectIncome(guildId, userId, memberRoleIds) {
    await ensureBalance(guildId, userId);
    const balance = await getBalance(guildId, userId);
    // Hardcoding a 24-hour (86400s) cooldown for income collection
    const cooldown = checkCooldown(balance.passiveLast, 86400);
    if (cooldown.onCooldown) {
        return { success: false, amount: 0, cooldown: cooldown.remaining };
    }
    const roles = await listIncomeRoles(guildId);
    let totalIncome = 0;
    for (const roleId of memberRoleIds) {
        const roleConfig = roles.find(r => r.roleId === roleId);
        if (roleConfig) {
            totalIncome += roleConfig.incomeAmount;
        }
    }
    if (totalIncome === 0) {
        return { success: false, amount: 0, message: "You don't have any roles that provide income." };
    }
    await addCash(guildId, userId, totalIncome);
    await updateCooldown(guildId, userId, 'passive_last');
    return { success: true, amount: totalIncome };
}
export async function forceUpdateIncome(guildId, roleId, memberIds) {
    const roles = await listIncomeRoles(guildId);
    const roleConfig = roles.find(r => r.roleId === roleId);
    if (!roleConfig || roleConfig.incomeAmount <= 0) {
        return { amount: 0, membersPaid: 0 };
    }
    for (const userId of memberIds) {
        await ensureBalance(guildId, userId);
        await addCash(guildId, userId, roleConfig.incomeAmount);
    }
    return { amount: roleConfig.incomeAmount, membersPaid: memberIds.length };
}
//# sourceMappingURL=incomeService.js.map