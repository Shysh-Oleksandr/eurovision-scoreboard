// Runs after the HTML loads and before React hydrates (Next.js), so the DOM
// patches are in place before React touches the page.
import {
  installDomResilience,
  reportDomRepair,
} from '@/helpers/translationResilience';

installDomResilience(reportDomRepair);
