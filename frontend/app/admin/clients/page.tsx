/**
 * Clients List Page - Improved Layout
 */
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AdminLayout from '@/components/admin/AdminLayout';
import * as adminApi from '@/lib/api/admin';
import { format } from 'date-fns';
import { Search, Building2, Plus } from 'lucide-react';

export default function ClientsListPage() {
  const [clients, setClients] = useState<adminApi.ClientListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    loadClients();
  }, [page, search, statusFilter, planFilter]);

  async function loadClients() {
    setLoading(true);
    try {
      const data = await adminApi.getClients({
        page,
        page_size: 20,
        search: search || undefined,
        status: statusFilter || undefined,
        plan: planFilter || undefined,
      });
      setClients(data);
    } catch (error) {
      console.error('Error loading clients:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const statusColor = (s: string) => {
    switch (s) {
      case 'active': return { bg: '#dcfce7', text: '#166534' };
      case 'suspended': return { bg: '#fee2e2', text: '#991b1b' };
      default: return { bg: '#f3f4f6', text: '#374151' };
    }
  };

  const planColor = (p: string) => {
    switch (p) {
      case 'enterprise': return { bg: '#f3e8ff', text: '#6b21a8' };
      case 'professional': return { bg: '#dbeafe', text: '#1e40af' };
      default: return { bg: '#f3f4f6', text: '#374151' };
    }
  };

  return (
    <AdminLayout>
      <div>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 40 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111827', margin: 0 }}>Clients</h1>
            <p style={{ fontSize: 15, color: '#6b7280', marginTop: 4 }}>
              Manage all client accounts {clients ? `(${clients.total} total)` : ''}
            </p>
          </div>
          <Link href="/admin/clients/new" style={{
            padding: '10px 20px', background: 'var(--color-primary)', color: '#fff',
            borderRadius: 8, fontSize: 14, fontWeight: 600, textDecoration: 'none',
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}>
            <Plus size={15} /> Add Client
          </Link>
        </div>

        {/* Filters */}
        <div style={{
          background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb',
          padding: 16, marginBottom: 32,
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12 }}>
            <div style={{ position: 'relative' }}>
              <Search size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', pointerEvents: 'none' }} />
              <input
                type="text"
                placeholder="Search by company name or email..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                style={{
                  padding: '10px 16px 10px 38px', border: '1px solid var(--color-border)', borderRadius: 8,
                  fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box' as const,
                  background: 'var(--color-card)', color: 'var(--color-text-primary)',
                }}
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              style={{ padding: '10px 16px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, outline: 'none' }}
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
            <select
              value={planFilter}
              onChange={(e) => { setPlanFilter(e.target.value); setPage(1); }}
              style={{ padding: '10px 16px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, outline: 'none' }}
            >
              <option value="">All Plans</option>
              <option value="free">Free</option>
              <option value="professional">Professional</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>
        </div>

        {/* Client Cards / Table */}
        <div style={{
          background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden',
        }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
              <div style={{
                width: 40, height: 40, border: '3px solid #e5e7eb', borderTopColor: 'var(--color-primary)',
                borderRadius: '50%', animation: 'spin 0.8s linear infinite',
              }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : (
            <>
              {/* Table Header */}
              <div style={{
                display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr 1.2fr 0.8fr',
                padding: '16px 24px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb',
                fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' as const,
                letterSpacing: 0.5,
              }}>
                <div>Company</div>
                <div>Email</div>
                <div>Plan</div>
                <div>Status</div>
                <div>Created</div>
                <div style={{ textAlign: 'right' }}>Actions</div>
              </div>

              {/* Table Rows */}
              {clients?.clients.map((client) => {
                const sc = statusColor(client.status);
                const pc = planColor(client.plan);
                return (
                  <div
                    key={client.id}
                    style={{
                      display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr 1.2fr 0.8fr',
                      padding: '16px 24px', borderBottom: '1px solid #f3f4f6',
                      alignItems: 'center', transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{client.company_name}</div>
                    </div>
                    <div style={{ fontSize: 13, color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {client.email}
                    </div>
                    <div>
                      <span style={{
                        padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                        background: pc.bg, color: pc.text, textTransform: 'capitalize' as const,
                      }}>
                        {client.plan}
                      </span>
                    </div>
                    <div>
                      <span style={{
                        padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                        background: sc.bg, color: sc.text, textTransform: 'capitalize' as const,
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                      }}>
                        <span style={{
                          width: 6, height: 6, borderRadius: '50%',
                          background: client.status === 'active' ? '#22c55e' : client.status === 'suspended' ? '#ef4444' : '#9ca3af',
                        }} />
                        {client.status}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: '#6b7280' }}>
                      {format(new Date(client.created_at), 'MMM d, yyyy')}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <Link
                        href={`/admin/clients/${client.id}`}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '6px 14px', borderRadius: 6, fontSize: 13, fontWeight: 600,
                          color: 'var(--color-primary)', background: 'var(--color-primary-alpha)', textDecoration: 'none',
                          transition: 'background 0.15s',
                        }}
                      >
                        View →
                      </Link>
                    </div>
                  </div>
                );
              })}

              {/* Empty State */}
              {clients?.clients.length === 0 && (
                <div style={{ padding: 48, textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  <Building2 size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
                  <div style={{ fontSize: 14, fontWeight: 600 }}>No clients found</div>
                  <div style={{ fontSize: 13, marginTop: 4 }}>Try adjusting your search or filters</div>
                </div>
              )}

              {/* Pagination */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 24px', borderTop: '1px solid #e5e7eb', background: '#f9fafb',
              }}>
                <div style={{ fontSize: 13, color: '#6b7280' }}>
                  Showing {Math.min((page - 1) * 20 + 1, clients?.total || 0)} to {Math.min(page * 20, clients?.total || 0)} of {clients?.total || 0}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    style={{
                      padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: 8,
                      fontSize: 13, fontWeight: 500, cursor: page === 1 ? 'not-allowed' : 'pointer',
                      opacity: page === 1 ? 0.5 : 1, background: '#fff', color: '#374151',
                    }}
                  >
                    ← Previous
                  </button>
                  <span style={{
                    padding: '8px 14px', fontSize: 13, fontWeight: 600, color: 'var(--color-primary)',
                    background: 'var(--color-primary-alpha)', borderRadius: 8,
                  }}>
                    Page {page}/{clients?.total_pages || 1}
                  </span>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page >= (clients?.total_pages || 1)}
                    style={{
                      padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: 8,
                      fontSize: 13, fontWeight: 500,
                      cursor: page >= (clients?.total_pages || 1) ? 'not-allowed' : 'pointer',
                      opacity: page >= (clients?.total_pages || 1) ? 0.5 : 1,
                      background: '#fff', color: '#374151',
                    }}
                  >
                    Next →
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
