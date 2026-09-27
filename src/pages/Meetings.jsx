import { useMemo, useState } from 'react';
import { FiPlus, FiTrash2, FiClock, FiMapPin, FiX, FiCheck, FiCalendar } from 'react-icons/fi';
import PageHeader from '../components/dashboard/PageHeader.jsx';
import StatsCard from '../components/dashboard/StatsCard.jsx';
import { Modal, EmptyState, Segmented, Avatar } from '../components/ui/index.jsx';
import { CHILDREN, TODAY, isoDay, addDays } from '../data/mock.js';
import { useApp } from '../context/AppContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';

const hhmm = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
const dayKey = (d) => isoDay(d);

function groupByDay(list) {
  const out = [];
  for (const m of list) {
    const k = dayKey(m.date);
    const g = out.find((x) => x.k === k);
    if (g) g.items.push(m);
    else out.push({ k, date: m.date, items: [m] });
  }
  return out;
}

/* ---------- Teacher: open and manage slots ---------- */
function TeacherMeetings() {
  const { meetings, addSlots, removeSlot, cancelBooking, toast } = useApp();
  const { user } = useAuth();
  const { t, fmtDate } = useI18n();
  const [form, setForm] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const now = new Date();
  const mine = meetings.filter((m) => m.teacherId === user.id && m.date >= addDays(TODAY, -1));
  const booked = mine.filter((m) => m.bookedBy);
  const upcomingFree = mine.filter((m) => !m.bookedBy && m.date > now);

  const create = async () => {
    const { date, start, count, duration, location } = form;
    const [h, mi] = start.split(':').map(Number);
    const first = new Date(`${date}T00:00:00`);
    first.setHours(h, mi, 0, 0);
    if (first <= now) return setForm({ ...form, error: t('meetings.errPast') });
    const slots = Array.from({ length: count }, (_, i) => ({ startsAt: new Date(first.getTime() + i * duration * 60000).toISOString(), duration, location: location.trim() }));
    const ok = await addSlots(slots);
    setForm(null);
    if (ok !== false) toast(t('meetings.created', { n: count }));
  };

  return (
    <div className="page">
      <PageHeader
        title={t('meetings.title')}
        description={t('meetings.subTeacher')}
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setForm({ date: isoDay(addDays(TODAY, 7)), start: '15:00', count: 6, duration: 10, location: 'B204', error: '' })}>
            <FiPlus /> {t('meetings.open')}
          </button>
        }
      />
      <div className="stats-grid stats-grid-3">
        <StatsCard icon={FiCalendar} label={t('meetings.statSlots')} value={mine.filter((m) => m.date > now).length} />
        <StatsCard icon={FiCheck} label={t('meetings.statBooked')} value={booked.filter((m) => m.date > now).length} />
        <StatsCard icon={FiClock} label={t('meetings.statFree')} value={upcomingFree.length} />
      </div>
      <section className="panel">
        <div className="panel-head">
          <div>
            <h3>{t('meetings.mySlots')}</h3>
            <p>{t('meetings.mySlotsSub')}</p>
          </div>
        </div>
        <div className="panel-body flush">
          {mine.length === 0 ? (
            <EmptyState icon={FiCalendar} title={t('meetings.noSlots')} text={t('meetings.noSlotsText')} />
          ) : (
            groupByDay(mine).map((g) => (
              <div key={g.k} className="slot-day">
                <h4 className="slot-day-title">{fmtDate(g.date, { weekday: 'long', day: 'numeric', month: 'long', cap: true })}</h4>
                <ul className="slot-list">
                  {g.items.map((m) => (
                    <li key={m.id} className={`slot ${m.bookedBy ? 'is-booked' : ''} ${m.date < now ? 'is-past' : ''}`}>
                      <span className="slot-time num">
                        {hhmm(m.date)}
                        <em>{m.duration} {t('meetings.min')}</em>
                      </span>
                      <span className="slot-main">
                        {m.bookedBy ? (
                          <>
                            <strong>{m.bookedName}</strong>
                            <span>
                              {m.child}
                              {m.note ? ` · ${m.note}` : ''}
                            </span>
                          </>
                        ) : (
                          <span className="t-muted">{t('meetings.free')}</span>
                        )}
                      </span>
                      {m.location && (
                        <span className="slot-loc">
                          <FiMapPin aria-hidden="true" /> {m.location}
                        </span>
                      )}
                      <span className="slot-actions">
                        {m.bookedBy && m.date > now && (
                          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirm({ type: 'cancel', m })}>
                            {t('meetings.freeSlot')}
                          </button>
                        )}
                        <button type="button" className="btn btn-ghost btn-icon btn-sm" aria-label={t('meetings.delete')} onClick={() => (m.bookedBy ? setConfirm({ type: 'delete', m }) : removeSlot(m.id))}>
                          <FiTrash2 />
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
      </section>

      <Modal
        open={!!form}
        onClose={() => setForm(null)}
        title={t('meetings.open')}
        description={t('meetings.openDesc')}
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setForm(null)}>
              {t('common.cancel')}
            </button>
            <button type="button" className="btn btn-primary" onClick={create}>
              {t('meetings.create', { n: form?.count || 0 })}
            </button>
          </>
        }
      >
        {form && (
          <>
            <div className="form-row">
              <div className="field">
                <label className="label" htmlFor="mt-date">
                  {t('gradebook.date')}
                </label>
                <input id="mt-date" type="date" className="input" min={isoDay(TODAY)} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value || form.date, error: '' })} />
              </div>
              <div className="field">
                <label className="label" htmlFor="mt-start">
                  {t('meetings.start')}
                </label>
                <input id="mt-start" type="time" className="input" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value || form.start, error: '' })} />
              </div>
            </div>
            <div className="form-row">
              <div className="field">
                <label className="label" htmlFor="mt-count">
                  {t('meetings.count')}
                </label>
                <select id="mt-count" className="input select-native" value={form.count} onChange={(e) => setForm({ ...form, count: Number(e.target.value) })}>
                  {[1, 2, 3, 4, 5, 6, 8, 10, 12].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label className="label" htmlFor="mt-dur">
                  {t('meetings.duration')}
                </label>
                <select id="mt-dur" className="input select-native" value={form.duration} onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })}>
                  {[10, 15, 20, 30].map((n) => (
                    <option key={n} value={n}>
                      {n} {t('meetings.min')}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="field">
              <label className="label" htmlFor="mt-loc">
                {t('meetings.location')}
              </label>
              <input id="mt-loc" className="input" maxLength={60} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>
            {form.error && <span className="field-error">{form.error}</span>}
          </>
        )}
      </Modal>

      <Modal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title={confirm?.type === 'delete' ? t('meetings.deleteTitle') : t('meetings.freeTitle')}
        description={confirm ? t('meetings.bookedWarn', { name: confirm.m.bookedName }) : ''}
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setConfirm(null)}>
              {t('common.cancel')}
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => {
                if (confirm.type === 'delete') removeSlot(confirm.m.id);
                else cancelBooking(confirm.m.id);
                setConfirm(null);
              }}
            >
              {confirm?.type === 'delete' ? t('meetings.delete') : t('meetings.freeSlot')}
            </button>
          </>
        }
      />
    </div>
  );
}

/* ---------- Parent: book a slot ---------- */
function ParentMeetings() {
  const { meetings, bookSlot, cancelBooking, toast } = useApp();
  const { user } = useAuth();
  const { t, fmtDate } = useI18n();
  const [childId, setChildId] = useState('alex');
  const [booking, setBooking] = useState(null); // { m, note }
  const now = new Date();
  const child = CHILDREN.find((c) => c.id === childId);
  const mine = meetings.filter((m) => m.bookedBy === user.id && m.date > addDays(TODAY, -1));
  const free = meetings.filter((m) => !m.bookedBy && m.date > now);
  const teachers = useMemo(() => {
    const map = new Map();
    for (const m of free) {
      const g = map.get(m.teacherId) || { id: m.teacherId, name: m.teacherName, slots: [] };
      g.slots.push(m);
      map.set(m.teacherId, g);
    }
    return [...map.values()];
  }, [free]);

  const book = async () => {
    const ok = await bookSlot(booking.m.id, { child: child.full, note: booking.note.trim() });
    setBooking(null);
    toast(ok === false ? t('meetings.taken') : t('meetings.booked', { time: hhmm(booking.m.date), date: fmtDate(booking.m.date, { day: 'numeric', month: 'long' }) }));
  };

  return (
    <div className="page">
      <PageHeader title={t('meetings.title')} description={t('meetings.subParent')} />
      <section className="panel">
        <div className="panel-head">
          <div>
            <h3>{t('meetings.myBookings')}</h3>
          </div>
        </div>
        <div className="panel-body">
          {mine.length === 0 ? (
            <p className="muted-note">{t('meetings.noBookings')}</p>
          ) : (
            <ul className="booking-list">
              {mine.map((m) => (
                <li key={m.id}>
                  <Avatar name={m.teacherName} size={34} />
                  <span className="booking-main">
                    <strong>{m.teacherName}</strong>
                    <span className="num">
                      {fmtDate(m.date, { weekday: 'short', day: 'numeric', month: 'long', cap: true })} · {hhmm(m.date)} · {m.duration} {t('meetings.min')}
                      {m.location ? ` · ${m.location}` : ''}
                    </span>
                    <em>{m.child}</em>
                  </span>
                  {m.date > now && (
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => cancelBooking(m.id).then(() => toast(t('meetings.cancelled')))}>
                      <FiX /> {t('meetings.cancel')}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h3>{t('meetings.freeSlots')}</h3>
            <p>{t('meetings.freeSlotsSub')}</p>
          </div>
          <Segmented label={t('dash.parent.selectChild')} value={childId} onChange={setChildId} options={CHILDREN.map((c) => ({ value: c.id, label: c.name }))} />
        </div>
        <div className="panel-body">
          {teachers.length === 0 ? (
            <EmptyState icon={FiCalendar} title={t('meetings.noFree')} text={t('meetings.noFreeText')} />
          ) : (
            teachers.map((g) => (
              <div key={g.id} className="teacher-slots">
                <div className="teacher-slots-head">
                  <Avatar name={g.name} size={30} />
                  <strong>{g.name}</strong>
                </div>
                {groupByDay(g.slots).map((d) => (
                  <div key={d.k} className="slot-chips-row">
                    <span className="slot-chips-day">{fmtDate(d.date, { weekday: 'short', day: 'numeric', month: 'short', cap: true })}</span>
                    <div className="slot-chips">
                      {d.items.map((m) => (
                        <button key={m.id} type="button" className="slot-chip num" onClick={() => setBooking({ m, note: '' })}>
                          {hhmm(m.date)}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </section>

      <Modal
        open={!!booking}
        onClose={() => setBooking(null)}
        title={t('meetings.bookTitle')}
        description={booking ? `${booking.m.teacherName} · ${fmtDate(booking.m.date, { weekday: 'long', day: 'numeric', month: 'long', cap: true })} · ${hhmm(booking.m.date)}` : ''}
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setBooking(null)}>
              {t('common.cancel')}
            </button>
            <button type="button" className="btn btn-primary" onClick={book}>
              {t('meetings.book')}
            </button>
          </>
        }
      >
        {booking && (
          <>
            <p className="hint">{t('meetings.forChild', { name: child.full })}</p>
            <div className="field">
              <label className="label" htmlFor="mt-note">
                {t('meetings.topic')}
              </label>
              <textarea id="mt-note" className="input textarea" rows={3} maxLength={500} value={booking.note} onChange={(e) => setBooking({ ...booking, note: e.target.value })} placeholder={t('meetings.topicPh')} />
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}

/* ---------- School admin: overview ---------- */
function AdminMeetings() {
  const { meetings } = useApp();
  const { t, fmtDate } = useI18n();
  const upcoming = meetings.filter((m) => m.date > new Date());
  return (
    <div className="page">
      <PageHeader title={t('meetings.title')} description={t('meetings.subAdmin')} />
      <div className="stats-grid stats-grid-3">
        <StatsCard icon={FiCalendar} label={t('meetings.statSlots')} value={upcoming.length} />
        <StatsCard icon={FiCheck} label={t('meetings.statBooked')} value={upcoming.filter((m) => m.bookedBy).length} />
        <StatsCard icon={FiClock} label={t('meetings.statFree')} value={upcoming.filter((m) => !m.bookedBy).length} />
      </div>
      <section className="panel">
        <div className="panel-body flush">
          {upcoming.length === 0 ? (
            <EmptyState icon={FiCalendar} title={t('meetings.noFree')} />
          ) : (
            <div className="table-wrap">
              <table className="table table-cards">
                <thead>
                  <tr>
                    <th>{t('meetings.when')}</th>
                    <th>{t('timetable.teacher')}</th>
                    <th>{t('meetings.parent')}</th>
                    <th>{t('meetings.location')}</th>
                  </tr>
                </thead>
                <tbody>
                  {upcoming.map((m) => (
                    <tr key={m.id}>
                      <td data-label={t('meetings.when')} className="num">
                        {fmtDate(m.date, { weekday: 'short', day: 'numeric', month: 'short', cap: true })} · {hhmm(m.date)}
                      </td>
                      <td data-label={t('timetable.teacher')}>{m.teacherName}</td>
                      <td data-label={t('meetings.parent')}>{m.bookedBy ? `${m.bookedName} · ${m.child}` : <span className="t-muted">{t('meetings.free')}</span>}</td>
                      <td data-label={t('meetings.location')}>{m.location || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default function Meetings() {
  const { role } = useApp();
  if (role === 'teacher') return <TeacherMeetings />;
  if (role === 'parent') return <ParentMeetings />;
  return <AdminMeetings />;
}
