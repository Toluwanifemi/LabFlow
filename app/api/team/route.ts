import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { canPerformAction } from '@/lib/auth/permissions';
import { getUsersByLabId, createUser, updateUserRole, deactivateUser, getUserByEmail, getUserById, createVerificationToken } from '@/lib/db/users';
import { writeAuditLog } from '@/lib/db/audit';
import { createMemberSchema, updateRoleSchema, removeMemberSchema } from '@/lib/validators/team';
import { sendInviteEmail } from '@/lib/email/mailer';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { Role } from '@/types';
import { getIpAddress } from '@/lib/api/utils';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!canPerformAction(session.user.role, 'manage_roles')) {
      return NextResponse.json({ error: 'You do not have permission to perform this action.' }, { status: 403 });
    }

    const users = await getUsersByLabId(session.user.labId);
    
    const safeUsers = users.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      isActive: u.isActive,
      createdAt: u.createdAt,
      lastLogin: u.lastLogin,
    }));

    return NextResponse.json(safeUsers, { status: 200 });
  } catch (error) {
    console.error('[GET /api/team]', error);
    return NextResponse.json({ error: 'Something went wrong. Please try again later.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!canPerformAction(session.user.role, 'manage_roles')) {
      return NextResponse.json({ error: 'You do not have permission to perform this action.' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = createMemberSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input.', details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;

    // Check for duplicate email
    const existingUser = await getUserByEmail(data.email);
    if (existingUser) {
      return NextResponse.json({ error: 'A user with this email already exists.' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const newUser = await createUser({
      name: data.name,
      email: data.email,
      passwordHash,
      role: data.role,
    }, session.user.labId);

    const safeUser = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      isActive: newUser.isActive,
      createdAt: newUser.createdAt,
      lastLogin: newUser.lastLogin,
    };

    // Generate verification token and send invite email
    let emailWarning: string | null = null;
    try {
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

      await createVerificationToken(data.email, token, expiresAt);

      const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth?mode=verify&token=${token}`;
      const sent = await sendInviteEmail(data.email, data.name, session.user.labName || 'your lab', session.user.name || 'An admin', verifyUrl);
      if (!sent) {
        emailWarning = 'Member added but invite email could not be sent. Check your SMTP configuration.';
      }
    } catch (emailErr) {
      console.error('[POST /api/team] Failed to send invite email:', emailErr);
      emailWarning = 'Member added but invite email could not be sent. Check server logs for details.';
    }

    return NextResponse.json({ ...safeUser, emailWarning }, { status: emailWarning ? 201 : 201 });

  } catch (error) {
    console.error('[POST /api/team]', error);
    return NextResponse.json({ error: 'Something went wrong. Please try again later.' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!canPerformAction(session.user.role, 'manage_roles')) {
      return NextResponse.json({ error: 'You do not have permission to perform this action.' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = updateRoleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input.', details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;

    const existingUser = await getUserById(data.userId, session.user.labId);
    const oldRole = existingUser?.role;

    const updatedUser = await updateUserRole(data.userId, data.role, session.user.labId);

    if (oldRole !== data.role) {
      await writeAuditLog({
        userId: session.user.id,
        actionType: 'UPDATE',
        sampleId: null,
        fieldChanged: 'role',
        oldValue: oldRole,
        newValue: data.role,
        ipAddress: getIpAddress(req),
      });
    }

    const safeUser = {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      isActive: updatedUser.isActive,
      createdAt: updatedUser.createdAt,
      lastLogin: updatedUser.lastLogin,
    };
    return NextResponse.json(safeUser, { status: 200 });

  } catch (error) {
    console.error('[PATCH /api/team]', error);
    return NextResponse.json({ error: 'Something went wrong. Please try again later.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!canPerformAction(session.user.role, 'manage_roles')) {
      return NextResponse.json({ error: 'You do not have permission to perform this action.' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = removeMemberSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input.', details: parsed.error.flatten() }, { status: 400 });
    }

    const { userId } = parsed.data;

    if (userId === session.user.id) {
      return NextResponse.json({ error: 'You cannot remove yourself.' }, { status: 400 });
    }

    const user = await getUserById(userId, session.user.labId);
    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    await deactivateUser(userId, session.user.labId);

    await writeAuditLog({
      userId: session.user.id,
      actionType: 'UPDATE',
      sampleId: null,
      fieldChanged: 'isActive',
      oldValue: 'true',
      newValue: 'false',
      ipAddress: getIpAddress(req),
    });

    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error) {
    console.error('[DELETE /api/team]', error);
    return NextResponse.json({ error: 'Something went wrong. Please try again later.' }, { status: 500 });
  }
}
