# Statements for counsel to check

The blog posts explain how hotel loan workouts work. They were written from the site's own pages and general knowledge, with no outside sources, and they cite no law. Each statement below is one the writers believed was accurate general practice but could not support. Every one is already hedged in the post ("usually", "may", "depends on the documents and the state"). The README requires a qualified reader to read the posts before launch; this list is where that reader should start.

**How to use it:** open the post, find the sentence, and confirm that it is accurate as a general statement, that its hedge is strong enough, or that it should be cut. Changing a post is fine: run `npm run desk:lint -- <file>` afterward, because every published post must stay between 500 and 800 words.

## Published posts

### Discounted payoffs on hotel loans
`src/content/blog/discounted-payoffs-on-hotel-loans.md`
- A payoff letter states the amount due and the date through which it holds, and the lien release should take effect only when funds arrive.
- Releases of the borrower, of guarantors, and of claims against the lender are negotiated points, and the structure (a payoff versus a note sale) changes what happens to the guaranty and the lien.

### Foreclosure timelines and why they matter more for hotels
`src/content/blog/foreclosure-timelines-and-hotel-value.md`
- A borrower's bankruptcy filing usually pauses enforcement, the lender may need the court's permission to continue, and a filing can complicate a receivership already in place.
- In a non-judicial state a lender usually follows steps set by statute and the loan documents (notice, a waiting period, a public sale) without filing a lawsuit.
- A receiver cannot give the lender title, end the case, or fund a hotel that has no cash.
- Whether a right to redeem after a sale delays clean title, and whether a shortfall can be pursued afterward, appear only as questions for local counsel.

### Ground leases in hotel loan workouts
`src/content/blog/ground-leases-in-hotel-loan-workouts.md`
- If the land is mortgaged and the ground lease ranks below that mortgage, a foreclosure on the land could threaten the lease unless the landowner's lender has agreed the lease survives.
- A lender may be unable to cure some ground-lease defaults, for example the borrower's insolvency.
- A ground lease may require notice to the landowner of a loan assignment, the landowner's consent, or that the holder meet a test such as being an institutional lender; otherwise leasehold-lender protections may not pass to a buyer of the loan.
- A buyer's lender will usually want the lease to run well past its loan, and an appraisal that values the hotel as if the owner held the land overstates the collateral.

### Liquor licenses and hotel transfers
`src/content/blog/liquor-licenses-and-hotel-transfers.md`
- Some states regulate who may hold a financial interest in a licensed business, so even a note sale could matter.
- Whether a license can be pledged or sold at all, or only surrendered and reissued, differs by state; the post says a lender's license may not be collateral it can enforce against.
- A buyer can sometimes apply only once it has a contract or control of the premises, so the license gap can fall just after closing.
- A receiver may have to stop beverage service while the rooms stay open if no interim arrangement exists.

### Reading a hotel's operating statement before you price its loan
`src/content/blog/reading-a-hotels-operating-statement.md`
- Dividing the hotel's RevPAR by the competitive set's RevPAR gives an "index".
- Deducting an unfunded replacement reserve before computing debt yield and debt service coverage. The post says readers differ on this, but its illustration takes one side.
- Related-party fees may be waived in a bad year or set above market.

### Occupancy and sales taxes: the liabilities that can follow a hotel
`src/content/blog/taxes-that-can-follow-a-hotel.md`
- Withheld payroll amounts are usually treated much like collected taxes.
- Property taxes are the kind most likely to follow the hotel, and often rank ahead of a mortgage (this wording was in the earlier version).
- Some jurisdictions pursue a buyer of the business, or the individuals who control it, and a note buyer that later takes and runs the hotel may end up in the same position.
- Vendor and prepaid-deposit balances are generally debts of the borrowing company, not of the building.
- Loan sales are often made as-is (from the glossary and the bank pages).
- A protective advance for property taxes is added to the loan balance (from the glossary).
- In a receivership, taxes are usually settled at closing under the sale order (from the earlier version and the receiver pages).

### What changes, and what does not, when your hotel loan is sold
`src/content/blog/when-your-hotel-loan-is-sold.md`
- A sale does not reset a default, void an agreement, or release a guarantor, and a buyer must follow the same enforcement process as the original lender.
- A forbearance or modification passes with the loan, but how far it binds a later holder depends on its wording ("successors and assigns").
- A promise made only in conversation or by email may not bind a new holder.
- Whether a lender must give notice of a sale depends on the loan documents and state law.
- "Do not keep paying the old lender, and do not stop paying" is carried over from the earlier version as a blanket instruction; counsel may want to qualify it.
- "A holder's room to negotiate depends on what it paid for the loan" is stated as logic, not fact.

### Why special servicers sell hotel notes, and what bidders are expected to bring
`src/content/blog/why-special-servicers-sell-hotel-notes.md`
- A servicer acts for the investors under the securitization documents and compares options on a present-value basis.
- The controlling class usually sits lowest in the structure, so a discounted price may fall on it first (this rests on the glossary's "usually the most junior" and on loss-allocation logic).
- The reasons sales fail (financing contingencies, price reopened after diligence, authority, consent) and the four ways bids are compared are general practice, not sourced from the site.
- When a trust forecloses, it carries an operating hotel, with receiver costs and advances.

## Drafts

The drafts are not published and each carries its own `VERIFY BEFORE PUBLISHING` note, which the build's publish gate enforces: a draft cannot go live until the note is removed. The items below are the statements the writers were least sure of. Items about figures and sources (rather than legal practice) are in the VERIFY note in the post itself.

### Non-recourse does not always mean non-recourse
`src/content/blog/non-recourse-does-not-always-mean-non-recourse.md`
- A full-debt guarantor is liable for the shortfall after hotel proceeds. The illustration assumes sale proceeds are credited.
- A release of a guarantor is usually sought in a discounted payoff or a deed in lieu, and may be partial or reserve claims.
- Admitting a new investor can count as a transfer of the borrower, and the usual route is the lender's written consent.
- Some guaranties make a voluntary bankruptcy filing a full-debt trigger.
- The loan documents draw the line between paying the hotel's own payroll and taxes and moving cash to an affiliate.

### Five things to confirm in writing when your hotel loan is sold
`src/content/blog/five-things-to-confirm-in-writing-when-your-hotel-loan-is-sold.md`
- Emailed changes to payment instructions are a known way funds get misdirected.
- Recording of an assignment can lag closing.
- The servicer usually collects payments, and the holder decides.
- How an owner should document payments while the payee is unconfirmed is left to counsel.

### What a buyer of a hotel loan does after closing
`src/content/blog/what-a-buyer-of-a-hotel-loan-does-after-closing.md`
- What each of the five endings needs and what breaks it: unpaid-tax liens complicating a deed in lieu, a brand refusing a new owner, a license transfer failing.
- A bankruptcy filing can pause enforcement (this repeats the published foreclosure-timelines post).
- Some holders ask for a prenegotiation letter first (from the glossary).

### What a loan sale does to the franchise
`src/content/blog/what-a-loan-sale-does-to-the-franchise.md`
- A brand's reasons for caring about who controls a hotel are stated by logic, not sourced.
- The comfort letter's notice and cure mechanics, that consent is usually needed to pass a franchise to a new owner, and that a receiver needs consent to operate under the flag, rest on the site's library page, not on any brand's document.
- "Many require the brand's consent" for assignment of the comfort letter is from the library page.
- Liquidated damages for early termination were already in the draft.
- The "What we don't know" section says "We found no published source…". That claim about the firm's own research should be confirmed before publishing.

### Why hotel loan delinquency numbers disagree
`src/content/blog/why-hotel-loan-delinquency-numbers-disagree.md`
- The three definitions (late on payments, nonperforming, special-serviced) are the writer's general descriptions, not any publisher's. "A special servicer takes over loans at default or imminent risk of default, so some are still current." "Whether it counts a loan past maturity depends on the publisher."
- "A rate weighted by balance can let one large loan dominate" sits beside Trepp's June example and implies Trepp's rate is balance-weighted. That is unverified.
- The unsourced CRED iQ sentence, including "so it runs higher than a pure delinquency rate", is kept as it was. The VERIFY note says to link it or remove it.
- The post says it does not know why the two Hilton figures differ (KBRA 15.7%, Trepp 11.73%).

### How a hotel loan is priced
`src/content/blog/how-a-hotel-loan-is-priced.md`
- Nothing new is factual. The mechanics (expected recovery less costs, time and risk, with the gap as the discount) are logic, not sourced.

### Hotel loan watch, November 2026
`src/content/blog/hotel-loan-watch-november-2026.md`
- General statements that are the writer's own, not from the publishers' notes: delinquency counts missed payments by days; special servicing counts loans a servicer has taken over, some still current, so it can rise before delinquency does; a single loan can move a rate weighted by balance; a loan is repaid from the income left after costs.
- "KBRA's reading uses 30 or more days" is inferred from the existing "30-plus-day" label. "The figures are national" is inferred from the CoStar and HVS titles.
- "No stated reason for October's lodging decline" and "no July reading" describe what the search summaries showed, not what the pages say.
- The "What this means for a lender" section is judgment, not sourced: comparing the share of a lender's own hotel loans 30 or more days past due against a publisher's figure, and the two developments said to "change the picture".
- The "What we don't know" sections use "we" for the limits of the research only. No post claims what the firm does, and none uses an "Our view" sentence.
