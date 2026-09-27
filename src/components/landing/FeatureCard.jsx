export default function FeatureCard({ icon: Icon, title, text, detail }) {
  return (
    <article className="feature">
      <div className="feature-icon">
        <Icon aria-hidden="true" />
      </div>
      <h3>{title}</h3>
      <p>{text}</p>
      {detail && <span className="feature-detail">{detail}</span>}
    </article>
  );
}
