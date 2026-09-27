/** A submit handler that keeps the browser from reloading the page. */
export function onSubmit(handler: () => void): (event: {preventDefault: () => void}) => void {
  return event => {
    event.preventDefault();
    handler();
  };
}
