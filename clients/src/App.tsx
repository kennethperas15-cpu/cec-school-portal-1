export const App = () => {
  return (
    <main style={{ minHeight: '100vh', background: '#f4f7fb', padding: '40px', fontFamily: 'Arial, sans-serif', color: '#17324d' }}>
      <section style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <p style={{ color: '#0b3d91', fontWeight: 700, letterSpacing: '0.08em' }}>CEC SCHOOL PORTAL</p>
        <h1 style={{ fontSize: '36px', margin: '8px 0' }}>Student Academic Overview</h1>
        <p style={{ color: '#60758a' }}>Welcome back, Alex. Here is your current academic progress.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px', marginTop: '28px' }}>
          {[
            ['Current GPA', '91.4%', '#0b3d91'],
            ['Attendance', '96%', '#168a62'],
            ['Completed Units', '18 / 24', '#d87921'],
          ].map(([label, value, color]) => (
            <article key={label} style={{ background: '#fff', borderRadius: '14px', padding: '22px', boxShadow: '0 6px 20px #17324d12', borderTop: `4px solid ${color}` }}>
              <p style={{ margin: 0, color: '#60758a' }}>{label}</p>
              <strong style={{ display: 'block', fontSize: '30px', marginTop: '10px', color }}>{value}</strong>
            </article>
          ))}
        </div>
        <section style={{ background: '#fff', borderRadius: '14px', padding: '24px', marginTop: '24px', boxShadow: '0 6px 20px #17324d12' }}>
          <h2 style={{ marginTop: 0 }}>Academic Records</h2>
          {['Grades and Report Card', 'Class Timetable', 'Attendance History', 'Curriculum Checklist'].map((item) => (
            <div key={item} style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 0', borderBottom: '1px solid #e7edf3' }}>
              <span>{item}</span><span style={{ color: '#0b3d91', fontWeight: 700 }}>View details {'>'}</span>
            </div>
          ))}
        </section>
      </section>
    </main>
  );
};