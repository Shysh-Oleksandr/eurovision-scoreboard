/**
 * `grid-template-rows` for a section that animates open and shut (a one-row
 * grid whose row goes from 0fr to 1fr).
 *
 * The `minmax(0, …)` matters in WebKit: with a bare `1fr`, the row keeps the
 * height it had before the section got wider, so a lineup that drops from
 * two columns to three leaves an empty band under its tiles (iPhone
 * rotation, a wider Safari window, the apps' Display size). Both forms
 * animate the same in WebKit and Chromium.
 */
export function collapsibleRows(open: boolean): string {
  return open ? 'minmax(0, 1fr)' : 'minmax(0, 0fr)';
}
