import { useCallback, useMemo, useState } from 'react';
import { Megaphone, RefreshCw, Search, Send, Undo2 } from 'lucide-react';
import { describeApiError } from '../../../services/api';
import { fetchAnnouncements, publishAnnouncement, type LiveAnnouncement } from '../../../services/announcements';
import { Badge, ConsolePage, EmptyState, ErrorNote, Kpi, Loading, Notes, PageHeader, Panel, Table, Toolbar } from './kit';
import { humanise, matches, unique, useRegistry } from './registry';

const AUDIENCES: { value: string; label: string }[] = [
  { value: 'all', label: 'Every portal' },
  { value: 'students', label: 'Students' },
  { value: 'teachers', label: 'Faculty' },
  { value: 'admins', label: 'Administrators' },
];

const CATEGORIES = ['General', 'Urgent', 'Events'];

/** `students` -> `Students`, and the audience the reader actually receives it. */
const audienceLabel = (value: string): string => AUDIENCES.find((entry) => entry.value === value)?.label ?? humanise(value);

/**
 * The campus bulletin board.
 *
 * A bulletin is stored once, in `announcements`, with the audience it targets —
 * so publishing here puts it in front of those readers immediately, on every
 * portal. The design's delivery percentages and open rates are absent: this
 * portal does not track reads, and it will not estimate them.
 */
export const AnnouncementsPage = ({ onNotify }: { onNotify: (message: string) => void }) => {
  // The public read returns the callers' own audience plus the campus-wide ones,
  // so the register asks for each audience and merges: an administrator sees all.
  const load = useCallback(async () => {
    const batches = await Promise.all(AUDIENCES.map((audience) => fetchAnnouncements(audience.value)));
    const byId = new Map<string, LiveAnnouncement>();
    for (const row of batches.flat()) byId.set(String(row.id), row);
    return [...byId.values()].sort((a, b) => String(b.published_at ?? '').localeCompare(String(a.published_at ?? '')));
  }, []);
  const { rows, error, loading, reload } = useRegistry<LiveAnnouncement>(load, 'Reading the campus bulletins');

  const [term, setTerm] = useState('');
  const [audience, setAudience] = useState('');
  const [category, setCategory] = useState('');
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState({ title: '', content: '', audience: 'all', category: 'General' });
  const [publishing, setPublishing] = useState(false);

  const categories = useMemo(() => unique((rows ?? []).map((row) => row.category)), [rows]);
  const audiences = useMemo(() => unique((rows ?? []).map((row) => row.audience)), [rows]);

  const shown = useMemo(
    () =>
      (rows ?? []).filter(
        (row) =>
          matches(term, row.title, row.content, row.published_by_name) &&
          (audience ? row.audience === audience : true) &&
          (category ? row.category === category : true),
      ),
    [rows, term, audience, category],
  );

  const publish = async () => {
    if (!draft.title.trim() || !draft.content.trim()) {
      onNotify('A bulletin needs both a subject and its details');
      return;
    }
    setPublishing(true);
    try {
      const created = await publishAnnouncement({
        title: draft.title.trim(),
        content: draft.content.trim(),
        audience: draft.audience,
        category: draft.category,
      });
      onNotify(`“${created.title}” published to ${audienceLabel(created.audience).toLowerCase()}`);
      setDraft({ title: '', content: '', audience: 'all', category: 'General' });
      setComposing(false);
      await reload();
    } catch (failure) {
      onNotify(describeApiError(failure, 'Publishing the bulletin'));
    } finally {
      setPublishing(false);
    }
  };

  const latest = (rows ?? [])[0];

  return (
    <ConsolePage>
      <PageHeader
        crumb={['Registrar console', 'Communications']}
        title="Announcements"
        subtitle="Bulletins published to the portals. Publishing here is publishing for real — every reader whose audience matches sees it immediately."
        actions={
          <>
            <button type="button" className="ac-btn" onClick={() => setComposing((value) => !value)}>
              <Megaphone aria-hidden="true" />
              {composing ? 'Close composer' : 'New announcement'}
            </button>
            <button type="button" className="ac-btn ac-btn--ghost" onClick={() => void reload()} disabled={loading}>
              <RefreshCw aria-hidden="true" />
              Refresh
            </button>
          </>
        }
      />

      {error ? <ErrorNote message={error} onRetry={() => void reload()} /> : null}

      <div className="ac-kpis">
        <Kpi label="Published bulletins" value={rows === null ? '—' : rows.length.toLocaleString()} hint="live on the portals" tone={rows && rows.length === 0 ? 'empty' : 'default'} />
        <Kpi label="Audiences targeted" value={rows === null ? '—' : audiences.length.toLocaleString()} hint="who receives them" tone="default" />
        <Kpi label="Categories in use" value={rows === null ? '—' : categories.length.toLocaleString()} hint="general, urgent, events" tone="default" />
        <Kpi label="Most recent" value={<span style={{ fontSize: 15 }}>{latest ? latest.title.slice(0, 34) + (latest.title.length > 34 ? '…' : '') : '—'}</span>} hint="newest bulletin" tone={latest ? 'default' : 'empty'} />
      </div>

      {composing ? (
        <Panel title="Compose a bulletin" subtitle="It is stored and published the moment you send it.">
          <div style={{ display: 'grid', gap: 12 }}>
            <label className="ac-field">
              <span>Subject</span>
              <input
                className="ac-input"
                placeholder="e.g. Midterm grade portal closes on 28 March"
                value={draft.title}
                onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                aria-label="Bulletin subject"
              />
            </label>
            <label className="ac-field">
              <span>Details</span>
              <textarea
                className="ac-input"
                rows={4}
                placeholder="What the reader needs to do, and by when."
                value={draft.content}
                onChange={(event) => setDraft({ ...draft, content: event.target.value })}
                aria-label="Bulletin details"
              />
            </label>
            <div className="ac-actions">
              <label className="ac-field">
                <span>Audience</span>
                <select
                  className="ac-select"
                  value={draft.audience}
                  onChange={(event) => setDraft({ ...draft, audience: event.target.value })}
                  aria-label="Bulletin audience"
                >
                  {AUDIENCES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="ac-field">
                <span>Category</span>
                <select
                  className="ac-select"
                  value={draft.category}
                  onChange={(event) => setDraft({ ...draft, category: event.target.value })}
                  aria-label="Bulletin category"
                >
                  {CATEGORIES.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <button type="button" className="ac-btn" onClick={() => void publish()} disabled={publishing} style={{ marginTop: 18 }}>
                <Send aria-hidden="true" />
                {publishing ? 'Publishing…' : 'Publish bulletin'}
              </button>
              <button type="button" className="ac-btn ac-btn--ghost" onClick={() => setComposing(false)} style={{ marginTop: 18 }}>
                <Undo2 aria-hidden="true" />
                Cancel
              </button>
            </div>
          </div>
        </Panel>
      ) : null}

      <Panel title="Bulletin register" subtitle={`Showing ${shown.length} of ${rows?.length ?? 0} published bulletins.`} flush>
        <Toolbar>
          <label className="ac-field ac-search">
            <span className="ac-muted">
              <Search aria-hidden="true" style={{ width: 12, height: 12, verticalAlign: '-1px' }} /> Search
            </span>
            <input
              className="ac-input"
              placeholder="Subject, details or publisher"
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              aria-label="Search bulletins"
            />
          </label>
          <label className="ac-field">
            <span>Audience</span>
            <select className="ac-select" value={audience} onChange={(event) => setAudience(event.target.value)} aria-label="Filter by audience">
              <option value="">Every audience</option>
              {audiences.map((option) => (
                <option key={option} value={option}>
                  {audienceLabel(option)}
                </option>
              ))}
            </select>
          </label>
          <label className="ac-field">
            <span>Category</span>
            <select className="ac-select" value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Filter by category">
              <option value="">All categories</option>
              {categories.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </Toolbar>

        {loading && !rows ? (
          <Loading label="Reading the campus bulletins…" />
        ) : !rows ? (
          <EmptyState title="Register unreadable" message="The bulletin register could not be read just now. Try again — nothing has been changed." />
        ) : shown.length === 0 ? (
          <EmptyState
            title={rows.length === 0 ? 'No bulletins published yet' : 'No bulletins match these filters'}
            message={
              rows.length === 0
                ? 'Nothing has been announced. A bulletin published here appears on the portals of everyone in its audience.'
                : 'Adjust the search or filters to widen the result set.'
            }
          />
        ) : (
          <Table head={['Subject', 'Audience', 'Category', 'Published by', 'Published', 'Status']}>
            {shown.map((row) => (
              <tr key={row.id}>
                <td style={{ maxWidth: 460 }}>
                  <span className="ac-cell-stack">
                    <span className="ac-strong">{row.title}</span>
                    <span className="ac-muted">{row.content.length > 150 ? `${row.content.slice(0, 150)}…` : row.content}</span>
                  </span>
                </td>
                <td>
                  <Badge tone={row.audience === 'all' ? 'default' : 'muted'}>{audienceLabel(row.audience)}</Badge>
                </td>
                <td>{row.category ?? 'General'}</td>
                <td>{row.published_by_name?.trim() || 'Not attributed'}</td>
                <td className="ac-muted">{row.published_at ? new Date(row.published_at).toLocaleString() : '—'}</td>
                <td>
                  <Badge tone="ok">Published</Badge>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Panel>

      <Notes>
        <strong>On the design's delivery figures.</strong> The design tracks open rates, delivery percentages and live viewer counts.
        This portal publishes a bulletin and stops there — it keeps no read receipts, so those columns are absent rather than estimated.
      </Notes>
    </ConsolePage>
  );
};
