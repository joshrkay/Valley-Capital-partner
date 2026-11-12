// The pages that make up each audience section. The sub-navigation bar and the "In this section" cards on each overview page read from here.
export interface SectionPage {
  href: string;
  title: string;          // short label for the sub-navigation bar
  summary: string;        // one sentence for the overview card
}
export interface AudienceSection {
  label: string;
  pages: SectionPage[];   // the first entry is the overview
}

export const SECTIONS: Record<'banks' | 'receivers', AudienceSection> = {
  banks: {
    label: 'For banks',
    pages: [
      { href: '/banks/', title: 'Overview', summary: 'A buyer for the hotel loan on your problem list.' },
      { href: '/banks/why-banks-sell/', title: 'Why banks sell', summary: 'The burden of a hotel workout, and how a note sale compares with extending, foreclosing, and a discounted payoff.' },
      { href: '/banks/what-we-buy/', title: 'What we buy', summary: 'Acquisition criteria, the situations we are asked to look at, and the collateral we cover.' },
      { href: '/banks/how-a-sale-works/', title: 'How a sale works', summary: 'Six steps from a confidentiality agreement to funds wired, and what each side provides.' },
      { href: '/banks/information-to-send/', title: 'What to send', summary: 'A one-page summary starts the conversation; a complete file shortens the time to closing.' },
      { href: '/banks/confidentiality/', title: 'Confidentiality', summary: 'How a bank\'s information is handled, and what we do not do with it.' },
      { href: '/banks/faq/', title: 'FAQ', summary: 'Short answers to the questions credit officers ask.' },
    ],
  },
  receivers: {
    label: 'For receivers and counsel',
    pages: [
      { href: '/receivers/', title: 'Overview', summary: 'A buyer for hotels in receivership.' },
      { href: '/receivers/buying-from-a-receiver/', title: 'Buying from a receiver', summary: 'How we bid in a form a court can approve, and how a receiver\'s sale usually runs.' },
      { href: '/receivers/keeping-the-hotel-open/', title: 'Keeping the hotel open', summary: 'What we handle so the hotel does not miss a night: franchise, management, licenses, bookings, staff, and taxes.' },
      { href: '/receivers/for-lenders-counsel/', title: 'For lenders\' counsel', summary: 'When the lender would prefer to sell the loan with the receivership in place.' },
      { href: '/receivers/what-we-ask-for/', title: 'What we ask for', summary: 'The information that lets us respond to a receiver or counsel.' },
      { href: '/receivers/faq/', title: 'FAQ', summary: 'Short answers to the questions receivers and counsel ask.' },
    ],
  },
};
