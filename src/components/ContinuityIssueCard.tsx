export function ContinuityIssueCard({
  title,
  text,
  severity,
}: {
  title: string;
  text: string;
  severity: string;
}) {
  return (
    <article className="issue-card">
      <p className="panel-kicker">Fictional example · {severity}</p>
      <h3>{title}</h3>
      <p>{text}</p>
    </article>
  );
}
