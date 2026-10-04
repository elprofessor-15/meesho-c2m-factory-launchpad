# Factory Mode and staged commitments

The manufacturer owns commercial decisions. Software reduces repeated digital work; it does not physically fulfil an order or guarantee demand.

## Daily preparation

Turn on Factory Mode in the sidebar for Today, Orders, Stock, Payments and Help. The full workspace remains available by turning it off. Orders defaults to batches in Factory Mode, and both views are always selectable.

Batches group pending orders by exact SKU, variant and dispatch date. Each order retains its identity, label and detail page. Download a CSV picking list and individual DEMO labels. Marking a batch packed creates a five-minute confirmation bound to the user and exact order versions. All versions are checked before any member changes. Replaying a successful confirmation returns the original result. Packed never means a pickup happened.

The voice assistant uses `get_packing_batches` and `prepare_batch_packed` through the same services. It must clarify ambiguous batches and cannot execute a spoken generic yes. Confirm the visible action. Callbacks inherit the recent saved conversation context and the named activation contact.

## Conditional commitment

Open `/commitment` from Today or the sidebar. The page separates:

1. Observed sample demand and modelled demand range.
2. Operating readiness, including a real person responsible for packing.
3. A bounded Test, Replenish, Hold or Pause recommendation.

Missing packing ownership blocks activation, even after onboarding is complete. Insufficient exposure is not described as no demand. Missing costs, weak conversion, below-floor contribution, insufficient worthwhile volume, seasonal restrictions or excessive packing workload stop expansion. Manufacturer-specific thresholds are used, never interviewee thresholds generalized to all factories.

The evidence gate of 1,000 detail visits and 7 eligible days is a configurable-in-code pilot assumption, not a validated statistical threshold. Replenishment respects minimum batches, weekly availability and cash exposure. A confirmation records the decision and its inputs; it does not book production or reserve inventory. Repeated commitments remain planning history, so reviewers must reconcile them before treating them as simultaneous production orders.

The next review asks for retained orders, economics, exposure quality and workload. Promotional traffic and geography are not separately identified in the synthetic dataset. There are no minimum-order guarantees.

## Named contact and workload

The operating setup records the activation contact, physical packing owner, parcel capacity, seasonal constraints and first-cycle checklist. First order, first payout and independent operation are explicit attestations, not verified logistics events. Support requests record owner, outcome and minutes spent. Daily workload observations capture owner minutes, worker minutes and task errors. These are self-reported totals, not measured time savings. Support cost requires a real cost rate and is not fabricated.

## SMS boundary

The SMS simulator sends no messages. It accepts `READY <exact batch ID>` for a current-day pending batch in the signed-in demo workspace and prepares a confirmation. Unknown, completed and out-of-date batches are rejected. This demonstrates validation logic, not a working telecom channel.

Real deployment requires a reply-capable sender, verified sender-to-workspace mapping, signed webhook validation, provider message IDs, expiry, delivery receipts, regulatory setup and a funded messaging account. SMS needs cellular coverage even without mobile data. Telephone calls need separate telephony infrastructure. Neither is integrated or represented as working here.

## Validation still needed

Test with consenting manufacturers whether the remaining workload is acceptable and whether bounded exposure is sufficient without assured orders. Measure task time and errors against a baseline, support cost, stock exposure, repeat commitments and mature retained activity. No positive research outcome is assumed.
