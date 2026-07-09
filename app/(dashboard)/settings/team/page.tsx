'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/hooks/useToast';
import { Role, User } from '@/types';
import styles from './team.module.css';

const formatRole = (role: Role) => {
  switch (role) {
    case 'ADMIN': return 'Admin';
    case 'PI': return 'PI';
    case 'RESEARCHER': return 'Researcher';
    case 'STUDENT': return 'Student';
    case 'VIEWER': return 'Viewer';
    default: return role;
  }
};

export default function TeamPage() {
  const [members, setMembers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);
  const [userToRemove, setUserToRemove] = useState<User | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('STUDENT');

  const { showToast } = useToast();
  const router = useRouter();

  const fetchTeam = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/team');
      if (res.ok) {
        const data = await res.json();
        setMembers(data);
      } else {
        const err = await res.json();
        if (res.status === 403) {
          showToast({ message: 'Only admins can view the team.', type: 'error' });
          router.push('/dashboard');
        } else {
          showToast({ message: err.error || 'Failed to load team.', type: 'error' });
        }
      }
    } catch (e) {
      showToast({ message: 'Error loading team.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTeam();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddMember = async () => {
    if (password.length < 8) {
      showToast({ message: 'Password must be at least 8 characters.', type: 'error' });
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role }),
      });

      if (res.ok) {
        const data = await res.json();
        showToast({ message: data.emailWarning || 'Team member added.', type: data.emailWarning ? 'warning' : 'success' });
        setIsAddModalOpen(false);
        setName(''); setEmail(''); setPassword(''); setRole('STUDENT');
        fetchTeam();
      } else {
        const err = await res.json();
        let errorMsg = err.error || 'Failed to add member.';
        if (err.details?.fieldErrors) {
          const firstErr = Object.values(err.details.fieldErrors).flat()[0];
          if (firstErr) errorMsg = String(firstErr);
        }
        showToast({ message: errorMsg, type: 'error' });
      }
    } catch (e) {
      showToast({ message: 'An error occurred.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!selectedUser) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/team', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUser.id, role }),
      });

      if (res.ok) {
        showToast({ message: "Member's role updated.", type: 'success' });
        setIsEditModalOpen(false);
        setSelectedUser(null);
        fetchTeam();
      } else {
        const err = await res.json();
        showToast({ message: err.error || 'Failed to update role.', type: 'error' });
      }
    } catch (e) {
      showToast({ message: 'An error occurred.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!userToRemove) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/team', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userToRemove.id }),
      });

      if (res.ok) {
        showToast({ message: `${userToRemove.name} removed from the lab.`, type: 'success' });
        setIsRemoveModalOpen(false);
        setUserToRemove(null);
        fetchTeam();
      } else {
        const err = await res.json();
        showToast({ message: err.error || 'Failed to remove member.', type: 'error' });
      }
    } catch (e) {
      showToast({ message: 'An error occurred.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setRole(user.role);
    setIsEditModalOpen(true);
  };

  const openRemoveModal = (user: User) => {
    setUserToRemove(user);
    setIsRemoveModalOpen(true);
  };

  if (isLoading) return <div className={styles.container}>Loading team...</div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Team Management</h1>
        <div className={styles.addBtnDesktopWrapper}>
          <Button onClick={() => setIsAddModalOpen(true)}>Add Member</Button>
        </div>
        <button className={styles.addBtnMobile} onClick={() => setIsAddModalOpen(true)} aria-label="Add member">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24">
            <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
            <circle cx="8.5" cy="7" r="4" />
            <line x1="20" y1="8" x2="20" y2="14" />
            <line x1="23" y1="11" x2="17" y2="11" />
          </svg>
        </button>
      </div>

      {members.length === 0 ? (
        <div className={styles.noMembers}>No team members found.</div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>Name</th>
                  <th className={styles.th}>Email</th>
                  <th className={styles.th}>Role</th>
                  <th className={styles.th + ' ' + styles.actionsTd}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.id} className={styles.tr}>
                    <td className={styles.td}>
                      <div className={styles.memberNameContainer}>
                        <span className={styles.memberName}>{member.name}</span>
                        {!member.isActive && <span className={styles.inactiveLabel}>(Inactive)</span>}
                      </div>
                    </td>
                    <td className={styles.td}>
                      <span className={styles.memberEmail}>{member.email}</span>
                    </td>
                    <td className={styles.td}>
                      <span className={styles.positionText}>{formatRole(member.role)}</span>
                    </td>
                    <td className={styles.td + ' ' + styles.actionsTd}>
                      <button
                        type="button"
                        className={styles.editIconBtn}
                        onClick={() => openEditModal(member)}
                        aria-label={`Edit role for ${member.name}`}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        className={styles.removeIconBtn}
                        onClick={() => openRemoveModal(member)}
                        aria-label={`Remove ${member.name}`}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className={styles.cardsContainer}>
            {members.map((member) => (
              <div key={member.id} className={styles.memberCard}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardNameGroup}>
                    <span className={styles.cardName}>{member.name}</span>
                    {!member.isActive && <span className={styles.cardInactive}>(Inactive)</span>}
                  </div>
                  <Badge variant={member.role === 'ADMIN' || member.role === 'PI' ? 'success' : 'default'}>
                    {formatRole(member.role)}
                  </Badge>
                </div>
                <div className={styles.cardBody}>
                  <span style={{ fontWeight: '500' }}>Email: </span>
                  <span className={styles.cardEmail}>{member.email}</span>
                </div>
                <div className={styles.cardActions}>
                  <button
                    type="button"
                    className={styles.cardActionBtn}
                    onClick={() => openEditModal(member)}
                    aria-label={`Edit role for ${member.name}`}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4z" />
                    </svg>
                    Edit Role
                  </button>
                  <button
                    type="button"
                    className={`${styles.cardActionBtn} ${styles.cardActionBtnDanger}`}
                    onClick={() => openRemoveModal(member)}
                    aria-label={`Remove ${member.name}`}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                    </svg>
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <Modal
        isOpen={isAddModalOpen}
        title="Add Team Member"
        onClose={() => setIsAddModalOpen(false)}
        primaryAction={{
          label: "Add Member",
          onClick: handleAddMember,
          isLoading: isSubmitting,
        }}
        secondaryAction={{
          label: "Cancel",
          onClick: () => setIsAddModalOpen(false),
        }}
      >
        <div className={styles.form}>
          <Input
            label="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Dr. Jane Doe"
          />
          <Input
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jane@lab.com"
          />
          <Input
            label="Temporary Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimum 8 characters"
          />
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>Role</label>
            <select
              className={styles.roleSelect}
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
            >
              <option value="ADMIN">Admin (PI / Lead)</option>
              <option value="RESEARCHER">Researcher</option>
              <option value="STUDENT">Student</option>
              <option value="VIEWER">Viewer</option>
            </select>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isRemoveModalOpen}
        title={`Remove ${userToRemove?.name} from your lab?`}
        onClose={() => { setIsRemoveModalOpen(false); setUserToRemove(null); }}
        primaryAction={{
          label: "Remove",
          onClick: handleRemoveMember,
          isLoading: isSubmitting,
          danger: true,
        }}
        secondaryAction={{
          label: "Cancel",
          onClick: () => { setIsRemoveModalOpen(false); setUserToRemove(null); },
        }}
      >
        <div className={styles.form}>
          <p style={{ fontSize: '14px', color: 'var(--color-on-surface-variant)', marginBottom: '8px' }}>
            Their samples will remain in the lab and can still be viewed.
          </p>
        </div>
      </Modal>

      <Modal
        isOpen={isEditModalOpen}
        title={`Change Role: ${selectedUser?.name}`}
        onClose={() => setIsEditModalOpen(false)}
        primaryAction={{
          label: "Update Role",
          onClick: handleUpdateRole,
          isLoading: isSubmitting,
        }}
        secondaryAction={{
          label: "Cancel",
          onClick: () => setIsEditModalOpen(false),
        }}
      >
        <div className={styles.form}>
          <p style={{ fontSize: '14px', color: 'var(--color-on-surface-variant)', marginBottom: '8px' }}>
            Select a new role for this member. They will be required to log in again if their permissions change significantly.
          </p>
          <select
            className={styles.roleSelect}
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
          >
            <option value="ADMIN">Admin (PI / Lead)</option>
            <option value="RESEARCHER">Researcher</option>
            <option value="STUDENT">Student</option>
            <option value="VIEWER">Viewer</option>
          </select>
        </div>
      </Modal>
    </div>
  );
}
