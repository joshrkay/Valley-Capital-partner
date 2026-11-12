// The pages that make up each audience section. The sub-navigation bar and the "In this section" cards on each overview page read from here.
export interface SectionPage {
  href: string;
  title: string;          // short label for the sub-navigation bar
  summary: string;        // one sentence for the overview card
}
export interface AudienceSection {
  label: string;
  pages: SectionPage[];   // the first entry is the overview
  back?: SectionPage;     // a link up to the parent section, shown first in the sub-navigation
}

export const SECTIONS: Record<'banks' | 'communityBanks' | 'receivers', AudienceSection> = {
  banks: {
    label: 'For banks',
    pages: [
      { href: '/banks/', title: 'Overview', summary: 'A buyer for the hotel loan on your problem list.' },
      { href: '/banks/why-banks-sell/', title: 'Why banks sell', summary: 'The burden of a hotel workout, and how a loan sale compares with extending, foreclosing, and a discounted payoff.' },
      { href: '/banks/what-we-buy/', title: 'What we buy', summary: 'Acquisition criteria, the situations we are asked to look at, and the collateral we cover.' },
      { href: '/banks/how-a-sale-works/', title: 'How a sale works', summary: 'Six steps from a confidentiality agreement to funds wired, and what each side provides.' },
      { href: '/banks/community-banks/', title: 'Community banks', summary: 'The deep dive: who is in the room at a community bank, what each of them needs to hear, and how a loan sale looks from the credit committee, the CFO, the board, and the examiner.' },
      { href: '/banks/information-to-send/', title: 'What to send', summary: 'A one-page summary starts the conversation; a complete file shortens the time to closing.' },
      { href: '/banks/confidentiality/', title: 'Confidentiality', summary: 'How a bank\'s information is handled, and what we do not do with it.' },
      { href: '/banks/faq/', title: 'FAQ', summary: 'Short answers to the questions credit officers ask.' },
    ],
  },
  communityBanks: {
    label: 'For community banks',
    back: { href: '/banks/', title: 'Banks', summary: '' },
    pages: [
      { href: '/banks/community-banks/', title: 'Overview', summary: 'The position a community bank is in with a problem hotel loan.' },
      { href: '/banks/community-banks/the-loan-summary/', title: 'The loan summary', summary: 'How a community bank presents a problem loan: thirteen headings in the words credit officers already use.' },
      { href: '/banks/community-banks/who-is-in-the-room/', title: 'Who is in the room', summary: 'What the lender, special assets, the CFO, the president, the board, and counsel each need to hear.' },
      { href: '/banks/community-banks/hotels-for-bankers/', title: 'Hotels for bankers', summary: 'Seven things to understand before you read an operating statement or answer a franchise notice.' },
      { href: '/banks/community-banks/situations/', title: 'Situations', summary: 'Six situations community banks bring us, and what the bank is weighing in each.' },
      { href: '/banks/community-banks/board-package/', title: 'Loan committee and board', summary: 'What the memo should cover when a loan sale goes to committee, with a recovery comparison.' },
      { href: '/banks/community-banks/examiners-and-reserves/', title: 'Examiners and reserves', summary: 'How a sale shows up in the bank\'s numbers, and what supervisors tend to want to see.' },
      { href: '/banks/community-banks/borrower-relationship/', title: 'The borrower relationship', summary: 'When the owner is a customer and a neighbor: how to handle it, and when a sale is not the answer.' },
      { href: '/banks/community-banks/extensions/', title: 'When to stop extending', summary: 'What an extension costs that does not show in the rate, and five questions to ask before the next one.' },
      { href: '/banks/community-banks/participations-and-guarantees/', title: 'Participations and guarantees', summary: 'What to sort out early when the loan has participants or a government guarantee.' },
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
