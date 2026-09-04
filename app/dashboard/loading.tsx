export default function DashboardLoading() {
  return (
    <section className="dashboard-content dashboard-loading-content" aria-label="화면 불러오는 중">
      <div className="loading-title loading-block" />
      <div className="loading-subtitle loading-block" />
      <div className="loading-toolbar loading-block" />
      <div className="loading-list">
        {Array.from({ length: 4 }, (_, index) => (
          <div className="loading-row loading-block" key={index} />
        ))}
      </div>
    </section>
  );
}
