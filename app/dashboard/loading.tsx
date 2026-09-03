export default function DashboardLoading() {
  return (
    <main className="teacher-dashboard dashboard-loading" aria-label="대시보드 불러오는 중">
      <aside className="dashboard-sidebar loading-sidebar" aria-hidden="true">
        <div className="loading-brand loading-block" />
        <div className="loading-create loading-block" />
        <div className="loading-nav">
          {Array.from({ length: 6 }, (_, index) => (
            <div className="loading-nav-item loading-block" key={index} />
          ))}
        </div>
      </aside>
      <section className="dashboard-main">
        <div className="dashboard-content">
          <div className="loading-title loading-block" />
          <div className="loading-subtitle loading-block" />
          <div className="loading-toolbar loading-block" />
          <div className="loading-list">
            {Array.from({ length: 4 }, (_, index) => (
              <div className="loading-row loading-block" key={index} />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
