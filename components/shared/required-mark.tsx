/** Red asterisk after a required field's label. Visual only: the input's `required` already tells assistive tech. */
export function RequiredMark() {
  return (
    <span aria-hidden className="ml-0.5 text-destructive">
      *
    </span>
  );
}
