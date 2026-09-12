import { NextRequest, NextResponse } from 'next/server';
import { getSession, canManageGuild } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: guildId } = await params;
  const allowed = await canManageGuild(session.id, guildId);
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const rows = await db`
      SELECT
        item_id,
        name,
        price,
        description,
        icon_url,
        inventory_role_id,
        inventory_enabled,
        usable,
        sellable,
        stock,
        role_required,
        role_given,
        role_removed,
        reply_message,
        requirements_json,
        actions_json,
        created_at
      FROM store_items
      WHERE guild_id = ${guildId}
      ORDER BY price ASC
    `;

    return NextResponse.json({
      items: rows.map((r: any) => ({
        itemId: r.item_id,
        name: r.name,
        price: Number(r.price),
        description: r.description || '',
        iconUrl: r.icon_url || '',
        inventoryRoleId: r.inventory_role_id,
        inventoryEnabled: Boolean(r.inventory_enabled),
        usable: Boolean(r.usable),
        sellable: Boolean(r.sellable),
        stock: Number(r.stock ?? -1),
        roleRequired: r.role_required,
        roleGiven: r.role_given,
        roleRemoved: r.role_removed,
        replyMessage: r.reply_message || '',
        requirements: r.requirements_json || {},
        actions: r.actions_json || {},
        createdAt: r.created_at,
      })),
    });
  } catch (err: any) {
    console.error('Failed to get store items:', err);
    return NextResponse.json({ error: 'Failed to retrieve store items' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: guildId } = await params;
  const allowed = await canManageGuild(session.id, guildId);
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await req.json();
    const {
      name,
      price,
      description,
      iconUrl,
      inventoryRoleId,
      inventoryEnabled = true,
      usable = true,
      sellable = true,
      stock = -1,
      roleRequired,
      roleGiven,
      roleRemoved,
      replyMessage,
      requirements = {},
      actions = {},
    } = body;

    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'Item name is required' }, { status: 400 });
    }

    // Support scientific notation or string numbers
    let parsedPrice = 0;
    if (typeof price === 'string' && price.toLowerCase().includes('e')) {
      parsedPrice = Math.floor(Number(price));
    } else {
      parsedPrice = Math.max(0, parseInt(price ?? 0, 10));
    }

    const [created] = await db`
      INSERT INTO store_items (
        guild_id,
        name,
        price,
        description,
        icon_url,
        inventory_role_id,
        inventory_enabled,
        usable,
        sellable,
        stock,
        role_required,
        role_given,
        role_removed,
        reply_message,
        requirements_json,
        actions_json
      )
      VALUES (
        ${guildId},
        ${name.trim()},
        ${parsedPrice},
        ${description ? description.trim() : null},
        ${iconUrl ? iconUrl.trim() : null},
        ${inventoryRoleId || null},
        ${Boolean(inventoryEnabled)},
        ${Boolean(usable)},
        ${Boolean(sellable)},
        ${parseInt(stock ?? -1, 10)},
        ${roleRequired || null},
        ${roleGiven || null},
        ${roleRemoved || null},
        ${replyMessage ? replyMessage.trim() : null},
        ${JSON.stringify(requirements)},
        ${JSON.stringify(actions)}
      )
      RETURNING *
    `;

    return NextResponse.json({ success: true, item: created });
  } catch (err: any) {
    console.error('Failed to create store item:', err);
    return NextResponse.json({ error: 'Failed to create item' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: guildId } = await params;
  const allowed = await canManageGuild(session.id, guildId);
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await req.json();
    const {
      itemId,
      name,
      price,
      description,
      iconUrl,
      inventoryRoleId,
      inventoryEnabled,
      usable,
      sellable,
      stock,
      roleRequired,
      roleGiven,
      roleRemoved,
      replyMessage,
      requirements,
      actions,
    } = body;

    if (!itemId) {
      return NextResponse.json({ error: 'itemId is required' }, { status: 400 });
    }

    let parsedPrice: number | undefined;
    if (price !== undefined) {
      if (typeof price === 'string' && price.toLowerCase().includes('e')) {
        parsedPrice = Math.floor(Number(price));
      } else {
        parsedPrice = Math.max(0, parseInt(price, 10));
      }
    }

    const [updated] = await db`
      UPDATE store_items
      SET
        name = COALESCE(${name !== undefined ? name.trim() : null}, name),
        price = COALESCE(${parsedPrice !== undefined ? parsedPrice : null}, price),
        description = COALESCE(${description !== undefined ? description.trim() : null}, description),
        icon_url = COALESCE(${iconUrl !== undefined ? iconUrl.trim() : null}, icon_url),
        inventory_role_id = ${inventoryRoleId !== undefined ? inventoryRoleId || null : db`inventory_role_id`},
        inventory_enabled = COALESCE(${inventoryEnabled !== undefined ? Boolean(inventoryEnabled) : null}, inventory_enabled),
        usable = COALESCE(${usable !== undefined ? Boolean(usable) : null}, usable),
        sellable = COALESCE(${sellable !== undefined ? Boolean(sellable) : null}, sellable),
        stock = COALESCE(${stock !== undefined ? parseInt(stock, 10) : null}, stock),
        role_required = ${roleRequired !== undefined ? roleRequired || null : db`role_required`},
        role_given = ${roleGiven !== undefined ? roleGiven || null : db`role_given`},
        role_removed = ${roleRemoved !== undefined ? roleRemoved || null : db`role_removed`},
        reply_message = ${replyMessage !== undefined ? replyMessage.trim() || null : db`reply_message`},
        requirements_json = COALESCE(${requirements !== undefined ? JSON.stringify(requirements) : null}, requirements_json),
        actions_json = COALESCE(${actions !== undefined ? JSON.stringify(actions) : null}, actions_json)
      WHERE guild_id = ${guildId} AND item_id = ${itemId}
      RETURNING *
    `;

    return NextResponse.json({ success: true, item: updated });
  } catch (err: any) {
    console.error('Failed to update store item:', err);
    return NextResponse.json({ error: 'Failed to update item' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: guildId } = await params;
  const allowed = await canManageGuild(session.id, guildId);
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const { searchParams } = new URL(req.url);
    const itemId = searchParams.get('itemId');
    if (!itemId) {
      return NextResponse.json({ error: 'itemId query param is required' }, { status: 400 });
    }

    await db`
      DELETE FROM store_items
      WHERE guild_id = ${guildId} AND item_id = ${parseInt(itemId, 10)}
    `;

    return NextResponse.json({ success: true, message: 'Item deleted.' });
  } catch (err: any) {
    console.error('Failed to delete store item:', err);
    return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 });
  }
}
