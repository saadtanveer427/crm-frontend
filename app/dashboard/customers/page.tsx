"use client";

import { useState, useEffect, useCallback, useRef, Fragment } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import {
  fetchCustomers,
  fetchDeletedCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  restoreCustomer,
  createNote,
  deleteNote,
  fetchUsers,
  fetchOrganizations,
} from "../../../lib/api";
import type { Customer, Note, UserModel, Organization } from "../../../types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function errorMsg(err: unknown): string {
  const e = err as { message?: string | string[] };
  const m = e.message;
  if (Array.isArray(m)) return m[0];
  return m ?? "Something went wrong.";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 10px",
        borderRadius: "999px",
        fontSize: "0.75rem",
        fontWeight: 600,
        background: color + "18",
        color,
        border: `1px solid ${color}40`,
      }}
    >
      {label}
    </span>
  );
}

function Spinner() {
  return (
    <div
      style={{
        width: 20,
        height: 20,
        border: "2px solid #e5e7eb",
        borderTopColor: "#2563eb",
        borderRadius: "50%",
        animation: "spin 0.7s linear infinite",
        display: "inline-block",
      }}
    />
  );
}

// ─── Customer Form Modal ──────────────────────────────────────────────────────

interface CustomerFormProps {
  initial?: Partial<Customer>;
  users: UserModel[];
  isAdmin: boolean;
  onSave: (customer: Customer) => void;
  onClose: () => void;
}

function CustomerForm({
  initial,
  users,
  isAdmin,
  onSave,
  onClose,
}: CustomerFormProps) {
  const isEdit = !!initial?.id;
  const [name, setName] = useState(initial?.name ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [userId, setUserId] = useState(initial?.userId ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      let result: Customer;
      if (isEdit && initial?.id) {
        const payload: Record<string, string | undefined> = { name, email };
        if (phone) payload.phone = phone;
        if (isAdmin && userId) payload.userId = userId;
        result = await updateCustomer(initial.id, payload);
      } else {
        result = await createCustomer({
          name,
          email,
          phone: phone || undefined,
        });
      }
      onSave(result);
    } catch (err) {
      setError(errorMsg(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={modal.overlay} onClick={onClose}>
      <div style={modal.box} onClick={(e) => e.stopPropagation()}>
        <div style={modal.header}>
          <h2 style={modal.title}>
            {isEdit ? "Edit Customer" : "New Customer"}
          </h2>
          <button onClick={onClose} style={modal.closeBtn}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={modal.form}>
          <Field label="Name">
            <input
              style={inp}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </Field>
          <Field label="Email">
            <input
              style={inp}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Field>
          <Field label="Phone (optional)">
            <input
              style={inp}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </Field>

          {isEdit && isAdmin && users.length > 0 && (
            <Field label="Assign to">
              <select
                style={inp}
                value={userId ?? ""}
                onChange={(e) => setUserId(e.target.value)}
              >
                <option value="">— unassigned —</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </select>
            </Field>
          )}

          {error && <div style={styles.errorBox}>{error}</div>}

          <div style={modal.actions}>
            <button type="button" onClick={onClose} style={styles.btnSecondary}>
              Cancel
            </button>
            <button type="submit" disabled={saving} style={styles.btnPrimary}>
              {saving ? <Spinner /> : isEdit ? "Save changes" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
      <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#374151" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

// ─── Notes Panel ──────────────────────────────────────────────────────────────

function NotesPanel({
  customer,
  onNoteAdded,
  onNoteDeleted,
}: {
  customer: Customer;
  onNoteAdded: (note: Note) => void;
  onNoteDeleted: (noteId: string) => void;
}) {
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(e: { preventDefault(): void }) {
    e.preventDefault();
    if (!content.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const note = await createNote(customer.id, content.trim());
      onNoteAdded(note);
      setContent("");
    } catch (err) {
      setError(errorMsg(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(note: Note) {
    if (!confirm("Delete this note?")) return;
    try {
      await deleteNote(customer.id, note.id);
      onNoteDeleted(note.id);
    } catch (err) {
      alert(errorMsg(err));
    }
  }

  const notes = customer.notes ?? [];

  return (
    <div style={notesStyle.panel}>
      <p style={notesStyle.heading}>Notes ({notes.length})</p>

      {notes.length === 0 && (
        <p
          style={{
            color: "#9ca3af",
            fontSize: "0.85rem",
            marginBottom: "0.75rem",
          }}
        >
          No notes yet.
        </p>
      )}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
          marginBottom: "0.875rem",
        }}
      >
        {notes.map((n) => (
          <div key={n.id} style={notesStyle.noteCard}>
            <p style={notesStyle.noteText}>{n.content}</p>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: "0.35rem",
              }}
            >
              <span style={notesStyle.noteMeta}>{fmtDate(n.createdAt)}</span>
              <button
                onClick={() => handleDelete(n)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#ef4444",
                  cursor: "pointer",
                  fontSize: "0.78rem",
                }}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleAdd} style={{ display: "flex", gap: "0.5rem" }}>
        <input
          style={{ ...inp, flex: 1, fontSize: "0.85rem" }}
          placeholder="Add a note…"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          disabled={saving}
        />
        <button
          type="submit"
          disabled={saving || !content.trim()}
          style={{
            ...styles.btnPrimary,
            padding: "0.45rem 0.875rem",
            fontSize: "0.85rem",
          }}
        >
          {saving ? "…" : "Add"}
        </button>
      </form>
      {error && (
        <p
          style={{ color: "#dc2626", fontSize: "0.8rem", marginTop: "0.3rem" }}
        >
          {error}
        </p>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CustomersPage() {
  const { auth, isAdmin } = useAuth();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [users, setUsers] = useState<UserModel[]>([]);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Customer | undefined>();
  const [notesCustomer, setNotesCustomer] = useState<Customer | null>(null);

  // Deleted customers — fetched from GET /customers/deleted
  const [deletedCustomers, setDeletedCustomers] = useState<Customer[]>([]);
  const [deletedTotal, setDeletedTotal] = useState(0);
  const [deletedTotalPages, setDeletedTotalPages] = useState(1);
  const [deletedPage, setDeletedPage] = useState(1);
  const deletedLimit = 10;
  const [showDeleted, setShowDeleted] = useState(false);
  const [deletedLoading, setDeletedLoading] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const loadDeleted = useCallback(async () => {
    setDeletedLoading(true);
    try {
      const result = await fetchDeletedCustomers({
        page: deletedPage,
        limit: deletedLimit,
      });
      setDeletedCustomers(result.data);
      setDeletedTotal(result.total);
      setDeletedTotalPages(result.totalPages);
    } catch {
      // silently fail — section is optional
    } finally {
      setDeletedLoading(false);
    }
  }, [deletedPage]);

  useEffect(() => {
    if (isAdmin && showDeleted) loadDeleted();
  }, [isAdmin, showDeleted, loadDeleted]);

  // Debounce search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (isAdmin) {
        // Admin: full server-side pagination
        const result = await fetchCustomers({
          search: debouncedSearch || undefined,
          page,
          limit,
        });
        setCustomers(result.data);
        setTotal(result.total);
        setTotalPages(result.totalPages);
      } else {
        // Members have max 5 assigned customers — fetch all, filter client-side
        const result = await fetchCustomers({
          search: debouncedSearch || undefined,
          page: 1,
          limit: 100,
        });
        const data = result.data.filter((c) => c.userId === auth?.user.id);
        setCustomers(data);
        setTotal(data.length);
        setTotalPages(1);
      }
    } catch (err) {
      setError(errorMsg(err));
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page, limit, isAdmin, auth]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [limit]);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers()
        .then(setUsers)
        .catch(() => {});
      fetchOrganizations()
        .then(setOrgs)
        .catch(() => {});
    }
  }, [isAdmin]);

  function handleSaved(_customer: Customer) {
    setShowForm(false);
    setEditTarget(undefined);
    load();
  }

  async function handleDelete(c: Customer) {
    if (!confirm(`Delete customer "${c.name}"?`)) return;
    try {
      await deleteCustomer(c.id);
      load();
      if (showDeleted) loadDeleted();
    } catch (err) {
      alert(errorMsg(err));
    }
  }

  async function handleRestore(c: Customer) {
    setRestoringId(c.id);
    try {
      await restoreCustomer(c.id);
      loadDeleted();
      load();
    } catch (err) {
      alert(errorMsg(err));
    } finally {
      setRestoringId(null);
    }
  }

  function handleNoteAdded(customerId: string, note: Note) {
    setCustomers((prev) =>
      prev.map((c) =>
        c.id === customerId ? { ...c, notes: [...(c.notes ?? []), note] } : c,
      ),
    );
    setNotesCustomer((prev) =>
      prev?.id === customerId
        ? { ...prev, notes: [...(prev.notes ?? []), note] }
        : prev,
    );
  }

  function handleNoteDeleted(customerId: string, noteId: string) {
    setCustomers((prev) =>
      prev.map((c) =>
        c.id === customerId
          ? { ...c, notes: (c.notes ?? []).filter((n) => n.id !== noteId) }
          : c,
      ),
    );
    setNotesCustomer((prev) =>
      prev?.id === customerId
        ? { ...prev, notes: (prev.notes ?? []).filter((n) => n.id !== noteId) }
        : prev,
    );
  }

  const orgMap = Object.fromEntries(orgs.map((o) => [o.id, o.name]));

  return (
    <div>
      {/* Page header */}
      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.pageTitle}>Customers</h1>
          <p style={styles.pageSubtitle}>
            {isAdmin
              ? `${total} total in your organization`
              : "Your assigned customers"}
          </p>
        </div>
        <button
          style={styles.btnPrimary}
          onClick={() => {
            setEditTarget(undefined);
            setShowForm(true);
          }}
        >
          + New Customer
        </button>
      </div>

      {/* Search */}
      <div style={{ marginBottom: "1.25rem" }}>
        <input
          style={{ ...inp, maxWidth: "340px", fontSize: "0.9rem" }}
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Error */}
      {error && <div style={styles.errorBox}>{error}</div>}

      {/* Table */}
      {loading ? (
        <div style={{ padding: "3rem", textAlign: "center" }}>
          <Spinner />
        </div>
      ) : customers.length === 0 ? (
        <div style={styles.empty}>No customers found.</div>
      ) : (
        <div style={styles.card}>
          <table style={styles.table}>
            <thead>
              <tr>
                {[
                  "Name",
                  "Email",
                  "Phone",
                  isAdmin ? "Organization" : null,
                  "Assigned To",
                  "Notes",
                  "Created",
                  "Actions",
                ]
                  .filter(Boolean)
                  .map((h) => (
                    <th key={h as string} style={styles.th}>
                      {h}
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <Fragment key={c.id}>
                  <tr style={{ ...styles.tr, opacity: c.deletedAt ? 0.55 : 1 }}>
                    <td style={styles.td}>
                      <span style={{ fontWeight: 600, color: "#111827" }}>
                        {c.name}
                      </span>
                      {c.deletedAt && (
                        <>
                          {" "}
                          <Badge label="deleted" color="#dc2626" />
                        </>
                      )}
                    </td>
                    <td style={styles.td}>{c.email}</td>
                    <td style={styles.td}>{c.phone ?? "—"}</td>
                    {isAdmin && (
                      <td style={styles.td}>
                        <span style={styles.orgPill}>
                          {c.organizationId
                            ? (orgMap[c.organizationId] ??
                              c.organizationId.slice(0, 8) + "…")
                            : "—"}
                        </span>
                      </td>
                    )}
                    <td style={styles.td}>
                      {c.user ? (
                        <span style={{ fontSize: "0.85rem" }}>
                          {c.user.name}
                          <br />
                          <span
                            style={{ color: "#9ca3af", fontSize: "0.78rem" }}
                          >
                            {c.user.email}
                          </span>
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td style={styles.td}>
                      <button
                        style={styles.notesBtn}
                        onClick={() => setNotesCustomer(c)}
                      >
                        📝 Notes
                        {(c.notes?.length ?? 0) > 0 && ` (${c.notes!.length})`}
                      </button>
                    </td>
                    <td style={styles.td}>{fmtDate(c.createdAt)}</td>
                    <td style={{ ...styles.td, whiteSpace: "nowrap" }}>
                      {!c.deletedAt ? (
                        <>
                          <button
                            style={styles.actionBtn}
                            onClick={() => {
                              setEditTarget(c);
                              setShowForm(true);
                            }}
                          >
                            Edit
                          </button>
                          {isAdmin && (
                            <button
                              style={{ ...styles.actionBtn, color: "#dc2626" }}
                              onClick={() => handleDelete(c)}
                            >
                              Delete
                            </button>
                          )}
                        </>
                      ) : (
                        isAdmin && (
                          <button
                            style={{ ...styles.actionBtn, color: "#16a34a" }}
                            onClick={() => handleRestore(c)}
                          >
                            Restore
                          </button>
                        )
                      )}
                    </td>
                  </tr>
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination — admin only */}
      {isAdmin && !loading && total > 0 && (
        <div style={styles.paginationBar}>
          {/* Left: result count + per-page selector */}
          <div style={styles.paginationLeft}>
            <span style={styles.paginationInfo}>
              Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)}{" "}
              of {total}
            </span>
            <label style={styles.limitLabel}>
              Per page:
              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                style={styles.limitSelect}
              >
                {[10, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* Right: page controls */}
          <div style={styles.paginationControls}>
            <button
              disabled={page === 1}
              onClick={() => setPage(1)}
              style={{
                ...styles.pageBtn,
                ...(page === 1 ? styles.pageBtnDisabled : {}),
              }}
            >
              «
            </button>
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              style={{
                ...styles.pageBtn,
                ...(page === 1 ? styles.pageBtnDisabled : {}),
              }}
            >
              ‹ Prev
            </button>

            {/* Page number pills */}
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(
                (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1,
              )
              .reduce<(number | "gap")[]>((acc, p, idx, arr) => {
                if (idx > 0 && p - (arr[idx - 1] as number) > 1)
                  acc.push("gap");
                acc.push(p);
                return acc;
              }, [])
              .map((item, idx) =>
                item === "gap" ? (
                  <span key={`gap-${idx}`} style={styles.paginationGap}>
                    …
                  </span>
                ) : (
                  <button
                    key={item}
                    onClick={() => setPage(item as number)}
                    style={{
                      ...styles.pageBtn,
                      ...(item === page ? styles.pageBtnActive : {}),
                    }}
                  >
                    {item}
                  </button>
                ),
              )}

            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
              style={{
                ...styles.pageBtn,
                ...(page === totalPages ? styles.pageBtnDisabled : {}),
              }}
            >
              Next ›
            </button>
            <button
              disabled={page === totalPages}
              onClick={() => setPage(totalPages)}
              style={{
                ...styles.pageBtn,
                ...(page === totalPages ? styles.pageBtnDisabled : {}),
              }}
            >
              »
            </button>
          </div>
        </div>
      )}

      {/* Deleted Customers — admin only */}
      {isAdmin && (
        <div style={styles.deletedSection}>
          <button
            style={styles.deletedToggle}
            onClick={() => setShowDeleted((v) => !v)}
          >
            <span style={styles.deletedToggleIcon}>
              {showDeleted ? "▾" : "▸"}
            </span>
            Deleted Customers
            {deletedTotal > 0 && (
              <span style={styles.deletedBadge}>{deletedTotal}</span>
            )}
          </button>

          {showDeleted && (
            <div style={{ marginTop: "0.75rem" }}>
              {deletedLoading ? (
                <div style={{ padding: "2rem", textAlign: "center" }}>
                  <Spinner />
                </div>
              ) : deletedCustomers.length === 0 ? (
                <p style={styles.deletedEmpty}>No deleted customers.</p>
              ) : (
                <>
                  <div style={styles.card}>
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          {[
                            "Name",
                            "Email",
                            "Phone",
                            "Assigned To",
                            "Deleted At",
                            "Action",
                          ].map((h) => (
                            <th key={h} style={styles.th}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {deletedCustomers.map((c) => (
                          <tr key={c.id} style={{ ...styles.tr, opacity: 0.8 }}>
                            <td style={styles.td}>
                              <span
                                style={{ fontWeight: 600, color: "#374151" }}
                              >
                                {c.name}
                              </span>
                            </td>
                            <td style={styles.td}>{c.email}</td>
                            <td style={styles.td}>{c.phone ?? "—"}</td>
                            <td style={styles.td}>
                              {c.user ? (
                                <span style={{ fontSize: "0.85rem" }}>
                                  {c.user.name}
                                  <br />
                                  <span
                                    style={{
                                      color: "#9ca3af",
                                      fontSize: "0.78rem",
                                    }}
                                  >
                                    {c.user.email}
                                  </span>
                                </span>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td style={styles.td}>
                              {c.deletedAt ? fmtDate(c.deletedAt) : "—"}
                            </td>
                            <td style={styles.td}>
                              <button
                                disabled={restoringId === c.id}
                                onClick={() => handleRestore(c)}
                                style={{
                                  ...styles.restoreBtn,
                                  opacity: restoringId === c.id ? 0.6 : 1,
                                }}
                              >
                                {restoringId === c.id
                                  ? "Restoring…"
                                  : "↩ Restore"}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Deleted pagination */}
                  {deletedTotalPages > 1 && (
                    <div
                      style={{ ...styles.paginationBar, marginTop: "0.75rem" }}
                    >
                      <span style={styles.paginationInfo}>
                        Showing {(deletedPage - 1) * deletedLimit + 1}–
                        {Math.min(deletedPage * deletedLimit, deletedTotal)} of{" "}
                        {deletedTotal} deleted
                      </span>
                      <div style={styles.paginationControls}>
                        <button
                          disabled={deletedPage === 1}
                          onClick={() => setDeletedPage(1)}
                          style={{
                            ...styles.pageBtn,
                            ...(deletedPage === 1
                              ? styles.pageBtnDisabled
                              : {}),
                          }}
                        >
                          «
                        </button>
                        <button
                          disabled={deletedPage === 1}
                          onClick={() => setDeletedPage((p) => p - 1)}
                          style={{
                            ...styles.pageBtn,
                            ...(deletedPage === 1
                              ? styles.pageBtnDisabled
                              : {}),
                          }}
                        >
                          ‹ Prev
                        </button>
                        <span style={styles.paginationInfo}>
                          Page {deletedPage} of {deletedTotalPages}
                        </span>
                        <button
                          disabled={deletedPage === deletedTotalPages}
                          onClick={() => setDeletedPage((p) => p + 1)}
                          style={{
                            ...styles.pageBtn,
                            ...(deletedPage === deletedTotalPages
                              ? styles.pageBtnDisabled
                              : {}),
                          }}
                        >
                          Next ›
                        </button>
                        <button
                          disabled={deletedPage === deletedTotalPages}
                          onClick={() => setDeletedPage(deletedTotalPages)}
                          style={{
                            ...styles.pageBtn,
                            ...(deletedPage === deletedTotalPages
                              ? styles.pageBtnDisabled
                              : {}),
                          }}
                        >
                          »
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Customer form modal */}
      {showForm && auth && (
        <CustomerForm
          initial={editTarget}
          users={users}
          isAdmin={isAdmin}
          onSave={handleSaved}
          onClose={() => {
            setShowForm(false);
            setEditTarget(undefined);
          }}
        />
      )}

      {/* Notes modal  */}
      {notesCustomer && (
        <div style={modal.overlay} onClick={() => setNotesCustomer(null)}>
          <div
            style={{ ...modal.box, maxWidth: "520px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={modal.header}>
              <div>
                <h2 style={modal.title}>Notes</h2>
                <p style={{ margin: 0, fontSize: "0.8rem", color: "#6b7280" }}>
                  {notesCustomer.name}
                </p>
              </div>
              <button
                onClick={() => setNotesCustomer(null)}
                style={modal.closeBtn}
              >
                ✕
              </button>
            </div>
            <div style={{ padding: "1.25rem 1.5rem" }}>
              <NotesPanel
                customer={notesCustomer}
                onNoteAdded={(note) => handleNoteAdded(notesCustomer.id, note)}
                onNoteDeleted={(noteId) =>
                  handleNoteDeleted(notesCustomer.id, noteId)
                }
              />
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const inp: React.CSSProperties = {
  padding: "0.55rem 0.8rem",
  border: "1px solid #d1d5db",
  borderRadius: "7px",
  fontSize: "0.9rem",
  color: "#111827",
  outline: "none",
  width: "100%",
  background: "#fff",
};

const styles: Record<string, React.CSSProperties> = {
  pageHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "1.5rem",
    flexWrap: "wrap",
    gap: "1rem",
  },
  pageTitle: {
    fontSize: "1.5rem",
    fontWeight: 700,
    color: "#111827",
    margin: 0,
  },
  pageSubtitle: {
    fontSize: "0.875rem",
    color: "#6b7280",
    margin: "0.25rem 0 0",
  },
  btnPrimary: {
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    padding: "0.6rem 1.1rem",
    fontSize: "0.9rem",
    fontWeight: 600,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: "0.4rem",
  },
  btnSecondary: {
    background: "#fff",
    color: "#374151",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    padding: "0.6rem 1.1rem",
    fontSize: "0.9rem",
    fontWeight: 500,
    cursor: "pointer",
  },
  card: {
    background: "#fff",
    borderRadius: "10px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
    overflow: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "0.875rem",
  },
  th: {
    padding: "0.75rem 1rem",
    textAlign: "left",
    fontWeight: 600,
    color: "#6b7280",
    fontSize: "0.78rem",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    borderBottom: "1px solid #e5e7eb",
    background: "#f9fafb",
  },
  tr: {
    borderBottom: "1px solid #f3f4f6",
  },
  td: {
    padding: "0.875rem 1rem",
    color: "#374151",
    verticalAlign: "top",
  },
  actionBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#2563eb",
    fontSize: "0.83rem",
    fontWeight: 500,
    padding: "0 0.4rem",
  },
  orgPill: {
    display: "inline-block",
    padding: "2px 10px",
    borderRadius: "6px",
    background: "#f3f4f6",
    color: "#374151",
    fontSize: "0.8rem",
    fontWeight: 500,
  },
  notesBtn: {
    background: "#eff6ff",
    border: "1px solid #bfdbfe",
    borderRadius: "6px",
    cursor: "pointer",
    color: "#2563eb",
    fontSize: "0.8rem",
    fontWeight: 500,
    padding: "0.25rem 0.65rem",
    whiteSpace: "nowrap" as const,
  },
  deletedSection: {
    marginTop: "2rem",
  },
  deletedToggle: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: "0.95rem",
    fontWeight: 600,
    color: "#374151",
    padding: "0.5rem 0",
  },
  deletedToggleIcon: {
    fontSize: "0.75rem",
    color: "#6b7280",
  },
  deletedBadge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#fef2f2",
    color: "#dc2626",
    borderRadius: "999px",
    fontSize: "0.75rem",
    fontWeight: 700,
    padding: "1px 8px",
    border: "1px solid #fecaca",
  },
  deletedEmpty: {
    color: "#9ca3af",
    fontSize: "0.875rem",
    padding: "1rem 0",
  },
  restoreBtn: {
    background: "#f0fdf4",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#bbf7d0",
    borderRadius: "6px",
    cursor: "pointer",
    color: "#16a34a",
    fontSize: "0.83rem",
    fontWeight: 600,
    padding: "0.3rem 0.75rem",
    whiteSpace: "nowrap" as const,
  },
  paginationBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap" as const,
    gap: "0.75rem",
    marginTop: "1.25rem",
    padding: "0.75rem 1rem",
    background: "#fff",
    borderRadius: "10px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
  },
  paginationLeft: {
    display: "flex",
    alignItems: "center",
    gap: "1.25rem",
  },
  paginationInfo: {
    fontSize: "0.85rem",
    color: "#6b7280",
  },
  limitLabel: {
    display: "flex",
    alignItems: "center",
    gap: "0.4rem",
    fontSize: "0.85rem",
    color: "#374151",
  },
  limitSelect: {
    padding: "0.25rem 0.5rem",
    border: "1px solid #d1d5db",
    borderRadius: "5px",
    fontSize: "0.85rem",
    color: "#374151",
    background: "#fff",
    cursor: "pointer",
  },
  paginationControls: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },
  pageBtn: {
    background: "#fff",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#d1d5db",
    borderRadius: "6px",
    padding: "0.35rem 0.7rem",
    cursor: "pointer",
    fontSize: "0.85rem",
    color: "#374151",
    minWidth: "36px",
    textAlign: "center" as const,
  },
  pageBtnActive: {
    background: "#2563eb",
    borderColor: "#2563eb",
    color: "#fff",
    fontWeight: 600,
  },
  pageBtnDisabled: {
    opacity: 0.4,
    cursor: "not-allowed",
    pointerEvents: "none" as const,
  },
  paginationGap: {
    padding: "0.35rem 0.3rem",
    fontSize: "0.85rem",
    color: "#9ca3af",
  },
  errorBox: {
    background: "#fef2f2",
    border: "1px solid #fecaca",
    color: "#dc2626",
    borderRadius: "8px",
    padding: "0.65rem 0.875rem",
    fontSize: "0.875rem",
    marginBottom: "1rem",
  },
  empty: {
    textAlign: "center",
    color: "#9ca3af",
    padding: "3rem",
    fontSize: "0.95rem",
  },
};

const modal: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 50,
    padding: "1rem",
  },
  box: {
    background: "#fff",
    borderRadius: "12px",
    width: "100%",
    maxWidth: "460px",
    boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "1.25rem 1.5rem",
    borderBottom: "1px solid #e5e7eb",
  },
  title: {
    fontSize: "1.1rem",
    fontWeight: 700,
    color: "#111827",
    margin: 0,
  },
  closeBtn: {
    background: "none",
    border: "none",
    fontSize: "1.1rem",
    cursor: "pointer",
    color: "#6b7280",
    padding: "0.25rem",
  },
  form: {
    padding: "1.5rem",
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  actions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "0.75rem",
    marginTop: "0.5rem",
  },
};

const notesStyle: Record<string, React.CSSProperties> = {
  panel: {
    padding: "1rem",
    background: "#f8fafc",
    borderRadius: "8px",
    marginTop: "0.25rem",
  },
  heading: {
    fontWeight: 600,
    fontSize: "0.875rem",
    color: "#374151",
    marginBottom: "0.75rem",
  },
  noteCard: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "6px",
    padding: "0.625rem 0.75rem",
  },
  noteText: {
    fontSize: "0.875rem",
    color: "#374151",
    whiteSpace: "pre-wrap",
    margin: 0,
  },
  noteMeta: {
    fontSize: "0.75rem",
    color: "#9ca3af",
  },
};
