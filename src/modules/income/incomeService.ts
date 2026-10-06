import type postgres from 'postgres';
import { getDb } from '../../core/database/pool.js';
import { getEconomyConfig } from '../../core/database/repositories/economyConfigRepo.js';
import { incomeIntervalSeconds } from '../../core/utils/incomeInterval.js';
import { ensureBalance, addCash } from '../economy/economyService.js';

export function checkCooldown(lastTime: Date | null, cooldownSeconds: number): { onCooldown: boolean; remaining: number } {
  if (!lastTime) return { onCooldown: false, remaining: 0 };
  const elapsed = (Date.now() - lastTime.getTime()) / 1000;
  if (elapsed < cooldownSeconds) return { onCooldown: true, remaining: Math.ceil(cooldownSeconds - elapsed) };
  return { onCooldown: false, remaining: 0 };
}

async function lockBalances(tx: postgres.TransactionSql, guildId: string, ids: string[], startBalance: number) {
    // Insert and lock in the same order, including first-time users.
    const sortedIds = [...new Set(ids)].sort();
    for (const userId of sortedIds) await tx`
      INSERT INTO economy_balances (guild_id, user_id, cash)
      VALUES (${guildId}, ${userId}, ${startBalance}) ON CONFLICT (guild_id, user_id) DO NOTHING
    `;
    const rows = await tx`SELECT * FROM economy_balances WHERE guild_id = ${guildId} AND user_id = ANY(${sortedIds}) ORDER BY user_id FOR UPDATE`;
    return new Map(rows.map(row => [String(row.user_id), {
      cash: Number(row.cash), workLast: row.work_last ? new Date(row.work_last) : null,
      slutLast: row.slut_last ? new Date(row.slut_last) : null,
      crimeLast: row.crime_last ? new Date(row.crime_last) : null,
      robLast: row.rob_last ? new Date(row.rob_last) : null,
      passiveLast: row.passive_last ? new Date(row.passive_last) : null,
    }]));
}
async function updateCooldown(tx: postgres.TransactionSql, guildId: string, userId: string, field: 'work_last' | 'slut_last' | 'crime_last' | 'rob_last' | 'passive_last') {
    await tx`UPDATE economy_balances SET ${tx(field)} = NOW(), updated_at = NOW() WHERE guild_id = ${guildId} AND user_id = ${userId}`;
}
async function changeCash(tx: postgres.TransactionSql, guildId: string, userId: string, amount: number) {
    await tx`UPDATE economy_balances SET cash = cash + ${amount}, updated_at = NOW() WHERE guild_id = ${guildId} AND user_id = ${userId}`;
}
async function transferLocked(tx: postgres.TransactionSql, guildId: string, from: string, to: string, amount: number) {
    await changeCash(tx, guildId, from, -amount);
    await changeCash(tx, guildId, to, amount);
}

export async function executeWork(guildId: string, userId: string): Promise<{ success: boolean; earned: number; message: string; cooldown?: number }> {
    const config = await getEconomyConfig(guildId);
    return getDb().begin(async tx => {
    const balance = (await lockBalances(tx, guildId, [userId], config.startBalance)).get(userId)!;
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

    await changeCash(tx, guildId, userId, earned);
    await updateCooldown(tx, guildId, userId, 'work_last');

    return { success: true, earned, message: `${message} ${earned}` };
    });
}

export async function executeSlut(guildId: string, userId: string): Promise<{ success: boolean; amount: number; message: string; cooldown?: number }> {
    const config = await getEconomyConfig(guildId);
    return getDb().begin(async tx => {
    const balance = (await lockBalances(tx, guildId, [userId], config.startBalance)).get(userId)!;
    const cooldown = checkCooldown(balance.slutLast, config.slutCooldown);
    if (cooldown.onCooldown) {
        return { success: false, amount: 0, message: '', cooldown: cooldown.remaining };
    }

    await updateCooldown(tx, guildId, userId, 'slut_last');
    
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
        await changeCash(tx, guildId, userId, earned);
        return { success: true, amount: earned, message: `${message} ${earned}` };
    } else {
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
            await changeCash(tx, guildId, userId, -actualLost);
        }
        return { success: false, amount: actualLost, message: `${message} ${actualLost}` };
    }
    });
}

export async function executeCrime(guildId: string, userId: string): Promise<{ success: boolean; amount: number; message: string; cooldown?: number }> {
    const config = await getEconomyConfig(guildId);
    return getDb().begin(async tx => {
    const balance = (await lockBalances(tx, guildId, [userId], config.startBalance)).get(userId)!;
    const cooldown = checkCooldown(balance.crimeLast, config.crimeCooldown);
    if (cooldown.onCooldown) {
        return { success: false, amount: 0, message: '', cooldown: cooldown.remaining };
    }

    await updateCooldown(tx, guildId, userId, 'crime_last');
    
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
        await changeCash(tx, guildId, userId, earned);
        return { success: true, amount: earned, message: `${message} ${earned}` };
    } else {
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
            await changeCash(tx, guildId, userId, -actualLost);
        }
        return { success: false, amount: actualLost, message: `${message} ${actualLost}` };
    }
    });
}

export async function executeRob(guildId: string, attackerId: string, victimId: string): Promise<{ success: boolean; amount: number; message: string; cooldown?: number; error?: string }> {
    if (attackerId === victimId) {
        return { success: false, amount: 0, message: '', error: 'You cannot rob yourself.' };
    }

    const config = await getEconomyConfig(guildId);
    return getDb().begin(async tx => {
    const balances = await lockBalances(tx, guildId, [attackerId, victimId], config.startBalance);
    const attackerBalance = balances.get(attackerId)!;
    const victimBalance = balances.get(victimId)!;
    const cooldown = checkCooldown(attackerBalance.robLast, config.robCooldown);
    if (cooldown.onCooldown) {
        return { success: false, amount: 0, message: '', cooldown: cooldown.remaining };
    }

    if (victimBalance.cash <= 0) {
        return { success: false, amount: 0, message: '', error: 'Target has no cash to rob.' };
    }

    await updateCooldown(tx, guildId, attackerId, 'rob_last');

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
            await transferLocked(tx, guildId, victimId, attackerId, stealAmount);
        }
        return { success: true, amount: stealAmount, message: `You successfully robbed <@${victimId}> and got away with ${stealAmount}!` };
    } else {
        // Pay 10-30% of own cash to victim
        const failPercent = (Math.floor(Math.random() * (30 - 10 + 1)) + 10) / 100;
        const payAmount = Math.floor(attackerBalance.cash * failPercent);
        if (payAmount > 0) {
            await transferLocked(tx, guildId, attackerId, victimId, payAmount);
        }
        return { success: false, amount: payAmount, message: `You got caught trying to rob <@${victimId}> and had to pay them ${payAmount} in compensation.` };
    }
    });
}

export async function addIncomeRole(guildId: string, roleId: string, amount: number): Promise<void> {
    const db = getDb();
    await db`
        INSERT INTO income_roles (guild_id, role_id, income_amount)
        VALUES (${guildId}, ${roleId}, ${amount})
        ON CONFLICT (guild_id, role_id) DO UPDATE SET income_amount = EXCLUDED.income_amount
    `;
}

export async function removeIncomeRole(guildId: string, roleId: string): Promise<void> {
    const db = getDb();
    await db`
        DELETE FROM income_roles WHERE guild_id = ${guildId} AND role_id = ${roleId}
    `;
}

export async function updateIncomeRole(guildId: string, roleId: string, amount: number): Promise<void> {
    const db = getDb();
    await db`
        UPDATE income_roles SET income_amount = ${amount}
        WHERE guild_id = ${guildId} AND role_id = ${roleId}
    `;
}

export async function listIncomeRoles(guildId: string): Promise<Array<{ roleId: string; incomeAmount: number }>> {
    const db = getDb();
    const rows = await db`
        SELECT role_id, income_amount FROM income_roles WHERE guild_id = ${guildId}
    `;
    return rows.map(r => ({ roleId: r.role_id, incomeAmount: r.income_amount }));
}

export async function collectIncome(guildId: string, userId: string, memberRoleIds: string[]): Promise<{ success: boolean; amount: number; cooldown?: number; message?: string }> {
    const config = await getEconomyConfig(guildId);
    return getDb().begin(async tx => {
    const balance = (await lockBalances(tx, guildId, [userId], config.startBalance)).get(userId)!;
    const cooldown = checkCooldown(balance.passiveLast, incomeIntervalSeconds(config.incomeReset));
    if (cooldown.onCooldown) {
        return { success: false, amount: 0, cooldown: cooldown.remaining };
    }

    const roleRows = await tx`SELECT role_id, income_amount FROM income_roles WHERE guild_id = ${guildId}`;
    const roles = roleRows.map(r => ({ roleId: r.role_id, incomeAmount: Number(r.income_amount) }));
    let totalIncome = 0;
    
    for (const roleId of new Set(memberRoleIds)) {
        const roleConfig = roles.find(r => r.roleId === roleId);
        if (roleConfig) {
            totalIncome += roleConfig.incomeAmount;
        }
    }

    if (totalIncome === 0) {
        return { success: false, amount: 0, message: "You don't have any roles that provide income." };
    }

    await changeCash(tx, guildId, userId, totalIncome);
    await updateCooldown(tx, guildId, userId, 'passive_last');

    return { success: true, amount: totalIncome };
    });
}

export async function forceUpdateIncome(guildId: string, roleId: string, memberIds: string[]): Promise<{ amount: number; membersPaid: number }> {
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
