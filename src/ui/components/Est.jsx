/** Small "est." marker for a value that is an estimate, not a sourced number (profile.estimates[]). */
export default function Est({ show = true }) {
  if (!show) return null;
  return (
    <abbr className="est" title="Estimate, see Sources" aria-label="estimate">
      est.
    </abbr>
  );
}

