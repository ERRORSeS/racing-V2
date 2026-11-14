# Breeding form selection and feedback

Mare/stallion changes rerendered the page without retaining service and semen-dose selections. All four values now survive pair changes, method changes and other page rerenders. Starting/importing/restoring a career clears stale selections. The selected-parent preview uses the same available parent pools as the dropdowns.

The form and engine share the service rejection rules, including registry, dose, travel and fee requirements. Failed or successful submissions now show their message beside the button and bring it into view. A successful covering is explicitly unconfirmed until a veterinary scan. Mature active mares retain the working retirement action; rebooking, medical, age and pedigree restrictions remain enforced.

The mating form comes before the owner's pregnancy table. The NPC covered/pregnant-mares table has been removed from the Stud screen; this display change does not delete horse or pregnancy records.

Validation: all 30 V8 reproductive tests passed; production build passed. Browser regressions cover visible natural-service travel rejection, service/dose persistence across mare changes, successful alternative frozen covering with one dose consumed, save/reload and absence of the NPC table. Existing browser workflows also pass owned and NPC natural service, actual day-15 scan confirmation and reload.
